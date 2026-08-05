import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');

test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('lifecycle cancellation owns the fetch timer even when fetch ignores abort',()=>{
  assert.ok(root.includes("var entry = controller ? { controller: controller, abortReason: '', cancel: null } : null;"));
  assert.ok(root.includes("if (entry && typeof entry.cancel === 'function')"));
  assert.ok(root.includes("entry.cancel('lifecycle');"));
  assert.ok(root.includes('function cancelRequest(reason)'));
  assert.ok(root.includes('clearTimeout(timer);'));
  assert.ok(root.includes("timer = setTimeout(function () { cancelRequest('timeout'); }, limit);"));
  const abortStart=root.indexOf('  function abortActiveFetches()');
  const fetchStart=root.indexOf('  function fetchWithTimeout(',abortStart);
  const abortBlock=root.slice(abortStart,fetchStart);
  assert.ok(abortBlock.indexOf("entry.cancel('lifecycle')") < abortBlock.indexOf("entry.abortReason = 'lifecycle'"));
});

test('fetch cleanup remains owner-safe after timeout response and lifecycle cancellation',()=>{
  const fetchStart=root.indexOf('  function fetchWithTimeout(');
  const fetchEnd=root.indexOf('  function lifecycleIsCurrent',fetchStart);
  const block=root.slice(fetchStart,fetchEnd);
  assert.ok(block.includes('if (settled) return;'));
  assert.ok(block.includes('releaseFetchController(controllerId, entry);'));
  assert.ok(block.includes("if (reason === 'timeout') reject(new Error('discord_request_timeout'));"));
  assert.ok(block.includes('else reject(staleLifecycleError());'));
  assert.ok(block.includes('if (settled) return;\n          settled = true;\n          clearTimeout(timer);'));
});

test('control observer survives documentElement and body replacement with one document owner',()=>{
  assert.ok(root.includes('var controlObserverRoot = null;'));
  assert.ok(root.includes("var root = document && typeof document.nodeType === 'number' ? document"));
  assert.ok(root.includes('controlObserverRoot = root;'));
  assert.ok(root.includes('controlObserver.observe(root, { childList: true, subtree: true });'));
  const stopStart=root.indexOf('  function stopControlObserver()');
  const stopEnd=root.indexOf('  function initVelunaMessengerBridge()',stopStart);
  const stopBlock=root.slice(stopStart,stopEnd);
  assert.ok(stopBlock.includes('controlObserver.disconnect();'));
  assert.ok(stopBlock.includes('controlObserver = null;'));
  assert.ok(stopBlock.includes('controlObserverRoot = null;'));
});

test('mutation bursts remain debounced and suspend removes queued reconciliation',()=>{
  assert.ok(root.includes('if (lifecycleSuspended || controlReconcileTimer) return;'));
  assert.ok(root.includes('controlReconcileTimer = setTimeout(function ()'));
  assert.ok(root.includes('clearTimeout(controlReconcileTimer);\n    controlReconcileTimer = 0;'));
  const suspendStart=root.indexOf('  function suspendRuntime()');
  const resumeStart=root.indexOf('  function resumeRuntime()',suspendStart);
  assert.ok(root.slice(suspendStart,resumeStart).includes('stopControlObserver();'));
});

test('script source identity ignores URL fragments but preserves query identity',()=>{
  const start=root.indexOf('  function normalizedScriptSource(src)');
  const end=root.indexOf('  function scriptSourceMatches',start);
  const block=root.slice(start,end);
  assert.ok(block.includes("url.hash = '';"));
  assert.ok(block.includes("String(src || '').split('#')[0]"));
  assert.equal(block.includes('url.search ='),false);
});

test('loader still protects foreign nodes and all network contracts remain unchanged',()=>{
  assert.ok(root.includes('function scriptIsLoaderOwned(script)'));
  assert.ok(root.includes('if (entry.createdByAddon && script && script.parentNode) script.parentNode.removeChild(script);'));
  assert.ok(root.includes("postJson('/api/discord/message'"));
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("fetchWithTimeout('/api/discord/status?t='"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.equal(/AudioContext|webkitAudioContext|createMediaElementSource/.test(root),false);
});
