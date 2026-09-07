import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('radio-codeforge/radio-codeforge.config.json', 'utf8'));
const daemon = readFileSync('radio-codeforge/force-daemon.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/radio-codeforge-force.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

test('Radio-CodeForge remains a non-runtime development assistant', () => {
  assert.equal(config.systemId, '666-RADIO-CODEFORGE-001');
  assert.equal(config.activeDevelopmentAssistance, true);
  assert.equal(config.runtimeIntegration, false);
  assert.equal(config.sourceMutationAuthority, false);
  assert.equal(config.deploymentMutationAuthority, false);
  assert.equal(config.pfsMutationAuthority, false);
});

test('Radio-CodeForge actively audits development while enforcing isolation', () => {
  for (const capability of ['develop-assist', 'audit', 'verify', 'improve', 'evolve', 'continuity']) {
    assert.ok(config.activeCapabilities.includes(capability));
  }
  assert.match(daemon, /ACTIVE_PARALLEL_DEVELOPMENT_ASSISTANT/);
  assert.match(daemon, /RADIO_CODEFORGE_RECOMMENDATION=/);
  assert.match(daemon, /GITHUB_STEP_SUMMARY/);
  assert.match(daemon, /RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN/);
  assert.match(daemon, /RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE/);
  assert.match(daemon, /RADIO_CODEFORGE_ISOLATION=PASS/);
  assert.doesNotMatch(daemon, /writeFileSync|rmSync|unlinkSync|renameSync|copyFileSync/);
});

test('Radio-CodeForge inspects radio-specific development risk areas', () => {
  assert.match(daemon, /audio state continuity/);
  assert.match(daemon, /metadata/);
  assert.match(daemon, /reconnect behavior/);
  assert.match(daemon, /CORS/);
  assert.match(daemon, /bindings/);
  assert.match(daemon, /cache behavior/);
  assert.match(daemon, /post-deploy readback/);
});

test('Radio-CodeForge runs automatically with verification and GitHub development', () => {
  assert.equal(pkg.scripts['radio:codeforge'], 'node radio-codeforge/force-daemon.mjs');
  assert.match(pkg.scripts.verify, /radio:codeforge/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run radio:codeforge/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
});
