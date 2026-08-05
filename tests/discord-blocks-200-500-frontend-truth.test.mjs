// CI retrigger after self-cleanup; runtime files unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord frontend addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('partial worker truth becomes a frontend warning',()=>{
  assert.ok(root.includes("warning: false"));
  assert.ok(root.includes("data.partial === true || data.led === 'warning'"));
  assert.ok(root.includes("phase: summary.warning ? 'warning' : 'success'"));
});
test('Discord overlays render partial delivery as warning',()=>{
  assert.ok(root.includes("summary.warning ? 'warn' : 'ok'"));
  assert.ok(root.includes("summary.skipped || summary.warning ? 'warn'"));
});
test('track watcher commits the key only after a successful request',()=>{
  const block=root.slice(root.indexOf('function scheduleWatcher'),root.indexOf('function loadScriptOnce'));
  const requestPos=block.indexOf("await postTrackIfChanged(false, 'watcher-track-change')");
  const commitPos=block.indexOf('lastTrackKey = current;');
  assert.ok(requestPos >= 0 && commitPos > requestPos);
});
