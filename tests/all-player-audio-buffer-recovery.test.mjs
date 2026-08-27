import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const recovery=read('js/all-player-audio-recovery.js');
const recoveryPublic=read('public/js/all-player-audio-recovery.js');
const mute=read('js/all-player-mute.js');
const mutePublic=read('public/js/all-player-mute.js');
const config=read('config/veluna-assets.js');
const worker=read('worker.js');
const workerMirror=read('workers/webradio-666soundsdesign-worker/worker.js');

test('canonical all-player recovery core mirrors byte-identically',()=>{
  assert.equal(recoveryPublic,recovery);
  assert.equal(mutePublic,mute);
});

test('shared infrastructure reaches Main, mobile, VELUNA and internal player',()=>{
  assert.match(config,/Wird von 666 PLAYER, VELUNA und internem Notfallplayer geladen/);
  assert.match(config,/\/js\/all-player-mute\.js/);
  assert.match(worker,/config\/veluna-assets\.js/);
  assert.equal(workerMirror,worker);
  assert.match(mute,/\/js\/all-player-audio-recovery\.js\?v=20260827-all-player-buffer-recovery-v1/);
});

test('waiting stalled and suspend are sensors, not immediate reload triggers',()=>{
  assert.match(recovery,/for\(const ev of \['waiting','stalled','suspend'\]\) audio\.addEventListener\(ev,\(\)=>noteCandidate\(audio,ev\)/);
  const sensorBlock=recovery.slice(recovery.indexOf("for(const ev of ['waiting','stalled','suspend']"),recovery.indexOf("for(const ev of ['error','abort','emptied']"));
  assert.doesNotMatch(sensorBlock,/\.load\(/);
  assert.doesNotMatch(sensorBlock,/\.play\(/);
  assert.doesNotMatch(sensorBlock,/removeAttribute\('src'\)/);
});

test('recovery requires confirmed loss with conservative mobile and desktop tolerances',()=>{
  assert.match(recovery,/pausedConfirmMs:5000/);
  assert.match(recovery,/stallConfirmMs:14000/);
  assert.match(recovery,/readyLowConfirmMs:9000/);
  assert.match(recovery,/hardReloadMs:26000/);
  assert.match(recovery,/pausedConfirmMs:8000/);
  assert.match(recovery,/stallConfirmMs:18000/);
  assert.match(recovery,/readyLowConfirmMs:12000/);
  assert.match(recovery,/hardReloadMs:32000/);
  assert.match(recovery,/candidateFor>=p\.pausedConfirmMs/);
  assert.match(recovery,/candidateFor>=p\.readyLowConfirmMs&&stalledFor>=p\.readyLowConfirmMs/);
  assert.match(recovery,/candidateFor>=p\.stallConfirmMs&&stalledFor>=p\.stallConfirmMs/);
});

test('soft recovery is play-only and hard reload is late confirmed escalation',()=>{
  const soft=recovery.slice(recovery.indexOf('async function softRecover'),recovery.indexOf('async function hardRecover'));
  const hard=recovery.slice(recovery.indexOf('async function hardRecover'),recovery.indexOf('function evaluate'));
  assert.match(soft,/audio\.play\(\)/);
  assert.doesNotMatch(soft,/audio\.load\(\)/);
  assert.doesNotMatch(soft,/removeAttribute\('src'\)/);
  assert.match(hard,/audio\.load\(\)/);
  assert.match(recovery,/if\(stalledFor>=p\.hardReloadMs\) void hardRecover/);
});

test('user pause and stop are protected from self-heal restart',()=>{
  assert.match(recovery,/uiSaysStopped\(\)/);
  assert.match(recovery,/body==='pause'\|\|body==='paused'\|\|body==='stop'\|\|body==='stopped'/);
  assert.match(recovery,/data-mff="pause"/);
  assert.match(recovery,/data-mff="stop"/);
  assert.match(recovery,/markManualStop/);
  assert.match(recovery,/now\(\)-s\.manualStopAt<2500/);
});

test('legacy mobile self-heal can hand sensor events to the canonical owner',()=>{
  assert.match(recovery,/S666_AUDIO_HEALING_ORCHESTRA/);
  assert.match(recovery,/active:true,owner:OWNER/);
  assert.match(recovery,/data-audio-orchestra','active'/);
  assert.match(recovery,/data-audio-sensor-event/);
  assert.match(recovery,/attributeFilter:\['data-audio-sensor-event'\]/);
  assert.match(recovery,/recovery:OWNER,legacyRecoveryMuted:true/);
});

test('protected DSP and backend APIs are not invoked by recovery core',()=>{
  assert.doesNotMatch(recovery,/createMediaElementSource|createBiquadFilter|createDynamicsCompressor|__MeterBus|S666SkipControl|S666Discord|S666Messenger|\/api\/|fetch\(/);
});
