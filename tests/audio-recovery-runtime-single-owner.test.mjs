import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('player-core legacy mobile recovery is sensor-only when canonical owner exists', async () => {
  const core = await read('js/player-core.js');
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(core, /function canonicalRecoveryHandoff\(reason = 'interrupted'\)/);
  assert.match(core, /owner\.owner === 'all-player-audio-recovery-v1'/);
  assert.match(core, /owner\.legacyHandoff\(handoffReason\)/);
  assert.match(core, /function recoverInterruptedAudio\(reason = 'interrupted'\) \{\n  if \(canonicalRecoveryHandoff\(reason\)\) return;/);
  assert.doesNotMatch(core, /stalled'\); markAudioSelfHealDirty\('stalled'/);
  assert.doesNotMatch(core, /suspend'\); markAudioSelfHealDirty\('suspend'/);
});

test('MFF legacy self-heal hands off without leaving a dirty hard-reset trigger', async () => {
  const html = await read('index.html');
  assert.equal(await read('public/index.html'), html);
  assert.match(html, /data-mff-audio-selfheal-handoff', 'all-player-audio-recovery-v1'/);
  assert.match(html, /owner\.legacyHandoff\(handoffReason\)/);
  assert.match(html, /mffAudioDirtyReason='';/);
  assert.doesNotMatch(html, /markMffAudioDirty\('stalled'\);setTimeout\(function\(\)\{recoverMffInterruptedAudio\('stalled'\)/);
  assert.doesNotMatch(html, /markMffAudioDirty\('suspend'\);setTimeout\(function\(\)\{recoverMffInterruptedAudio\('suspend'\)/);
});

test('mobile main source LED uses the single English Main Stream identity', async () => {
  const html = await read('index.html');
  assert.match(html, /data-led="main" data-state="off" data-label="Main Stream" data-info="Main Stream active"><i><\/i><b>M<\/b>/);
  assert.doesNotMatch(html, /data-label="Hauptstream"/);
  assert.doesNotMatch(html, /<b>H<\/b>/);
});

test('repaired runtime uses fresh recovery-single-owner cache identity', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.match(html, /2026-09-04-recovery-single-owner-v3/);
  assert.match(core, /2026-09-04-recovery-single-owner-v3/);
  assert.doesNotMatch(html, /2026-09-04-panel-led-owner-v2/);
  assert.doesNotMatch(core, /2026-09-04-panel-led-owner-v2/);
});
