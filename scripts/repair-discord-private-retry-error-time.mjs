import fs from 'node:fs';

const files = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];
const from = "          runtime.lastOkAt = Date.now();\n          runtime.lastError = '';\n          runtime.lastKind = 'nowplaying-private-retry-ok';";
const to = "          runtime.lastOkAt = Date.now();\n          runtime.lastErrorAt = 0;\n          runtime.lastError = '';\n          runtime.lastKind = 'nowplaying-private-retry-ok';";
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(from)) throw new Error(`repair anchor missing: ${file}`);
  fs.writeFileSync(file, source.replace(from, to));
}
fs.writeFileSync('tests/discord-private-retry-error-time.test.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');\nconst mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');\ntest('mirrors',()=>assert.equal(root,mirror));\ntest('successful private retry clears stale error timestamp',()=>{\n const start=root.indexOf(\"runtime.pendingPrivateTrackKey = ''\", root.indexOf('nowplaying-private-retry-failed'));\n const end=root.indexOf(\"runtime.lastKind = 'nowplaying-private-retry-ok'\",start);\n const block=root.slice(start,end);\n assert.ok(block.includes('runtime.lastOkAt = Date.now();'));\n assert.ok(block.includes('runtime.lastErrorAt = 0;'));\n assert.ok(block.includes(\"runtime.lastError = '';\"));\n assert.ok(!block.includes('sendDiscord(env'));\n});\n`);
