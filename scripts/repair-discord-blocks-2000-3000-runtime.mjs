import fs from 'node:fs';

const files = ['js/addons/discord-player-addon-v3.js', 'public/js/addons/discord-player-addon-v3.js'];
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');

  text = text.replace(
    "  var initialized = false;\n  var MSG_MAX = 240;",
    "  var initialized = false;\n  var watcherRunning = false;\n  var scriptLoads = Object.create(null);\n  var REQUEST_TIMEOUT_MS = 15000;\n  var STATUS_TIMEOUT_MS = 10000;\n  var MSG_MAX = 240;"
  );

  text = text.replace(
    "  async function postJson(path, payload) {",
    "  function fetchWithTimeout(url, options, timeoutMs) {\n    var controller = typeof AbortController === 'function' ? new AbortController() : null;\n    var timer = 0;\n    var requestOptions = Object.assign({}, options || {});\n    if (controller) {\n      requestOptions.signal = controller.signal;\n      timer = setTimeout(function () { controller.abort(); }, timeoutMs || REQUEST_TIMEOUT_MS);\n    }\n    return fetch(url, requestOptions).catch(function (error) {\n      if (error && error.name === 'AbortError') throw new Error('discord_request_timeout');\n      throw error;\n    }).finally(function () { if (timer) clearTimeout(timer); });\n  }\n\n  async function postJson(path, payload) {"
  );

  text = text.replace(
    "      var response = await fetch(path, {",
    "      var response = await fetchWithTimeout(path, {"
  );
  text = text.replace(
    "        body: JSON.stringify(payload || {})\n      });",
    "        body: JSON.stringify(payload || {})\n      }, REQUEST_TIMEOUT_MS);"
  );

  const oldWatcher = `  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = setTimeout(async function () {
      var current = trackKey(readTrackFromDom());
      if (current && current !== lastTrackKey) {
        try {
          var result = await postTrackIfChanged(false, 'watcher-track-change');
          if (result && result.ok === true) lastTrackKey = current;
        } catch (_) {}
      }
      scheduleWatcher(document.hidden ? 30000 : 8000);
    }, delay);
  }`;
  const newWatcher = `  function scheduleWatcher(delay) {
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
  }`;
  if (!text.includes(oldWatcher)) throw new Error(`Watcher marker missing in ${file}`);
  text = text.replace(oldWatcher, newWatcher);

  const oldLoader = `  function loadScriptOnce(id, src) {
    return new Promise(function (resolve, reject) {
      if (document.getElementById(id)) return resolve();
      var script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('script_load_failed:' + src)); };
      document.head.appendChild(script);
    });
  }`;
  const newLoader = `  function loadScriptOnce(id, src) {
    if (scriptLoads[id]) return scriptLoads[id];
    scriptLoads[id] = new Promise(function (resolve, reject) {
      var script = document.getElementById(id);
      var timeout = setTimeout(function () {
        delete scriptLoads[id];
        reject(new Error('script_load_timeout:' + src));
      }, REQUEST_TIMEOUT_MS);
      function done() {
        clearTimeout(timeout);
        if (script) script.dataset.s666Loaded = '1';
        resolve();
      }
      function failed() {
        clearTimeout(timeout);
        delete scriptLoads[id];
        reject(new Error('script_load_failed:' + src));
      }
      if (script) {
        if (script.dataset.s666Loaded === '1' || script.readyState === 'loaded' || script.readyState === 'complete') return done();
        script.addEventListener('load', done, { once: true });
        script.addEventListener('error', failed, { once: true });
        return;
      }
      script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', failed, { once: true });
      document.head.appendChild(script);
    });
    return scriptLoads[id];
  }`;
  if (!text.includes(oldLoader)) throw new Error(`Script loader marker missing in ${file}`);
  text = text.replace(oldLoader, newLoader);

  text = text.replace(
    "      var response = await fetch('/api/discord/status?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });",
    "      var response = await fetchWithTimeout('/api/discord/status?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } }, STATUS_TIMEOUT_MS);"
  );

  for (const marker of ['var watcherRunning = false;', 'function fetchWithTimeout(', 'if (scriptLoads[id]) return scriptLoads[id];', 'STATUS_TIMEOUT_MS);']) {
    if (!text.includes(marker)) throw new Error(`Missing ${marker} in ${file}`);
  }
  fs.writeFileSync(file, text);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('Discord requests and status checks have bounded timeouts',()=>{
  assert.ok(root.includes('function fetchWithTimeout('));
  assert.ok(root.includes('REQUEST_TIMEOUT_MS = 15000'));
  assert.ok(root.includes('STATUS_TIMEOUT_MS = 10000'));
  assert.ok(root.includes("throw new Error('discord_request_timeout')"));
});
test('watcher is single-flight across visibility reschedules',()=>{
  assert.ok(root.includes('var watcherRunning = false;'));
  assert.ok(root.includes('if (watcherRunning) {'));
  assert.ok(root.includes('watcherRunning = true;'));
  assert.ok(root.includes('watcherRunning = false;'));
});
test('script loads share one pending promise and wait for real load',()=>{
  assert.ok(root.includes('var scriptLoads = Object.create(null);'));
  assert.ok(root.includes('if (scriptLoads[id]) return scriptLoads[id];'));
  assert.ok(root.includes("script.addEventListener('load', done, { once: true })"));
  assert.ok(root.includes("script_load_timeout:"));
});
`;
fs.writeFileSync('tests/discord-blocks-2000-3000-runtime.test.mjs', test);
