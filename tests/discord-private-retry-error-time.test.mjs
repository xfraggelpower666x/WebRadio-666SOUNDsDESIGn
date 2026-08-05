import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors',()=>assert.equal(root,mirror));
test('successful private retry clears the timestamp only when no main partial remains',()=>{
 const start=root.indexOf("runtime.pendingPrivateTrackKey = ''", root.indexOf('nowplaying-private-retry-failed'));
 const end=root.indexOf("return json({ ok: true, partial: mainStillPartial",start);
 const block=root.slice(start,end);
 assert.ok(block.includes('runtime.lastOkAt = Date.now();'));
 assert.ok(block.includes('runtime.lastErrorAt = mainStillPartial ? Date.now() : 0;'));
 assert.ok(block.includes("runtime.lastError = mainStillPartial ? runtime.pendingMainPartialError : '';"));
 assert.ok(!block.includes('sendDiscord(env'));
});
// final gate retrigger
