import fs from 'node:fs';

const files = ['js/addons/discord-player-addon-v3.js', 'public/js/addons/discord-player-addon-v3.js'];

const oldFetch = `  function fetchWithTimeout(url, options, timeoutMs) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = 0;
    var requestOptions = Object.assign({}, options || {});
    if (controller) {
      requestOptions.signal = controller.signal;
      timer = setTimeout(function () { controller.abort(); }, timeoutMs || REQUEST_TIMEOUT_MS);
    }
    return fetch(url, requestOptions).catch(function (error) {
      if (error && error.name === 'AbortError') throw new Error('discord_request_timeout');
      throw error;
    }).finally(function () { if (timer) clearTimeout(timer); });
  }`;

const newFetch = `  function fetchWithTimeout(url, options, timeoutMs) {
    var limit = timeoutMs || REQUEST_TIMEOUT_MS;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var requestOptions = Object.assign({}, options || {});
    var timer = 0;
    var settled = false;
    if (controller) requestOptions.signal = controller.signal;
    return new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (controller) controller.abort();
        reject(new Error('discord_request_timeout'));
      }, limit);
      fetch(url, requestOptions).then(function (response) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(response);
      }).catch(function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error && error.name === 'AbortError') reject(new Error('discord_request_timeout'));
        else reject(error);
      });
    });
  }`;

const oldLoad = `  function loadScriptOnce(id, src) {
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

const newLoad = `  function loadScriptOnce(id, src) {
    if (scriptLoads[id]) return scriptLoads[id];
    scriptLoads[id] = new Promise(function (resolve, reject) {
      var script = document.getElementById(id);
      var settled = false;
      var timeout = 0;
      function cleanup() {
        clearTimeout(timeout);
        if (!script) return;
        script.removeEventListener('load', done);
        script.removeEventListener('error', failed);
      }
      function removeBrokenScript() {
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
      function done() {
        if (settled) return;
        settled = true;
        cleanup();
        if (script) script.dataset.s666Loaded = '1';
        resolve();
      }
      function failed() {
        if (settled) return;
        settled = true;
        cleanup();
        removeBrokenScript();
        delete scriptLoads[id];
        reject(new Error('script_load_failed:' + src));
      }
      function timedOut() {
        if (settled) return;
        settled = true;
        cleanup();
        removeBrokenScript();
        delete scriptLoads[id];
        reject(new Error('script_load_timeout:' + src));
      }
      if (script && (script.dataset.s666Loaded === '1' || script.readyState === 'loaded' || script.readyState === 'complete')) return done();
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
      }
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', failed, { once: true });
      timeout = setTimeout(timedOut, REQUEST_TIMEOUT_MS);
    });
    return scriptLoads[id];
  }`;

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(oldFetch)) throw new Error(`fetchWithTimeout marker missing in ${file}`);
  if (!text.includes(oldLoad)) throw new Error(`loadScriptOnce marker missing in ${file}`);
  text = text.replace(oldFetch, newFetch).replace(oldLoad, newLoad);
  fs.writeFileSync(file, text);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('fetch timeout works even without AbortController',()=>{
  assert.ok(root.includes("reject(new Error('discord_request_timeout'))"));
  assert.ok(root.includes('return new Promise(function (resolve, reject)'));
  assert.ok(root.includes('if (controller) controller.abort();'));
});
test('failed scripts are removed and retry registry is cleared',()=>{
  assert.ok(root.includes('function removeBrokenScript()'));
  assert.ok(root.includes('script.parentNode.removeChild(script)'));
  assert.ok(root.includes('delete scriptLoads[id];'));
});
test('script listeners are cleaned on success failure and timeout',()=>{
  assert.ok(root.includes("script.removeEventListener('load', done)"));
  assert.ok(root.includes("script.removeEventListener('error', failed)"));
  assert.ok(root.includes('timeout = setTimeout(timedOut, REQUEST_TIMEOUT_MS);'));
});
`;
fs.writeFileSync('tests/discord-blocks-3000-5000-load-timeout.test.mjs', test);
