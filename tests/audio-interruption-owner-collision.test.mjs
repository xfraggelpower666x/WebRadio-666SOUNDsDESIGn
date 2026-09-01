import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recovery = fs.readFileSync('js/all-player-audio-recovery.js', 'utf8');
const recoveryPublic = fs.readFileSync('public/js/all-player-audio-recovery.js', 'utf8');
const mute = fs.readFileSync('js/all-player-mute.js', 'utf8');
const mutePublic = fs.readFileSync('public/js/all-player-mute.js', 'utf8');
const phase10 = fs.readFileSync('js/phase10-stability-iphone-panel-hud.js', 'utf8');

test('interruption repair keeps root/public recovery and loader mirrors byte-identical', () => {
  assert.equal(recoveryPublic, recovery);
  assert.equal(mutePublic, mute);
});

test('canonical recovery exposes the legacy phase10 compatibility owner without creating a second recovery engine', () => {
  assert.match(recovery, /const OWNER='all-player-audio-recovery-v1';/);
  assert.match(recovery, /const LEGACY_COMPAT_OWNER='central-audio-guard-v2';/);
  assert.match(recovery, /canonicalRecovery:OWNER/);
  assert.match(recovery, /global\.centralAudioGuardV2Recover=legacyHandoff/);
  assert.match(recovery, /recovery:LEGACY_COMPAT_OWNER/);
});

test('phase10 handoff can now resolve before its legacy hard pause-src-load fallback', () => {
  assert.match(phase10, /window\.S666_AUDIO_AUTHORITY\.recovery === "central-audio-guard-v2"/);
  assert.match(phase10, /typeof centralAudioGuardV2Recover === "function"/);
  assert.match(recovery, /function legacyHandoff\(reason\)/);
});

test('soft interruption handoff remains candidate/evaluate only and does not hard reload immediately', () => {
  const handoff = recovery.match(/function legacyHandoff\(reason\)\{([\s\S]*?)\n  \}/)?.[1] || '';
  assert.match(handoff, /noteCandidate\(audio/);
  assert.match(handoff, /evaluate\(audio/);
  assert.doesNotMatch(handoff, /audio\.pause\(/);
  assert.doesNotMatch(handoff, /audio\.load\(/);
  assert.doesNotMatch(handoff, /removeAttribute\(['"]src['"]\)/);
});

test('cache identity forces browsers onto the repaired recovery owner bridge', () => {
  assert.match(mute, /20260901-interruption-owner-collision-v3/);
});

test('protected DSP graph ownership remains untouched by interruption repair', () => {
  assert.doesNotMatch(recovery, /createMediaElementSource\s*\(/);
  assert.doesNotMatch(recovery, /createGain\s*\(/);
  assert.doesNotMatch(recovery, /createBiquadFilter\s*\(/);
  assert.doesNotMatch(recovery, /MeterBus\s*=/);
});
