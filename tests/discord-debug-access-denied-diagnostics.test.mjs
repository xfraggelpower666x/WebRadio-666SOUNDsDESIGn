import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('debug access denied records diagnostic truth',()=>{
 const start=root.indexOf("if (path === '/api/discord/debug')");
 const end=root.indexOf('    return json({',start+40);
 const block=root.slice(start,end+200);
 assert.ok(block.includes('runtime.lastErrorAt = Date.now();'));
 assert.ok(block.includes("runtime.lastError = 'unauthorized';"));
 assert.ok(block.includes("runtime.lastKind = 'debug-access-denied';"));
 assert.ok(block.includes('401'));
});
