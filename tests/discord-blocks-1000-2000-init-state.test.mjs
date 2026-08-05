import test from 'node:test';
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
