// CI retrigger after one-shot cleanup; runtime files unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');

test('Discord addon root/public remain byte-identical',()=>assert.equal(root,mirror));

test('startup autopost retries temporary failures within the bounded window',()=>{
  const start=root.indexOf('  function tryStartupAutoPost()');
  const end=root.indexOf('  async function checkStatus()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.includes('startupAutoPostDone = false'));
  assert.ok(block.includes('Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS'));
  assert.ok(block.includes('startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS)'));
  assert.ok(block.includes('retry-window-exhausted'));
});

test('startup autopost does not duplicate a watcher post',()=>{
  const start=root.indexOf('  function tryStartupAutoPost()');
  const end=root.indexOf('  async function checkStatus()',start);
  const block=root.slice(start,end);
  assert.ok(block.includes('key === lastPostedKey'));
  assert.ok(block.includes('already-posted-by-watcher'));
  assert.ok(block.indexOf('key === lastPostedKey') < block.indexOf("postTrackIfChanged(true, 'startup-first-now-playing')"));
});

test('Discord endpoints remain unchanged and dedupe commits only for the current live track',()=>{
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.ok(root.includes('if (lifecycleIsCurrent(postLifecycle) && trackKey(readTrackFromDom()) === key && (!result || result.skipped !== true)) lastPostedKey = key'));
  assert.equal(root.includes('if (!result || result.skipped !== true) lastPostedKey = key'), false);
});
