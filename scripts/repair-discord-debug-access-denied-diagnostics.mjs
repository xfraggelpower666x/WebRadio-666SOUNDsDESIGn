import fs from 'node:fs';
const files=[
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];
const oldLine="    if (!(await discordAccessOk(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);";
const replacement=`    if (!(await discordAccessOk(request, env))) {\n      runtime.lastErrorAt = Date.now();\n      runtime.lastError = 'unauthorized';\n      runtime.lastKind = 'debug-access-denied';\n      return json({ ok: false, error: runtime.lastError }, 401);\n    }`;
for (const file of files) {
  const source=fs.readFileSync(file,'utf8');
  if (!source.includes(oldLine)) throw new Error('anchor missing: '+file);
  fs.writeFileSync(file,source.replace(oldLine,replacement));
}
fs.writeFileSync('tests/discord-debug-access-denied-diagnostics.test.mjs',`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');\nconst mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');\ntest('mirrors remain byte-identical',()=>assert.equal(root,mirror));\ntest('debug access denied records diagnostic truth',()=>{\n const start=root.indexOf("if (path === '/api/discord/debug')");\n const end=root.indexOf('    return json({',start+40);\n const block=root.slice(start,end+200);\n assert.ok(block.includes('runtime.lastErrorAt = Date.now();'));\n assert.ok(block.includes("runtime.lastError = 'unauthorized';"));\n assert.ok(block.includes("runtime.lastKind = 'debug-access-denied';"));\n assert.ok(block.includes('401'));\n});\n`);
