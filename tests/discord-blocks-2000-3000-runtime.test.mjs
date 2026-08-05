import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('Discord requests and status checks have bounded timeouts',()=>{
  assert.ok(root.includes('function fetchWithTimeout('));
  assert.ok(root.includes('REQUEST_TIMEOUT_MS = 15000'));
  assert.ok(root.includes('STATUS_TIMEOUT_MS = 10000'));
  assert.ok(root.includes("throw new Error('discord_request_timeout')"));
});
test('watcher is single-flight across visibility reschedules',()=>{
  assert.ok(root.includes('var watcherRunning = false;'));
  assert.ok(root.includes('if (watcherRunning) {'));
  assert.ok(root.includes('watcherRunning = true;'));
  assert.ok(root.includes('watcherRunning = false;'));
});
test('script loads share one pending promise and wait for real load',()=>{
  assert.ok(root.includes('var scriptLoads = Object.create(null);'));
  assert.ok(root.includes('if (scriptLoads[id]) return scriptLoads[id];'));
  assert.ok(root.includes("script.addEventListener('load', done, { once: true })"));
  assert.ok(root.includes("script_load_timeout:"));
});
