import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pairs=[
  ['js/system-extra/govee/govee-sync-config.js','public/js/system-extra/govee/govee-sync-config.js'],
  ['js/system-extra/govee/govee-bridge-client.js','public/js/system-extra/govee/govee-bridge-client.js'],
  ['js/system-extra/govee/govee-scene-sync.js','public/js/system-extra/govee/govee-scene-sync.js'],
  ['js/system-extra/govee/govee-fx-control-hooks.js','public/js/system-extra/govee/govee-fx-control-hooks.js']
];
for(const [root,mirror] of pairs){
  test(root+' mirrors public',()=>assert.equal(fs.readFileSync(root,'utf8'),fs.readFileSync(mirror,'utf8')));
}
const config=fs.readFileSync(pairs[0][0],'utf8');
const bridge=fs.readFileSync(pairs[1][0],'utf8');
const scene=fs.readFileSync(pairs[2][0],'utf8');
const hooks=fs.readFileSync(pairs[3][0],'utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('player root mirror remains intact',()=>assert.equal(index,publicIndex));
test('Govee runtime uses canonical MeterBus without a second audio graph',()=>{
  assert.match(scene,/window\.__MeterBus/);
  assert.match(scene,/analyzer:update/);
  assert.match(scene,/toBridgeLevel/);
  assert.match(scene,/numeric \* 255/);
  assert.match(scene,/reconnectDelayMs/);
  assert.match(scene,/inFlight/);
  assert.doesNotMatch(scene,/AudioContext|createMediaElementSource|createAnalyser/);
});
test('Govee bridge has timeout and offline recovery controls',()=>{
  assert.match(config,/requestTimeoutMs: 1800/);
  assert.match(config,/reconnectDelayMs: 5000/);
  assert.match(bridge,/AbortController/);
  assert.match(bridge,/Bridge timeout after/);
});
test('Govee controls and module loading are wired',()=>{
  assert.match(hooks,/bootHooks/);
  assert.match(hooks,/window\.S666GoveeSync/);
  assert.match(index,/govee-scene-sync\.js/);
  assert.match(index,/govee-fx-control-hooks\.js/);
});
