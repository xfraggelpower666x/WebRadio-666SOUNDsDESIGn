import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/system-extra/govee/govee-scene-sync.js','utf8');
const mirror=fs.readFileSync('public/js/system-extra/govee/govee-scene-sync.js','utf8');
const config=fs.readFileSync('js/system-extra/govee/govee-sync-config.js','utf8');

test('Govee scene sync remains byte-identical',()=>assert.equal(root,mirror));

test('explicit FX scene remains authoritative',()=>{
  assert.match(root,/const explicitScene = String\(body\?\.dataset\.fxSceneMode/);
  assert.match(root,/scene: explicitScene \|\| undefined/);
  assert.match(root,/sceneSource: explicitScene \? "dataset" : "meterbus"/);
});
test('scene inference runs in the Govee Worker',()=>{
  const mapping=fs.readFileSync('projects/666-GOVEE-CONTROL/worker/src/audio-mapping.js','utf8');
  assert.doesNotMatch(root,/function inferSignalScene/);
  assert.match(mapping,/energy>0.78/);
  assert.match(root,/detail.source !== "real"/);
  assert.match(config,/enabled: false/);
});

test('Govee fallback does not create a second audio graph',()=>{
  assert.match(root,/goveeSendAudio\(payload\)/);
  assert.doesNotMatch(root,/AudioContext|createMediaElementSource|createAnalyser/);
});
