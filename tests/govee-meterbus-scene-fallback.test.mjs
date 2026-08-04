import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/system-extra/govee/govee-scene-sync.js','utf8');
const mirror=fs.readFileSync('public/js/system-extra/govee/govee-scene-sync.js','utf8');
const config=fs.readFileSync('js/system-extra/govee/govee-sync-config.js','utf8');

test('Govee scene sync remains byte-identical',()=>assert.equal(root,mirror));

test('explicit FX scene remains authoritative',()=>{
  assert.match(root,/const explicitScene = String\(body\?\.dataset\.fxSceneMode/);
  assert.match(root,/scene: explicitScene \|\| inferSignalScene\(detail\)/);
  assert.match(root,/sceneSource: explicitScene \? "dataset" : "meterbus"/);
  assert.match(root,/fx\.sceneSource === "dataset"/);
});

test('MeterBus fallback covers idle break build and drop',()=>{
  assert.match(root,/function inferSignalScene/);
  assert.match(root,/energy < 0\.025\) return "idle"/);
  assert.match(root,/energy > 0\.78\) return "drop"/);
  assert.match(root,/energy > 0\.32\) return "build"/);
  assert.match(root,/energy < 0\.12\) return "break"/);
  assert.match(root,/window\.__MeterBus/);
});

test('mode changes are stabilized without delaying drops',()=>{
  assert.match(root,/pendingSceneSince/);
  assert.match(root,/now - pendingSceneSince >= 1200/);
  assert.match(root,/fx\.scene === "drop"/);
  assert.match(root,/data-govee-scene-source/);
  assert.match(config,/idle: "ambient"/);
  assert.match(config,/build: "cyber"/);
  assert.match(config,/drop: "club"/);
});

test('Govee fallback does not create a second audio graph',()=>{
  assert.match(root,/goveeSendAudio\(payload\)/);
  assert.doesNotMatch(root,/AudioContext|createMediaElementSource|createAnalyser/);
});
