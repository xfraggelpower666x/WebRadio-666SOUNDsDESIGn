import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recovery = fs.readFileSync('js/all-player-audio-recovery.js', 'utf8');
const recoveryPublic = fs.readFileSync('public/js/all-player-audio-recovery.js', 'utf8');
const mute = fs.readFileSync('js/all-player-mute.js', 'utf8');
const mutePublic = fs.readFileSync('public/js/all-player-mute.js', 'utf8');
const audioStart = fs.readFileSync('js/audio-start-core.js', 'utf8');
const audioStartPublic = fs.readFileSync('public/js/audio-start-core.js', 'utf8');
const phase10 = fs.readFileSync('js/phase10-stability-iphone-panel-hud.js', 'utf8');

test('interruption repair keeps root/public recovery, loader and early authority mirrors byte-identical', () => {
  assert.equal(recoveryPublic, recovery);
  assert.equal(mutePublic, mute);
  assert.equal(audioStartPublic, audioStart);
});

test('canonical recovery exposes the legacy phase10 compatibility owner without creating a second recovery engine', () => {
  assert.match(recovery, /const OWNER='all-player-audio-recovery-v1';/);
  assert.match(recovery, /const LEGACY_COMPAT_OWNER='central-audio-guard-v2';/);
  assert.match(recovery, /canonicalRecovery:OWNER/);
  assert.match(recovery, /global\.centralAudioGuardV2Recover=legacyHandoff/);
  assert.match(recovery, /recovery:LEGACY_COMPAT_OWNER/);
});

test('early audio core demotes only the obsolete Phase10 automatic PC backup loader while preserving manual bindings', () => {
  assert.match(audioStart, /canonicalRecovery: CANONICAL_OWNER/);
  assert.match(audioStart, /recovery: LEGACY_COMPAT_OWNER/);
  assert.match(audioStart, /global\.__phase10PcMainBackupGuardInstalled = true/);
  assert.match(audioStart, /data-phase10-pc-backup-auto-guard', 'demoted'/);
  assert.match(phase10, /var wasMarkedInstalled = !!window\.__phase10PcMainBackupGuardInstalled;/);
  assert.match(phase10, /if\(s666CanonicalRecoveryOwner\(\)\)\{[\s\S]*?data-phase10-stream-guard","canonical-owner-sensor-only"[\s\S]*?return;[\s\S]*?\}/);
  assert.match(phase10, /if\(wasMarkedInstalled\) return;/);
});

test('phase10 focus guard sees the compatibility authority instead of falling into recoverAudio hard reload', () => {
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

test('automatic browser interruption reasons never enter the audio-start hard reset path', () => {
  assert.match(audioStart, /const softResumeReasons = new Set\(\['focus','pageshow','visibility','visible','suspend','stalled','interrupted','system-interruption'\]\)/);
  assert.match(audioStart, /if \(softResumeReasons\.has\(why\)\) \{[\s\S]*?handoffAutomaticRecovery\(why\);[\s\S]*?return;[\s\S]*?\}/);
  assert.match(audioStart, /owner\.owner === 'all-player-audio-recovery-v1'/);
  assert.match(audioStart, /owner\.legacyHandoff\(why \|\| 'audio-start-core-sensor'\)/);
});

test('a superseded start request cannot pause the newer shared audio playback', () => {
  const superseded = audioStart.match(/if \(!isCurrent\(token\)\) \{([\s\S]*?)\n      \}/)?.[1] || '';
  assert.match(superseded, /stale-superseded/);
  assert.doesNotMatch(superseded, /audio\.pause\(/);
  assert.match(audioStart, /if \(config && typeof config\.isStopped === 'function' && config\.isStopped\(\)\) \{[\s\S]*?audio\.pause\(\)/);
});

test('manual H/B ownership is preserved while only the legacy automatic backup guard is demoted', () => {
  assert.match(phase10, /\{led:"main",target:"main",canonical:"mainBtn"\}/);
  assert.match(phase10, /\{led:"backup",target:"backup",canonical:"fallbackBtn"\}/);
  assert.match(phase10, /tap\(canonical,"mobile-"\+entry\.target\+"-stream"\)/);
  assert.doesNotMatch(audioStart, /mainBtn.*click/);
  assert.doesNotMatch(audioStart, /fallbackBtn.*click/);
});

test('cache identity forces browsers onto the repaired recovery owner bridge', () => {
  assert.match(mute, /20260901-interruption-owner-collision-v3/);
});

test('protected DSP graph ownership remains untouched by interruption repair', () => {
  assert.doesNotMatch(recovery, /createMediaElementSource\s*\(/);
  assert.doesNotMatch(recovery, /createGain\s*\(/);
  assert.doesNotMatch(recovery, /createBiquadFilter\s*\(/);
  assert.doesNotMatch(recovery, /MeterBus\s*=/);
  assert.doesNotMatch(audioStart, /createMediaElementSource\s*\(/);
});
