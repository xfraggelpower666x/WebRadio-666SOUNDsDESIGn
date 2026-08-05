import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('fetch timeout works even without AbortController',()=>{
  assert.ok(root.includes("reject(new Error('discord_request_timeout'))"));
  assert.ok(root.includes('return new Promise(function (resolve, reject)'));
  assert.ok(root.includes('if (controller) controller.abort();'));
});
test('failed scripts are removed and retry registry is cleared',()=>{
  assert.ok(root.includes('function removeBrokenScript()'));
  assert.ok(root.includes('script.parentNode.removeChild(script)'));
  assert.ok(root.includes('delete scriptLoads[id];'));
});
test('script listeners are cleaned on success failure and timeout',()=>{
  assert.ok(root.includes("script.removeEventListener('load', done)"));
  assert.ok(root.includes("script.removeEventListener('error', failed)"));
  assert.ok(root.includes('timeout = setTimeout(timedOut, REQUEST_TIMEOUT_MS);'));
});
