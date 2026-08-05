import fs from 'node:fs';

const addonFiles = ['js/addons/discord-player-addon-v3.js','public/js/addons/discord-player-addon-v3.js'];

for (const file of addonFiles) {
  let text = fs.readFileSync(file, 'utf8');
  const styleMarker = "'.s666-discord-status.is-sending{color:#ffc857}.s666-discord-status.is-ok{color:#7edcff}.s666-discord-status.is-error{color:#ff5570}.s666-discord-status.is-warn{color:#ffc857}',";
  if (!text.includes('#discordBtn.is-warn')) {
    if (!text.includes(styleMarker)) throw new Error(`Status style marker missing in ${file}`);
    text = text.replace(styleMarker, styleMarker + "\n      '#discordBtn.is-warn{border-color:rgba(255,200,87,.82)!important;color:#ffc857!important;box-shadow:0 0 14px rgba(255,200,87,.3)!important}',");
  }

  const initMarker = "  function initAll() {\n";
  const bridge = `  function initDiscordButtonStatusBridge() {
    if (window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__) return;
    window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__ = true;
    window.addEventListener('s666:discord-state', function (event) {
      var detail = event.detail || {};
      var button = document.getElementById('discordBtn');
      if (!button) return;
      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
      if (detail.phase === 'sending') button.classList.add('is-busy');
      else if (detail.phase === 'success') button.classList.add('is-ok');
      else if (detail.phase === 'warning') button.classList.add('is-warn');
      else if (detail.phase === 'error') button.classList.add('is-error');
    });
  }

`;
  if (!text.includes('function initDiscordButtonStatusBridge()')) {
    if (!text.includes(initMarker)) throw new Error(`initAll marker missing in ${file}`);
    text = text.replace(initMarker, bridge + initMarker);
  }
  text = text.replace("  function initAll() {\n    checkStatus();", "  function initAll() {\n    initDiscordButtonStatusBridge();\n    checkStatus();");
  fs.writeFileSync(file, text);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('central Discord button bridge consumes warning exactly once',()=>{
  assert.ok(root.includes('function initDiscordButtonStatusBridge()'));
  assert.ok(root.includes('window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__'));
  assert.ok(root.includes("button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');"));
  assert.ok(root.includes("else if (detail.phase === 'warning') button.classList.add('is-warn');"));
  assert.ok(root.includes('initDiscordButtonStatusBridge();'));
});
test('warning class has a distinct visual state',()=>{
  assert.ok(root.includes('#discordBtn.is-warn'));
  assert.ok(root.includes('color:#ffc857!important'));
});
`;
fs.writeFileSync('tests/discord-blocks-500-1000-status-bridge.test.mjs', test);
