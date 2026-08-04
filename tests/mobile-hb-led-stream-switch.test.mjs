import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const mirror=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('phase10 root/public remain byte-identical',()=>assert.equal(root,mirror));
test('player root/public remain byte-identical',()=>assert.equal(index,publicIndex));

test('visible H/B LEDs use the canonical stream buttons',()=>{
  assert.match(index,/data-led=\"main\"/);
  assert.match(index,/data-led=\"backup\"/);
  assert.match(root,/canonical:"mainBtn"/);
  assert.match(root,/canonical:"fallbackBtn"/);
  assert.match(root,/tap\(canonical,"mobile-"\+entry\.target\+"-stream"\)/);
});

test('mobile H/B switch suppresses synthetic click and reports state',()=>{
  assert.match(root,/phase10StreamSwitchLastTouchAt/);
  assert.match(root,/Date\.now\(\)-phase10StreamSwitchLastTouchAt<700/);
  assert.match(root,/data-manual-stream-target/);
  assert.match(root,/aria-pressed/);
  assert.match(root,/bindMobileStreamLedSwitch\(\);/);
});

test('repair does not define stream URLs or audio graph',()=>{
  const start=root.indexOf('    var phase10StreamSwitchLastTouchAt=0;');
  const end=root.indexOf('    function phase10IsMobileAudioDevice()',start);
  const block=root.slice(start,end);
  assert.doesNotMatch(block,/STREAM_URL|https?:|AudioContext|createMediaElementSource|createAnalyser/);
});
