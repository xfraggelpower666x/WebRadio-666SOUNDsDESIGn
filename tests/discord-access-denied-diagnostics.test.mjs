import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('access denied records diagnostic truth',()=>{
  const start=root.indexOf("if (!(await discordAccessOk(request, env))) {");
  const end=root.indexOf('  try {',start);
  const block=root.slice(start,end);
  assert.ok(block.includes('runtime.lastErrorAt = Date.now();'));
  assert.ok(block.includes("runtime.lastError = 'shared admin session required';"));
  assert.ok(block.includes("runtime.lastKind = 'access-denied';"));
  assert.ok(block.includes('error: runtime.lastError'));
  assert.ok(block.includes('401'));
});
// final gate retrigger
