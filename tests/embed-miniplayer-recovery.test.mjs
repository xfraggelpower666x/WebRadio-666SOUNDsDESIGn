import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/embed/miniplayer.html',import.meta.url),'utf8');
const core=readFileSync(new URL('../public/js/all-player-audio-recovery.js',import.meta.url),'utf8');
test('MiniPlayer uses existing canonical recovery owner, not a second recovery loop',()=>{
  assert.match(html,/<script src="\/js\/all-player-audio-recovery\.js"><\/script>/);
  assert.equal((html.match(/all-player-audio-recovery\.js/g)||[]).length,1);
  assert.match(core,/OWNER='all-player-audio-recovery-v1'/);
  assert.match(core,/waiting','stalled','suspend/);
  assert.match(core,/candidateFor>=p\.stallConfirmMs/);
  assert.doesNotMatch(html,/new Audio\(/);
});
test('Manual pause and source switch are explicitly fenced from automatic restart',()=>{
  assert.match(html,/markManualStop\(audio\);audio\.pause\(\)/);
  assert.match(html,/markManualStop\(audio\);audio\.pause\(\);retrying/);
  assert.match(html,/markWanted\(audio\);if\(!audio\.src\)/);
  assert.match(core,/now\(\)-s\.manualStopAt<2500/);
});
test('Existing graph and CORS fail-closed safeguards remain in place',()=>{
  assert.match(html,/if\(visualActive\)\{wanted=false;window\.S666AllPlayerAudioRecovery\?\.markManualStop\(audio\)/);
  assert.match(html,/audioContext\?\.state==='running'/);
  assert.match(html,/id="miniMuteBtn"/);
  assert.match(html,/core\.applyEq\(audio,/);
  assert.match(html,/core\.applyBoost\(audio,/);
});


test('MiniPlayer watchdog observes actual currentTime progress without owning recovery',()=>{
  assert.match(html,/current>watchdogAudioTime\+0\.05/);
  assert.match(html,/staleMs>=10000\?'stalled'/);
  assert.match(html,/watchdogStaleMs:watchdogProgressAt/);
  assert.match(html,/watchdogProgressAt=0;return/);
  assert.match(html,/S666AllPlayerAudioRecovery\?\.markManualStop\(audio\)/);
  assert.doesNotMatch(html,/setInterval\([^)]*hardRecover\(/);
});

test('Dashboard STR/M/B LEDs reflect playback, not API health or source selection alone',()=>{
  const fs=readFileSync(new URL('../dashboard/index.html',import.meta.url),'utf8');
  const publicDash=readFileSync(new URL('../public/dashboard/index.html',import.meta.url),'utf8');
  assert.equal(fs,publicDash);
  assert.match(fs,/mark\('STR',state\.error\?'error':state\.waiting/);
  assert.match(fs,/mark\('SRC',playing\?'ok'/);
  assert.match(fs,/mark\('M',playing&&state\.source==='main'\?'ok':'off'/);
  assert.match(fs,/mark\('B',playing&&state\.source==='backup'\?'ok':'off'/);
  assert.doesNotMatch(fs,/mark\('STR',health\?\.ok===true/);
  assert.match(fs,/mark\('WRK',health\?\.ok===true/);
});

test('iPhone display-only fallback retains separate non-measured contract and real MTR gating',()=>{
  const bridge=readFileSync(new URL('../public/js/audio-levels.js',import.meta.url),'utf8');
  assert.match(html,/function renderVisualFallback\(/);
  assert.match(html,/publishVisualFallback\?\./);
  assert.match(bridge,/type:'lyvra:audio:visual-fallback'/);
  assert.match(bridge,/mode:'synthetic'/);
  assert.match(html,/meterAvailable:!!\(playing&&!audio\.muted&&visualActive/);
  assert.match(html,/lastFrequencyPeak>0\|\|lastWaveformRms>0\.001/);
});
