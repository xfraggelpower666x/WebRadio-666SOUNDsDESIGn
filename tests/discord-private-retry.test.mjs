import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors',()=>assert.equal(root,mirror));
test('private retry skips main delivery',()=>{ for(const x of ['pendingPrivateTrackKey','privateRetry: true','skippedMain: true','nowplaying-private-retry-failed','nowplaying-private-retry-ok']) assert.ok(root.includes(x),x); });
test('main delivery remains single',()=>{ const i=root.indexOf("if (key === runtime.lastTrackKey"); const j=root.indexOf("runtime.lastKind = 'nowplaying';",i); const b=root.slice(i,j); assert.ok(!b.includes('sendDiscord(env')); assert.ok(b.includes('sendPrivateNowPlayingIfConfigured')); });
test('pending set only on private failure',()=>{ assert.ok(root.includes('runtime.pendingPrivateTrackKey = key')); assert.ok(root.includes("runtime.pendingPrivateTrackKey = ''")); });
