import fs from 'node:fs';

const files = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

const oldBlock = `  if (!(await discordAccessOk(request, env))) {\n    runtime.lastKind = 'access-denied';\n    return json({ ok: false, led: 'error', error: 'shared admin session required', addon: ADDON_VERSION }, 401);\n  }`;
const newBlock = `  if (!(await discordAccessOk(request, env))) {\n    runtime.lastErrorAt = Date.now();\n    runtime.lastError = 'shared admin session required';\n    runtime.lastKind = 'access-denied';\n    return json({ ok: false, led: 'error', error: runtime.lastError, addon: ADDON_VERSION }, 401);\n  }`;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(oldBlock)) throw new Error(`anchor missing: ${file}`);
  fs.writeFileSync(file, source.replace(oldBlock, newBlock));
}

const root = fs.readFileSync(files[0], 'utf8');
const mirror = fs.readFileSync(files[1], 'utf8');
if (root !== mirror) throw new Error('Discord worker mirrors diverged');

fs.writeFileSync('tests/discord-access-denied-diagnostics.test.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');\nconst mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');\ntest('mirrors remain byte-identical',()=>assert.equal(root,mirror));\ntest('access denied records diagnostic truth',()=>{\n  const start=root.indexOf("if (!(await discordAccessOk(request, env))) {");\n  const end=root.indexOf('  try {',start);\n  const block=root.slice(start,end);\n  assert.ok(block.includes('runtime.lastErrorAt = Date.now();'));\n  assert.ok(block.includes("runtime.lastError = 'shared admin session required';"));\n  assert.ok(block.includes("runtime.lastKind = 'access-denied';"));\n  assert.ok(block.includes('error: runtime.lastError'));\n  assert.ok(block.includes('401'));\n});\n`);
