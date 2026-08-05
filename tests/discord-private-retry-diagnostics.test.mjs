// CI retrigger after one-shot cleanup; runtime files unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('successful private-only retry refreshes diagnostics without erasing a main partial',()=>{
  const start=root.indexOf("runtime.pendingPrivateTrackKey = ''", root.indexOf('nowplaying-private-retry-failed'));
  const end=root.indexOf("return json({ ok: true, partial: mainStillPartial", start);
  const block=root.slice(start,end);
  assert.ok(block.includes('runtime.lastOkAt = Date.now();'));
  assert.ok(block.includes('const mainStillPartial = runtime.pendingMainPartialTrackKey === key;'));
  assert.ok(block.includes("runtime.lastError = mainStillPartial ? runtime.pendingMainPartialError : '';"));
  assert.ok(!block.includes('sendDiscord(env'));
});
test('private retry contracts remain intact',()=>{
  for(const marker of ['privateRetry: true','skippedMain: true','nowplaying-private-retry-failed','nowplaying-private-retry-ok']) assert.ok(root.includes(marker),marker);
});
