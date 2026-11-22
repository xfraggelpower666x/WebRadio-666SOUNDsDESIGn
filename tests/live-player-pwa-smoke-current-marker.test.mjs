import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/live-player-pwa-smoke.yml', 'utf8');
const boot = fs.readFileSync('public/js/central-boot-screen.js', 'utf8');

test('live PWA smoke resolves the current boot marker from repository source', () => {
  const marker = boot.match(/const BOOT_MARKER='([^']+)'/)?.[1];
  assert.ok(marker, 'current BOOT_MARKER must exist in repository boot source');
  assert.match(workflow, /expected_boot_marker=.*BOOT_MARKER/);
  assert.match(workflow, /grep -Fq "const BOOT_MARKER='\\$expected_boot_marker'" "\\$workdir\/central-boot-screen\.js"/);
});

test('live PWA smoke does not pin the superseded 20261016 boot marker', () => {
  assert.doesNotMatch(workflow, /20261016-main-iphone-two-phase-cyberintro-r01/);
});

test('two-phase behavioral assertions remain enforced', () => {
  for (const token of [
    'MAIN_ANIMATION_CYCLE=10000',
    'MAIN_START_PROGRESS=1',
    'MAIN_COMPLETE_HOLD=0',
    'MAIN_PHASE2_FADE_MS=5400',
    'MAIN_PHASE2_HOLD_MS=2000',
    'usesOriginalTwoPhase()',
    "root.dataset.cyberStage='online'",
    'fullCycleComplete',
    'earlyCompleteBlocked'
  ]) {
    assert.ok(workflow.includes(token), `missing behavioral assertion: ${token}`);
  }
});
