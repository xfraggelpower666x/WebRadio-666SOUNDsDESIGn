import test from 'node:test';
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
