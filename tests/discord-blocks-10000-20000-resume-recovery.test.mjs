import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('resume runs only after a real lifecycle suspension',()=>{
  assert.ok(root.includes('if (!initialized || !lifecycleSuspended) return;'));
  assert.ok(root.includes("window.addEventListener('pageshow', function () { resumeRuntime(); })"));
});
test('suspend clears stale button reset timers',()=>{
  assert.ok(root.includes('clearTimeout(statusResetTimer);'));
  assert.ok(root.includes('statusResetTimer = 0;'));
});
test('player alert recovery is single-flight across parallel callers',()=>{
  assert.ok(root.includes('var playerAlertClientLoad = null;'));
  assert.ok(root.includes('if (playerAlertClientLoad) return playerAlertClientLoad;'));
  assert.ok(root.includes('var loadPromise = (async function ()'));
  assert.ok(root.includes('playerAlertClientLoad = loadPromise;'));
  assert.ok(root.includes('if (playerAlertClientLoad === loadPromise) playerAlertClientLoad = null;'));
});
// final required-gate retrigger after self-clean
