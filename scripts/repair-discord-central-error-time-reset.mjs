import fs from 'node:fs';

const paths = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

const before = "runtime.lastErrorAt = partial ? Date.now() : runtime.lastErrorAt;";
const after = "runtime.lastErrorAt = partial ? Date.now() : 0;";

for (const path of paths) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`repair anchor missing in ${path}`);
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
}

const root = fs.readFileSync(paths[0], 'utf8');
const mirror = fs.readFileSync(paths[1], 'utf8');
if (root !== mirror) throw new Error('Discord worker mirrors diverged');

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('central Discord success clears stale error timestamp',()=>{
  assert.ok(root.includes('runtime.lastErrorAt = partial ? Date.now() : 0;'));
  assert.ok(root.includes("runtime.lastError = partial ? failed.map(item => item.error).join(' | ').slice(0, 1200) : '';"));
});
test('partial delivery still records a current error timestamp',()=>{
  const start=root.indexOf('const partial = failed.length > 0;');
  const end=root.indexOf('return { ok: true, partial',start);
  const block=root.slice(start,end);
  assert.ok(block.includes('partial ? Date.now() : 0'));
  assert.ok(block.includes('runtime.lastOkAt = Date.now();'));
});
`;
fs.writeFileSync('tests/discord-central-error-time-reset.test.mjs', test);
