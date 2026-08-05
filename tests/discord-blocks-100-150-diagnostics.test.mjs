import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('worker mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('method and validation failures record runtime truth',()=>{
 assert.ok(root.includes("runtime.lastKind = 'method-not-allowed';"));
 assert.ok(root.includes("runtime.lastKind = 'message-validation-error';"));
 assert.ok(root.includes("runtime.lastKind = 'nowplaying-validation-error';"));
});
test('debug exposes pending private retry without leaking its key',()=>{
 assert.ok(root.includes("pendingPrivateTrack: runtime.pendingPrivateTrackKey ? '[set]' : ''"));
});
test('simultaneous main and private partial errors are combined',()=>{
 assert.ok(root.includes("[result.partial ? runtime.lastError : '', privateError].filter(Boolean).join(' | ').slice(0, 1200)"));
});
// Gate retrigger after consolidated cleanup commit.
