import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('radio-codeforge/radio-codeforge.config.json', 'utf8'));
const learning = JSON.parse(readFileSync('radio-codeforge/learning-profile.json', 'utf8'));
const daemon = readFileSync('radio-codeforge/force-daemon.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/radio-codeforge-force.yml', 'utf8');
const readme = readFileSync('radio-codeforge/README.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

test('Radio-CodeForge remains a non-runtime development assistant', () => {
  assert.equal(config.systemId, '666-RADIO-CODEFORGE-001');
  assert.equal(config.runtimeIntegration, false);
  assert.equal(config.sourceMutationAuthority, false);
  assert.equal(config.deploymentMutationAuthority, false);
  assert.equal(config.pfsMutationAuthority, false);
});

test('Radio-CodeForge learns capabilities from live 666CODEFORGE without identity takeover', () => {
  assert.equal(config.learningSource.system, '666CODEFORGE');
  assert.equal(config.learningSource.mode, 'learn-and-adapt-only');
  assert.equal(config.learningSource.identityImport, false);
  assert.equal(config.learningSource.triggerImport, false);
  assert.equal(config.learningSource.authorityImport, false);
  assert.equal(config.learningSource.namespaceImport, false);
  assert.equal(learning.learningMode, 'capability-adaptation-only');
  assert.ok(learning.adaptedCapabilities.includes('force-rehydration-principle'));
  assert.ok(learning.adaptedCapabilities.includes('repository-topology-analysis'));
  assert.ok(learning.adaptedCapabilities.includes('research-before-repair'));
  assert.ok(learning.adaptedCapabilities.includes('deployment-relationship-analysis'));
});

test('Radio-CodeForge has active development, audit and evolution capabilities', () => {
  for (const capability of [
    'develop-assist', 'audit', 'verify', 'improve', 'evolve', 'continuity',
    'root-cause-analysis', 'owner-layer-conflict-analysis', 'mirror-consistency-analysis',
    'regression-planning', 'repository-topology-analysis', 'deployment-relationship-analysis',
    'research-before-repair', 'repair-revalidation', 'current-before-history', 'evidence-before-pass'
  ]) {
    assert.ok(config.activeCapabilities.includes(capability), `missing ${capability}`);
  }
});

test('Radio-CodeForge chat-host integration is automatic for radio development and independent from GitHub daemon', () => {
  const chat = config.chatHostIntegration;
  assert.equal(chat.enabled, true);
  assert.equal(chat.automaticForRadioDevelopment, true);
  assert.equal(chat.mode, 'host-applied-development-contract');
  assert.equal(chat.separateAutonomousProcessRequired, false);
  assert.equal(chat.githubForceDaemonIndependent, true);
  assert.equal(chat.githubForceDaemonReplacesChatLayer, false);
  assert.equal(chat.mustRehydrateCurrentStateBeforeChange, true);
  assert.equal(chat.mustRunRootCauseAnalysisBeforeRepair, true);
  assert.equal(chat.mustAuditOwnerAndLayerConflicts, true);
  assert.equal(chat.mustAuditMirrorConsistency, true);
  assert.equal(chat.mustPlanRegressionCoverage, true);
  assert.equal(chat.mustReauditAfterChange, true);
  assert.equal(chat.mustVerifyBeforePromotion, true);
  assert.equal(chat.mustPreserveNativeRadioAuthority, true);
  assert.equal(chat.mustNotEnterRuntime, true);
  assert.deepEqual(chat.developmentSequence, [
    'rehydrate-current-state',
    'inspect-current-delta',
    'root-cause-analysis',
    'owner-layer-conflict-audit',
    'minimal-repair-plan',
    'regression-test-plan',
    'controlled-repo-write',
    'post-change-re-audit',
    'github-force-daemon',
    'release-integrity',
    'promotion'
  ]);
  assert.equal(config.automatic.chatRadioDevelopment, true);
  assert.match(readme, /Chat \/ host development layer/);
  assert.match(readme, /GitHub Force Daemon/);
  assert.match(readme, /GitHub RADIO-CODEFORGE Force Daemon -> Release Integrity -> promotion/);
});

test('Radio-CodeForge force daemon enforces isolation instead of mutating radio code', () => {
  assert.match(daemon, /RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN/);
  assert.match(daemon, /RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE/);
  assert.match(daemon, /RADIO_CODEFORGE_ISOLATION=PASS/);
  assert.doesNotMatch(daemon, /writeFileSync|rmSync|unlinkSync|renameSync/);
});

test('Codex is emergency help only and never gains radio authority', () => {
  assert.equal(config.codexEscalation.enabled, true);
  assert.equal(config.codexEscalation.automaticProductionAuthority, false);
  assert.equal(config.codexEscalation.automaticSourceMutationAuthority, false);
  assert.equal(config.codexEscalation.hostOrChatRoutingRequired, true);
  assert.equal(config.codexEscalation.resultMustBeReviewedByRadioCodeForge, true);
  assert.equal(config.codexEscalation.resultMustPassRadioAuditBeforePromotion, true);
  assert.match(daemon, /RADIO_CODEFORGE_CODEX_ESCALATION=/);
  assert.match(daemon, /RADIO_CODEFORGE_CODEX_AUTHORITY=NONE/);
  assert.doesNotMatch(daemon, /codex\s+exec|spawn.*codex|execFileSync\(['\"]codex/);
});

test('Radio-CodeForge runs automatically with verification and GitHub development', () => {
  assert.equal(pkg.scripts['radio:codeforge'], 'node radio-codeforge/force-daemon.mjs');
  assert.match(pkg.scripts.verify, /radio:codeforge/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run radio:codeforge/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
});
