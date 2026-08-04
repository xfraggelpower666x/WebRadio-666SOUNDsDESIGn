import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const mirror=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');

test('phase10 root/public remain byte-identical',()=>assert.equal(root,mirror));

test('side meter uses real signals and stays still when unavailable',()=>{
  const start=root.indexOf('  function sideMeterReactV1AudioLevel(){');
  const end=root.indexOf('  function sideMeterReactV1Groups()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.match(block,/window.__MeterBus/);
  assert.match(block,/data-side-meter-signal/);
  assert.match(block,/real-unavailable/);
  assert.match(block,/audio && !audio.paused && signalAvailable/);
  assert.doesNotMatch(block,/Math.sin|phase +=|pseudo|synthetic/);
});

test('H/B and recovery contracts remain present',()=>{
  assert.match(root,/bindMobileStreamLedSwitch/);
  assert.match(root,/centralAudioGuardV2Recover/);
});
