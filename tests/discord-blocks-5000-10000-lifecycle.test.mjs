import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('button result states expire while sending remains active',()=>{
  assert.ok(root.includes('var statusResetTimer = 0;'));
  assert.ok(root.includes("phase === 'success' ? 5000 : 8000"));
  assert.ok(root.includes("if (phase !== 'sending')"));
});
test('page lifecycle suspends and resumes runtime timers',()=>{
  assert.ok(root.includes('function suspendRuntime()'));
  assert.ok(root.includes('function resumeRuntime()'));
  assert.ok(root.includes("window.addEventListener('pagehide', suspendRuntime)"));
  assert.ok(root.includes("window.addEventListener('pageshow', function () { resumeRuntime(); })"));
});
test('watcher and visual bridge honor lifecycle suspension',()=>{
  assert.ok(root.includes('if (lifecycleSuspended) return;'));
  assert.ok(root.includes('if (!lifecycleSuspended) scheduleWatcher'));
});
test('script success cache clears and missing client gets one fresh retry',()=>{
  assert.ok(root.includes('delete scriptLoads[id];'));
  assert.ok(root.includes('var stale = document.getElementById(id);'));
  assert.ok(root.includes('await loadScriptOnce(id, src);'));
});
