import fs from 'node:fs';

const files = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];
const oldText = "          runtime.pendingPrivateTrackKey = '';\n          runtime.lastError = '';\n          runtime.lastKind = 'nowplaying-private-retry-ok';";
const newText = "          runtime.pendingPrivateTrackKey = '';\n          runtime.lastOkAt = Date.now();\n          runtime.lastError = '';\n          runtime.lastKind = 'nowplaying-private-retry-ok';";
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(oldText)) throw new Error(`anchor missing: ${file}`);
  fs.writeFileSync(file, source.replace(oldText, newText));
}
const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('successful private-only retry refreshes diagnostics',()=>{
  const start=root.indexOf("runtime.pendingPrivateTrackKey = ''", root.indexOf('nowplaying-private-retry-failed'));
  const end=root.indexOf("runtime.lastKind = 'nowplaying-private-retry-ok'", start);
  const block=root.slice(start,end);
  assert.ok(block.includes('runtime.lastOkAt = Date.now();'));
  assert.ok(block.includes("runtime.lastError = '';"));
  assert.ok(!block.includes('sendDiscord(env'));
});
test('private retry contracts remain intact',()=>{
  for(const marker of ['privateRetry: true','skippedMain: true','nowplaying-private-retry-failed','nowplaying-private-retry-ok']) assert.ok(root.includes(marker),marker);
});
`;
fs.writeFileSync('tests/discord-private-retry-diagnostics.test.mjs', test);
