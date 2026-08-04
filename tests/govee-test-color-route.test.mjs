import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/system-extra/govee/govee-fx-control-hooks.js','utf8');
const mirror=fs.readFileSync('public/js/system-extra/govee/govee-fx-control-hooks.js','utf8');
const bridge=fs.readFileSync('js/system-extra/govee/govee-bridge-client.js','utf8');
const scene=fs.readFileSync('js/system-extra/govee/govee-scene-sync.js','utf8');

test('Govee control hooks remain byte-identical',()=>assert.equal(root,mirror));
test('test-color control uses the dedicated bridge endpoint',()=>{
  const start=root.indexOf('if (bindControl(test, "click"');
  const end=root.indexOf('return bound;',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.match(block,/goveeTestColor\(payload\)/);
  assert.doesNotMatch(block,/sendPreview|goveeSendAudio|previewColor/);
  assert.match(bridge,/post\("\/api\/test\/color"/);
});
test('live audio sync remains on the audio bridge route',()=>{
  assert.match(scene,/goveeSendAudio\(payload\)/);
  assert.match(bridge,/post\("\/api\/audio"/);
  assert.match(scene,/window\.__MeterBus/);
  assert.doesNotMatch(scene,/AudioContext|createMediaElementSource|createAnalyser/);
});
