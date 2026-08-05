import fs from 'node:fs';

const files = [
  'js/addons/discord-player-addon-v3.js',
  'public/js/addons/discord-player-addon-v3.js'
];

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');

  source = source.replace(
    "  var statusResetTimer = 0;\n  var scriptLoads = Object.create(null);",
    "  var statusResetTimer = 0;\n  var playerAlertClientLoad = null;\n  var scriptLoads = Object.create(null);"
  );

  const oldEnsure = `  async function ensurePlayerAlertClient() {
    var id = 's666PlayerAlertClientVelunaBridge';
    var src = '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121';
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    await loadScriptOnce(id, src);
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    var stale = document.getElementById(id);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    delete scriptLoads[id];
    await loadScriptOnce(id, src);
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    throw new Error('player_alert_client_missing');
  }`;

  const newEnsure = `  function ensurePlayerAlertClient() {
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return Promise.resolve(window.S666PlayerAlertClient);
    if (playerAlertClientLoad) return playerAlertClientLoad;
    playerAlertClientLoad = (async function () {
      var id = 's666PlayerAlertClientVelunaBridge';
      var src = '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121';
      await loadScriptOnce(id, src);
      if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
      var stale = document.getElementById(id);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      delete scriptLoads[id];
      await loadScriptOnce(id, src);
      if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
      throw new Error('player_alert_client_missing');
    })().finally(function () { playerAlertClientLoad = null; });
    return playerAlertClientLoad;
  }`;

  if (!source.includes(oldEnsure)) throw new Error(`${file}: ensurePlayerAlertClient block not found`);
  source = source.replace(oldEnsure, newEnsure);

  const oldSuspend = `  function suspendRuntime() {
    lifecycleSuspended = true;
    clearTimeout(watcherTimer);
    clearTimeout(startupTimer);
    clearInterval(visualTimer);
    watcherTimer = 0;
    startupTimer = 0;
    visualTimer = 0;
  }

  function resumeRuntime() {
    if (!initialized) return;
    lifecycleSuspended = false;`;

  const newSuspend = `  function suspendRuntime() {
    lifecycleSuspended = true;
    clearTimeout(watcherTimer);
    clearTimeout(startupTimer);
    clearTimeout(statusResetTimer);
    clearInterval(visualTimer);
    watcherTimer = 0;
    startupTimer = 0;
    statusResetTimer = 0;
    visualTimer = 0;
  }

  function resumeRuntime() {
    if (!initialized || !lifecycleSuspended) return;
    lifecycleSuspended = false;`;

  if (!source.includes(oldSuspend)) throw new Error(`${file}: lifecycle block not found`);
  source = source.replace(oldSuspend, newSuspend);

  fs.writeFileSync(file, source);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('resume runs only after a real lifecycle suspension',()=>{
  assert.ok(root.includes('if (!initialized || !lifecycleSuspended) return;'));
  assert.ok(root.includes("window.addEventListener('pageshow', function () { resumeRuntime(); })"));
});
test('suspend clears stale button reset timers',()=>{
  assert.ok(root.includes('clearTimeout(statusResetTimer);'));
  assert.ok(root.includes('statusResetTimer = 0;'));
});
test('player alert recovery is single-flight across parallel callers',()=>{
  assert.ok(root.includes('var playerAlertClientLoad = null;'));
  assert.ok(root.includes('if (playerAlertClientLoad) return playerAlertClientLoad;'));
  assert.ok(root.includes('playerAlertClientLoad = (async function ()'));
  assert.ok(root.includes('playerAlertClientLoad = null;'));
});
`;
fs.writeFileSync('tests/discord-blocks-10000-20000-resume-recovery.test.mjs', test);
