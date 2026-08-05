import fs from 'node:fs';

const files = [
  'js/addons/discord-player-addon-v3.js',
  'public/js/addons/discord-player-addon-v3.js'
];

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

function patch(source) {
  source = replaceOnce(source,
`  var initialized = false;
  var watcherRunning = false;
  var scriptLoads = Object.create(null);`,
`  var initialized = false;
  var watcherRunning = false;
  var lifecycleSuspended = false;
  var statusResetTimer = 0;
  var scriptLoads = Object.create(null);`,
'variables');

  source = replaceOnce(source,
`  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = setTimeout(async function () {
      if (watcherRunning) {
        scheduleWatcher(document.hidden ? 30000 : 1500);
        return;
      }
      watcherRunning = true;
      try {
        var current = trackKey(readTrackFromDom());
        if (current && current !== lastTrackKey) {
          try {
            var result = await postTrackIfChanged(false, 'watcher-track-change');
            if (result && result.ok === true) lastTrackKey = current;
          } catch (_) {}
        }
      } finally {
        watcherRunning = false;
        scheduleWatcher(document.hidden ? 30000 : 8000);
      }
    }, delay);
  }`,
`  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = 0;
    if (lifecycleSuspended) return;
    watcherTimer = setTimeout(async function () {
      if (lifecycleSuspended) return;
      if (watcherRunning) {
        scheduleWatcher(document.hidden ? 30000 : 1500);
        return;
      }
      watcherRunning = true;
      try {
        var current = trackKey(readTrackFromDom());
        if (current && current !== lastTrackKey) {
          try {
            var result = await postTrackIfChanged(false, 'watcher-track-change');
            if (result && result.ok === true) lastTrackKey = current;
          } catch (_) {}
        }
      } finally {
        watcherRunning = false;
        if (!lifecycleSuspended) scheduleWatcher(document.hidden ? 30000 : 8000);
      }
    }, delay);
  }`,
'watcher lifecycle');

  source = replaceOnce(source,
`      function done() {
        if (settled) return;
        settled = true;
        cleanup();
        if (script) script.dataset.s666Loaded = '1';
        resolve();
      }`,
`      function done() {
        if (settled) return;
        settled = true;
        cleanup();
        if (script) script.dataset.s666Loaded = '1';
        delete scriptLoads[id];
        resolve();
      }`,
'script success registry cleanup');

  source = replaceOnce(source,
`  async function ensurePlayerAlertClient() {
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    await loadScriptOnce('s666PlayerAlertClientVelunaBridge', '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121');
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    throw new Error('player_alert_client_missing');
  }`,
`  async function ensurePlayerAlertClient() {
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
  }`,
'player alert recovery');

  source = replaceOnce(source,
`  function initSharedVisualBridge() {
    setSharedColorState('transport', 'idle');
    syncSharedColorState();
    clearInterval(visualTimer);
    visualTimer = setInterval(function () {
      syncSharedColorState();
      installVelunaDiscordNoAuthBypass();
    }, 3500);
  }`,
`  function initSharedVisualBridge() {
    setSharedColorState('transport', 'idle');
    syncSharedColorState();
    clearInterval(visualTimer);
    visualTimer = 0;
    if (lifecycleSuspended) return;
    visualTimer = setInterval(function () {
      syncSharedColorState();
      installVelunaDiscordNoAuthBypass();
    }, 3500);
  }`,
'visual lifecycle');

  source = replaceOnce(source,
`      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
      if (phase === 'sending') button.classList.add('is-busy');
      else if (phase === 'success') button.classList.add('is-ok');
      else if (phase === 'warning') button.classList.add('is-warn');
      else if (phase === 'error') button.classList.add('is-error');`,
`      clearTimeout(statusResetTimer);
      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
      if (phase === 'sending') button.classList.add('is-busy');
      else if (phase === 'success') button.classList.add('is-ok');
      else if (phase === 'warning') button.classList.add('is-warn');
      else if (phase === 'error') button.classList.add('is-error');
      if (phase !== 'sending') {
        statusResetTimer = setTimeout(function () {
          button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
        }, phase === 'success' ? 5000 : 8000);
      }`,
'button state expiry');

  source = replaceOnce(source,
`  function initAll() {
    if (initialized) return;`,
`  function suspendRuntime() {
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
    lifecycleSuspended = false;
    syncSharedColorState();
    initSharedVisualBridge();
    scheduleWatcher(1200);
    if (!startupAutoPostDone) tryStartupAutoPost();
    checkStatus();
  }

  function initAll() {
    if (initialized) return;`,
'lifecycle functions');

  source = replaceOnce(source,
`  document.addEventListener('visibilitychange', function () { scheduleWatcher(document.hidden ? 30000 : 1500); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });`,
`  document.addEventListener('visibilitychange', function () {
    if (!lifecycleSuspended) scheduleWatcher(document.hidden ? 30000 : 1500);
  });
  window.addEventListener('pagehide', suspendRuntime);
  window.addEventListener('pageshow', function () { resumeRuntime(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });`,
'lifecycle events');

  return source;
}

for (const file of files) {
  fs.writeFileSync(file, patch(fs.readFileSync(file, 'utf8')));
}

const root = fs.readFileSync(files[0], 'utf8');
const mirror = fs.readFileSync(files[1], 'utf8');
if (root !== mirror) throw new Error('addon mirrors diverged');

fs.writeFileSync('tests/discord-blocks-5000-10000-lifecycle.test.mjs', `import test from 'node:test';
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
`);
