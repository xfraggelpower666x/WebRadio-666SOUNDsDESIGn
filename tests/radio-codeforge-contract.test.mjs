import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('radio-codeforge/radio-codeforge.config.json', 'utf8'));
const daemon = readFileSync('radio-codeforge/force-daemon.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/radio-codeforge-force.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

test('Radio-CodeForge remains a non-runtime development assistant', () => {
  assert.equal(config.systemId, '666-RADIO-CODEFORGE-001');
  assert.equal(config.runtimeIntegration, false);
  assert.equal(config.sourceMutationAuthority, false);
  assert.equal(config.deploymentMutationAuthority, false);
  assert.equal(config.pfsMutationAuthority, false);
});

test('Radio-CodeForge force daemon enforces isolation instead of mutating radio code', () => {
  assert.match(daemon, /RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN/);
  assert.match(daemon, /RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE/);
  assert.match(daemon, /RADIO_CODEFORGE_ISOLATION=PASS/);
  assert.doesNotMatch(daemon, /writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync/);
});

test('Radio-CodeForge runs automatically with verification and GitHub development', () => {
  assert.equal(pkg.scripts['radio:codeforge'], 'node radio-codeforge/force-daemon.mjs');
  assert.match(pkg.scripts.verify, /radio:codeforge/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run radio:codeforge/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
});
