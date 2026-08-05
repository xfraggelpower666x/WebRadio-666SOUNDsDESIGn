import fs from 'node:fs';

const files = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

function replaceExact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing marker: ${label}`);
  return source.replace(from, to);
}

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');

  source = replaceExact(
    source,
    "      lastTrackKey: runtime.lastTrackKey ? '[set]' : ''\n",
    "      lastTrackKey: runtime.lastTrackKey ? '[set]' : '',\n      pendingPrivateTrack: runtime.pendingPrivateTrackKey ? '[set]' : ''\n",
    'debug pending private state'
  );

  source = replaceExact(
    source,
    "  if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);",
    "  if (request.method !== 'POST') {\n    runtime.lastErrorAt = Date.now();\n    runtime.lastError = 'POST required';\n    runtime.lastKind = 'method-not-allowed';\n    return json({ ok: false, error: runtime.lastError }, 405);\n  }",
    'method diagnostics'
  );

  source = replaceExact(
    source,
    "      if (!message) return json({ ok: false, error: 'message text missing' }, 400);",
    "      if (!message) {\n        runtime.lastErrorAt = Date.now();\n        runtime.lastError = 'message text missing';\n        runtime.lastKind = 'message-validation-error';\n        return json({ ok: false, error: runtime.lastError }, 400);\n      }",
    'message validation diagnostics'
  );

  source = replaceExact(
    source,
    "      if (!key) return json({ ok: false, error: 'track/artist/title/nowPlaying fehlt' }, 400);",
    "      if (!key) {\n        runtime.lastErrorAt = Date.now();\n        runtime.lastError = 'track/artist/title/nowPlaying fehlt';\n        runtime.lastKind = 'nowplaying-validation-error';\n        return json({ ok: false, error: runtime.lastError }, 400);\n      }",
    'nowplaying validation diagnostics'
  );

  source = replaceExact(
    source,
    "      if (privatePartial) {\n        runtime.pendingPrivateTrackKey = key;\n        runtime.lastErrorAt = Date.now();\n        runtime.lastError = clean(privateTrack.error, 'private_track_delivery_failed', 1200);\n      } else if (runtime.pendingPrivateTrackKey === key) {",
    "      if (privatePartial) {\n        runtime.pendingPrivateTrackKey = key;\n        runtime.lastErrorAt = Date.now();\n        const privateError = clean(privateTrack.error, 'private_track_delivery_failed', 1200);\n        runtime.lastError = [result.partial ? runtime.lastError : '', privateError].filter(Boolean).join(' | ').slice(0, 1200);\n      } else if (runtime.pendingPrivateTrackKey === key) {",
    'combined main and private partial errors'
  );

  fs.writeFileSync(file, source);
}

const root = fs.readFileSync(files[0], 'utf8');
const mirror = fs.readFileSync(files[1], 'utf8');
if (root !== mirror) throw new Error('worker mirrors diverged');

fs.writeFileSync('tests/discord-blocks-100-150-diagnostics.test.mjs', `import test from 'node:test';
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
`);
