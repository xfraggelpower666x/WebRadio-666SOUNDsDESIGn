import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const link = JSON.parse(fs.readFileSync('public/666pfs-child-link.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('public/666pfs-child-release.json', 'utf8'));
const contract = fs.readFileSync('docs/666PFS_CHILD_666STREAM_EXTERNAL_LINK_CONTRACT_v1.0.0.md', 'utf8');

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
  assert.equal(link.restoreMode, 'RESTORE_BRANCH_PR_GATED');
});

test('restore remains branch PR gate deploy readback controlled', () => {
  assert.deepEqual(link.restoreTransaction, [
    'resolve-selector-in-external-pfs',
    'verify-release-class-and-sha256',
    'resolve-source-commit',
    'create-recovery-branch-from-source-commit',
    'compare-against-current-production',
    'run-repository-verification',
    'open-reviewed-pull-request',
    'require-release-integrity-and-child-freeze',
    'merge-after-green-gates',
    'deploy-production',
    'require-commit-bound-live-readback',
    'register-new-verified-child-release'
  ]);
  assert.equal(link.safety.failClosed, true);
  assert.equal(link.safety.requireHashVerification, true);
  assert.equal(link.safety.requireDiffBeforeRestore, true);
  assert.equal(link.safety.requirePrBeforeProduction, true);
  assert.equal(link.safety.requireGreenGates, true);
});

test('existing child release marker links to the new manifest without changing activation semantics', () => {
  assert.equal(release.childLinkPath, '/666pfs-child-link.json');
  assert.equal(release.childLinkSchema, '666pfs-child-external-link-v1');
  assert.equal(release.childAutoload, false);
  assert.equal(release.secondBootstrap, false);
  assert.equal(release.secondUpdateRoute, false);
});

test('contract explicitly forbids moving parent cores into the radio repo', () => {
  assert.match(contract, /PFS_CORE_IN_REPOSITORY=FORBIDDEN/);
  assert.match(contract, /666CSM_CORE_IN_REPOSITORY=FORBIDDEN/);
  assert.match(contract, /DIRECT_PRODUCTION_RESTORE=FORBIDDEN/);
  assert.match(contract, /selectorResolution=PFS_EXTERNAL_REGISTRY/);
});
