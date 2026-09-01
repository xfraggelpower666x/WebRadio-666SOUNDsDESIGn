import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recovery = fs.readFileSync('js/all-player-audio-recovery.js', 'utf8');
const recoveryPublic = fs.readFileSync('public/js/all-player-audio-recovery.js', 'utf8');
const mute = fs.readFileSync('js/all-player-mute.js', 'utf8');
const mutePublic = fs.readFileSync('public/js/all-player-mute.js', 'utf8');

test('backup stream recovery mirrors remain byte-identical', () => {
  assert.equal(recoveryPublic, recovery);
  assert.equal(mutePublic, mute);
});

test('backup stream failover is explicitly scoped to the stable primary route', () => {
  assert.match(recovery, /const PRIMARY_ROUTE='\/stream';/);
  assert.match(recovery, /const BACKUP_ROUTE='\/fallback-stream';/);
  assert.match(recovery, /function isBackupSource\(src\)/);
  assert.match(recovery, /value\.includes\('\/fallback-stream'\)/);
  assert.match(recovery, /value\.includes\(':8686\/stream'\)/);
  assert.match(recovery, /const targetSrc=isBackupSource\(src\)\?PRIMARY_ROUTE:src;/);
});

test('healthy primary keeps same-source recovery while sustained backup stalls escalate', () => {
  assert.match(recovery, /if\(isBackupSource\(src\)&&candidateFor>=p\.stallConfirmMs&&stalledFor>=p\.hardReloadMs\)/);
  assert.match(recovery, /hardRecover\(audio,s,'backup-stall-primary-failover'\)/);
  assert.match(recovery, /'backup-to-primary':'same-source'/);
  assert.doesNotMatch(recovery, /const targetSrc=PRIMARY_ROUTE;/);
});

test('soft buffering events stay sensor-only and hard reload remains confirmation-gated', () => {
  assert.match(recovery, /for\(const ev of \['waiting','stalled','suspend'\]\) audio\.addEventListener\(ev,\(\)=>noteCandidate\(audio,ev\)/);
  assert.match(recovery, /if\(stalledFor>=p\.hardReloadMs\) void hardRecover/);
  assert.match(recovery, /if\(!audio\.paused&&ready>=2&&network===2&&stalledFor<p\.pollSeedMs\)\{clearCandidate\(audio\);return;\}/);
});

test('recovery loader cache identity is refreshed in both mirrors', () => {
  assert.match(mute, /\?v=20260901-interruption-owner-collision-v3/);
});

test('repair does not add a parallel audio graph or protected DSP ownership', () => {
  assert.doesNotMatch(recovery, /createMediaElementSource\s*\(/);
  assert.doesNotMatch(recovery, /createGain\s*\(/);
  assert.doesNotMatch(recovery, /BiquadFilter/);
  assert.doesNotMatch(recovery, /MeterBus\s*=/);
});
