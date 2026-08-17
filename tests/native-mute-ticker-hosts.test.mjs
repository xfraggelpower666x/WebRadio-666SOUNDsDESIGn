import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(p,'utf8');
test('mute stays inside real player controls and preserves audio volume',()=>{
  const a=read('js/all-player-mute.js'), b=read('public/js/all-player-mute.js');
  assert.equal(a,b);
  assert.match(a,/#mffApp \.mff-controls/);
  assert.match(a,/\.player-shell \.bottom-console \.control-toolbar/);
  assert.match(a,/getElementById\('muteBtn'\)/);
  assert.match(a,/button\.parentElement !== host/);
  assert.match(a,/audio\.muted = !audio\.muted/);
  assert.doesNotMatch(a,/audio\.volume\s*=/);
});
test('main now-playing ticker uses existing real keyframes',()=>{
  const a=read('css/player-stage-v2.css'), b=read('public/css/player-stage-v2.css');
  assert.equal(a,b);
  assert.match(a,/@keyframes s666TitleMarquee/);
  assert.match(a,/animation:s666TitleMarquee 14s linear infinite!important/);
  assert.doesNotMatch(a,/animation:tickerMove 14s linear infinite!important/);
  assert.match(a,/#mffApp \.mff-controls\{[^}]*grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important/);
});
test('VELUNA retains its native in-player mute and marquee',()=>{
  const v=read('VELUNA/index.html');
  assert.match(v,/id="muteBtn" class="small-btn"/);
  assert.match(v,/muteBtn\.addEventListener\('click'/);
  assert.match(v,/@keyframes velunaTicker/);
  assert.match(v,/marquee-track\.is-running\{animation:velunaTicker/);
});
