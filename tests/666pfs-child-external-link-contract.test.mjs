import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const link = JSON.parse(fs.readFileSync('public/666pfs-child-link.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('public/666pfs-child-release.json', 'utf8'));
const contract = fs.readFileSync('docs/666PFS_CHILD_666STREAM_EXTERNAL_LINK_CONTRACT_v1.0.0.md', 'utf8');

const controlPaths = [
  'public/666pfs-child-link.json',
  'public/666pfs-child-release.json',
  'docs/666PFS_CHILD_666STREAM_EXTERNAL_LINK_CONTRACT_v1.0.0.md',
  'tests/666pfs-child-external-link-contract.test.mjs'
];

test('666STREAM exposes a stable external-only PFS child link', () => {
  assert.equal(link.schema, '666pfs-child-external-link-v1');
  assert.equal(link.systemId, '666PFS-666STREAM-DEPLOYMENT-001');
  assert.equal(link.childNamespace, '666PFS/Child_Systems/666STREAM_DEPLOYMENT');
  assert.equal(link.parentSystem, '666PFS');
  assert.equal(link.linkMode, 'EXTERNAL_PARENT_LINK_ONLY');
  assert.equal(link.repoRole, 'CHILD_SOURCE_AND_RELEASE_IDENTITY_ONLY');
});

test('parent PFS and 666CSM cores remain external to the radio repository', () => {
  assert.equal(link.parentCoreStoredInRepository, false);
  assert.equal(link.csmCoreStoredInRepository, false);
  assert.equal(link.pointerOwnership, 'PFS_EXTERNAL');
  assert.equal(link.menuOwnership, 'PFS_EXTERNAL');
  assert.equal(link.csmSelectionOwnership, '666CSM_EXTERNAL');
  assert.equal(link.childAutoload, false);
  assert.equal(link.secondBootstrap, false);
  assert.equal(link.secondUpdateRoute, false);
  assert.equal(link.directProductionRestore, false);
});

test('PFS selectors are advertised but resolved only by the external PFS registry', () => {
  assert.deepEqual(link.selectors, ['CURRENT', 'PREVIOUS', 'PINNED', 'NAMED_RELEASE']);
  assert.equal(link.selectorResolution, 'PFS_EXTERNAL_REGISTRY');
  assert.equal(link.releaseQualification, 'POST_DEPLOY_VERIFIED_TREE');
  assert.equal(link.restoreSourceKey, 'sourceCommit');
  assert.equal(link.restoreMode, 'RESTORE_COMMIT_ON_CURRENT_PRODUCTION_PR_GATED');
  assert.equal(link.restoreBranchBase, 'CURRENT_PRODUCTION');
  assert.equal(link.restoreTreeSource, 'VERIFIED_RELEASE_SOURCE_COMMIT');
  assert.equal(link.restoreCommitRequired, true);
});

test('historical restore preserves current restore-control files', () => {
  assert.equal(
    link.restoreControlPreservation,
    'CURRENT_PRODUCTION_CONTROL_FILES_REAPPLIED_AFTER_TREE_MATERIALIZATION'
  );
  assert.deepEqual(link.restoreControlPaths, controlPaths);
  assert.equal(link.safety.requireRestoreControlPreservation, true);
  assert.equal(link.safety.requireRestoreControlReadback, true);

  const materializeIndex = link.restoreTransaction.indexOf('materialize-verified-release-tree-on-recovery-branch');
  const reapplyIndex = link.restoreTransaction.indexOf('reapply-current-restore-control-files');
  const verifyIndex = link.restoreTransaction.indexOf('verify-restore-control-files-match-recorded-production');
  const commitIndex = link.restoreTransaction.indexOf('create-explicit-restore-commit');

  assert.ok(materializeIndex >= 0);
  assert.ok(reapplyIndex > materializeIndex);
  assert.ok(verifyIndex > reapplyIndex);
  assert.ok(commitIndex > verifyIndex);
});

test('historical restore is based on recorded current production and creates an explicit commit', () => {
  assert.equal(link.restoreTransaction.includes('create-recovery-branch-from-source-commit'), false);
  assert.ok(link.restoreTransaction.includes('read-and-record-current-production-head'));
  assert.ok(link.restoreTransaction.includes('create-recovery-branch-from-recorded-current-production'));
  assert.ok(link.restoreTransaction.includes('create-explicit-restore-commit'));
  assert.ok(link.restoreTransaction.includes('reject-empty-restore-pr-unless-selected-tree-already-current'));
  assert.equal(link.safety.requireCurrentProductionBase, true);
  assert.equal(link.safety.requireExplicitRestoreCommit, true);
  assert.equal(link.safety.requireDiffBeforeRestore, true);
  assert.equal(link.safety.rejectEmptyRestorePr, true);
});

test('production base is revalidated immediately before merge and stale restore fails closed', () => {
  assert.equal(link.productionBaseCapture, 'REQUIRED_AT_RESTORE_START');
  assert.equal(link.productionBaseRevalidation, 'REQUIRED_IMMEDIATELY_BEFORE_MERGE');
  assert.equal(link.productionBaseMismatchAction, 'FAIL_CLOSED_REMATERIALIZE_FROM_NEW_PRODUCTION_HEAD');
  assert.equal(link.safety.requireProductionBaseMatchBeforeMerge, true);
  assert.equal(link.safety.rematerializeOnProductionBaseMismatch, true);

  const gatesIndex = link.restoreTransaction.indexOf('require-release-integrity-and-child-freeze');
  const revalidateIndex = link.restoreTransaction.indexOf('revalidate-production-head-immediately-before-merge');
  const mismatchIndex = link.restoreTransaction.indexOf('fail-closed-and-rematerialize-if-production-head-changed');
  const mergeIndex = link.restoreTransaction.indexOf('merge-after-green-gates-and-base-match');

  assert.ok(gatesIndex >= 0);
  assert.ok(revalidateIndex > gatesIndex);
  assert.ok(mismatchIndex > revalidateIndex);
  assert.ok(mergeIndex > mismatchIndex);
});

test('restore safety remains fail-closed and PR-gated', () => {
  assert.equal(link.safety.failClosed, true);
  assert.equal(link.safety.requireHashVerification, true);
  assert.equal(link.safety.requirePrBeforeProduction, true);
  assert.equal(link.safety.requireGreenGates, true);
});

test('existing child release marker links to the repaired manifest without changing activation semantics', () => {
  assert.equal(release.childLinkPath, '/666pfs-child-link.json');
  assert.equal(release.childLinkSchema, '666pfs-child-external-link-v1');
  assert.equal(release.childAutoload, false);
  assert.equal(release.secondBootstrap, false);
  assert.equal(release.secondUpdateRoute, false);
});

test('contract explicitly hardlocks P1 and P2 restore repairs', () => {
  assert.match(contract, /PFS_CORE_IN_REPOSITORY=FORBIDDEN/);
  assert.match(contract, /666CSM_CORE_IN_REPOSITORY=FORBIDDEN/);
  assert.match(contract, /DIRECT_PRODUCTION_RESTORE=FORBIDDEN/);
  assert.match(contract, /Historical payloads are allowed to restore historical radio source files, but they are not allowed to downgrade or remove the current restore-control contract itself\./);
  assert.match(contract, /Immediately before merge, after all required gates are green, the host must read Production HEAD again and require exact equality with the recorded base SHA\./);
  assert.match(contract, /fail closed and rematerialize the restore from the new Production HEAD before any merge/);
});
