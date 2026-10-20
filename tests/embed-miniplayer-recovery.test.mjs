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
