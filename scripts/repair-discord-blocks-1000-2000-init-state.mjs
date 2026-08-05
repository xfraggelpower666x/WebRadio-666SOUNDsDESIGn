import fs from 'node:fs';

const files = ['js/addons/discord-player-addon-v3.js','public/js/addons/discord-player-addon-v3.js'];
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');

  text = text.replace(
    "  var startupAutoPostStartedAt = 0;\n",
    "  var startupAutoPostStartedAt = 0;\n  var initialized = false;\n"
  );

  text = text.replace(
    "        } else {\n          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'retry-window-exhausted', key: key });\n        }\n",
    "        } else {\n          lastTrackKey = '';\n          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'retry-window-exhausted', key: key });\n        }\n"
  );

  const oldBridge = `    window.addEventListener('s666:discord-state', function (event) {\n      var detail = event.detail || {};\n      var button = document.getElementById('discordBtn');\n      if (!button) return;\n      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');\n      if (detail.phase === 'sending') button.classList.add('is-busy');\n      else if (detail.phase === 'success') button.classList.add('is-ok');\n      else if (detail.phase === 'warning') button.classList.add('is-warn');\n      else if (detail.phase === 'error') button.classList.add('is-error');\n    });`;
  const newBridge = `    window.addEventListener('s666:discord-state', function (event) {\n      var detail = event.detail || {};\n      var phase = detail.phase;\n      if (phase === 'status') {\n        if (detail.ok !== false) return;\n        phase = 'error';\n      }\n      if (phase !== 'sending' && phase !== 'success' && phase !== 'warning' && phase !== 'error') return;\n      var button = document.getElementById('discordBtn');\n      if (!button) return;\n      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');\n      if (phase === 'sending') button.classList.add('is-busy');\n      else if (phase === 'success') button.classList.add('is-ok');\n      else if (phase === 'warning') button.classList.add('is-warn');\n      else if (phase === 'error') button.classList.add('is-error');\n    });`;
  if (!text.includes(oldBridge)) throw new Error(`status bridge marker missing in ${file}`);
  text = text.replace(oldBridge, newBridge);

  text = text.replace(
    "  function initAll() {\n    initDiscordButtonStatusBridge();\n",
    "  function initAll() {\n    if (initialized) return;\n    initialized = true;\n    initDiscordButtonStatusBridge();\n"
  );

  text = text.replace(
    "  document.addEventListener('DOMContentLoaded', initAll);\n  if (document.readyState !== 'loading') setTimeout(initAll, 0);\n",
    "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });\n  else setTimeout(initAll, 0);\n"
  );

  fs.writeFileSync(file, text);
}

const root = fs.readFileSync(files[0], 'utf8');
const mirror = fs.readFileSync(files[1], 'utf8');
if (root !== mirror) throw new Error('Discord addon mirrors diverged');

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('initialization is single-shot across DOM ready states',()=>{
  assert.ok(root.includes('var initialized = false;'));
  assert.ok(root.includes('if (initialized) return;'));
  assert.ok(root.includes("if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });"));
  assert.ok(root.includes('else setTimeout(initAll, 0);'));
});
test('button bridge ignores informational phases and surfaces failed status checks',()=>{
  assert.ok(root.includes("if (phase !== 'sending' && phase !== 'success' && phase !== 'warning' && phase !== 'error') return;"));
  assert.ok(root.includes("if (phase === 'status')"));
  assert.ok(root.includes("if (detail.ok !== false) return;"));
});
test('startup retry exhaustion releases the track to the watcher',()=>{
  const block=root.slice(root.indexOf("reason: 'retry-window-exhausted'")-120,root.indexOf("reason: 'retry-window-exhausted'")+180);
  assert.ok(block.includes("lastTrackKey = '';"));
});
`;
fs.writeFileSync('tests/discord-blocks-1000-2000-init-state.test.mjs', test);
