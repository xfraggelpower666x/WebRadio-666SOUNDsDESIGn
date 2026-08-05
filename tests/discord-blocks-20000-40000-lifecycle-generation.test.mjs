import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('POST requests are invalidated across lifecycle generations',()=>{
  assert.ok(root.includes('var lifecycleGeneration = 0;'));
  assert.ok(root.includes('var activeRequestId = 0;'));
  assert.ok(root.includes('if (!lifecycleIsCurrent(requestLifecycle) || activeRequestId !== requestId) throw staleLifecycleError();'));
  assert.ok(root.includes('if (activeRequestId === requestId) activeRequestId = 0;'));
});
test('status responses use latest-response generation guard',()=>{
  assert.ok(root.includes('var statusId = ++statusSequence;'));
  assert.ok(root.includes('statusId !== statusSequence'));
  assert.ok(root.includes('statusSequence += 1;'));
});
test('watcher rechecks lifecycle and live track after await',()=>{
  assert.ok(root.includes('var watcherLifecycle = lifecycleGeneration;'));
  assert.ok(root.includes('lifecycleIsCurrent(watcherLifecycle) && trackKey(readTrackFromDom()) === current'));
});
test('messenger open and send paths reject stale BFCache completions',()=>{
  assert.ok(root.includes('var openId = ++messengerOpenSequence;'));
  assert.ok(root.includes('openId !== messengerOpenSequence'));
  assert.ok(root.includes('if (activeVelunaSendId) return;'));
  assert.ok(root.includes('activeVelunaSendId !== sendId'));
});
test('button status timers survive DOM remounts and reset both bridges',()=>{
  assert.ok(root.includes('var discordButtonPhase = \'idle\';'));
  assert.ok(root.includes('var discordButtonStateSequence = 0;'));
  assert.ok(root.includes('var velunaButtonPhase = \'idle\';'));
  assert.ok(root.includes('var velunaButtonStateSequence = 0;'));
  assert.ok(root.includes('applyDiscordButtonPhase(document.getElementById(\'discordBtn\'))'));
  assert.ok(root.includes('applyVelunaButtonPhase(document.getElementById(\'s666VelunaMessageButton\'))'));
});
test('suspend clears transient controls and invalidates async work',()=>{
  assert.ok(root.includes('lifecycleGeneration += 1;'));
  assert.ok(root.includes('activeRequestId = 0;'));
  assert.ok(root.includes('activeVelunaSendId = 0;'));
  assert.ok(root.includes('resetTransientRuntimeState();'));
});
test('overlay Escape handling is single and DOM-remount safe',()=>{
  assert.ok(root.includes('var escapeBridgeInstalled = false;'));
  assert.ok(root.includes('function installEscapeBridge()'));
  assert.ok(root.includes("document.addEventListener('keydown', function (event) {"));
});
// Required-gate retrigger after one-shot self-clean.
