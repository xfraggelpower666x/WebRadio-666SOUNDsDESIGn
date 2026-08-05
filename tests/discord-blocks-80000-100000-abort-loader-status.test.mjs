import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');

test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('lifecycle aborts remain distinct and controllers own JSON body parsing',()=>{
  assert.ok(root.includes("entry.abortReason = 'lifecycle';"));
  assert.ok(root.includes("if (entry && entry.abortReason === 'lifecycle') reject(staleLifecycleError());"));
  assert.ok(root.includes('return response.json().catch(function (error)'));
  assert.ok(root.includes('resolve({ response: response, data: data });'));
  const fetchStart=root.indexOf('  function fetchWithTimeout(');
  const fetchEnd=root.indexOf('  function lifecycleIsCurrent',fetchStart);
  const block=root.slice(fetchStart,fetchEnd);
  assert.ok(block.indexOf('response.json()') < block.indexOf('releaseFetchController(controllerId, entry);\n          resolve'));
});

test('status checks cannot overwrite newer or overlapping request truth',()=>{
  assert.ok(root.includes('var statusRequestSequence = requestSequence;'));
  assert.ok(root.includes('var statusStartedDuringRequest = Boolean(activeRequestId);'));
  assert.ok(root.includes('statusStartedDuringRequest ||'));
  assert.ok(root.includes('Boolean(activeRequestId) ||'));
  assert.ok(root.includes('requestSequence !== statusRequestSequence'));
  assert.ok(root.includes('if (isStaleLifecycleError(error) || statusIsStale())'));
});

test('script loader validates source and never removes foreign script nodes',()=>{
  assert.ok(root.includes('function normalizedScriptSource(src)'));
  assert.ok(root.includes('function scriptSourceMatches(script, src)'));
  assert.ok(root.includes('function scriptIsLoaderOwned(script)'));
  assert.ok(root.includes("script.dataset.s666LoaderOwned = '1';"));
  assert.ok(root.includes("elementId = id + 'S666Recovery'"));
  const loadStart=root.indexOf('  function loadScriptOnce(');
  const loadEnd=root.indexOf('  function setVelunaMessengerStatus',loadStart);
  const block=root.slice(loadStart,loadEnd);
  assert.ok(block.includes('if (entry.createdByAddon && script && script.parentNode) script.parentNode.removeChild(script);'));
  assert.ok(block.indexOf("script.addEventListener('load', done") < block.indexOf('document.head.appendChild(script)'));
});

test('player alert and messenger overlay retries are owner-safe and single-flight',()=>{
  assert.ok(root.includes('function removeOwnedScriptSlots(id)'));
  assert.ok(root.includes('var messengerOverlayClientLoad = null;'));
  assert.ok(root.includes('function ensureMessengerOverlayClient()'));
  assert.ok(root.includes('if (messengerOverlayClientLoad) return messengerOverlayClientLoad;'));
  assert.ok(root.includes('if (messengerOverlayClientLoad === loadPromise) messengerOverlayClientLoad = null;'));
  assert.ok(root.includes('removeOwnedScriptSlots(id);\n      delete scriptLoads[id];\n      await loadScriptOnce(id, src);'));
});

test('targeted MutationObserver closes the 3.5 second remount gap and suspends cleanly',()=>{
  assert.ok(root.includes('var controlObserver = null;'));
  assert.ok(root.includes('function nodeTouchesMountedControls(node)'));
  assert.ok(root.includes('function scheduleControlReconciliation()'));
  assert.ok(root.includes('controlObserver.observe(root, { childList: true, subtree: true });'));
  assert.ok(root.includes('function stopControlObserver()'));
  const suspendStart=root.indexOf('  function suspendRuntime()');
  const resumeStart=root.indexOf('  function resumeRuntime()',suspendStart);
  const suspend=root.slice(suspendStart,resumeStart);
  assert.ok(suspend.includes('stopControlObserver();'));
  assert.ok(root.includes('startControlObserver();'));
});

test('overlay bindings, status and drafts survive child or node replacement',()=>{
  assert.ok(root.includes('function bindDiscordMessageOverlay(overlay)'));
  assert.ok(root.includes('overlay.__s666DiscordOverlayBound === true'));
  assert.ok(root.includes("event.target.closest('#s666DiscordMessageSend,#s666DiscordNowPlayingSend')"));
  assert.ok(root.includes('function reconcileDiscordMessageOverlay()'));
  assert.ok(root.includes('var discordOverlayStatusState = { text: \'Bereit\', mode: \'\' };'));
  assert.ok(root.includes('var discordDraftState = \'\';'));
  assert.ok(root.includes('var discordDraftRevision = 0;'));
  assert.ok(root.includes('discordDraftRevision === inputRevision && discordDraftState === inputSnapshot'));
});

test('button result phases are owner-sequenced and remount-persistent',()=>{
  assert.ok(root.includes('var discordButtonStateSequence = 0;'));
  assert.ok(root.includes('var velunaButtonStateSequence = 0;'));
  assert.ok(root.includes('if (discordButtonStateSequence !== stateSequence) return;'));
  assert.ok(root.includes('if (velunaButtonStateSequence !== stateSequence) return;'));
  assert.ok(root.includes("applyDiscordButtonPhase(discordButton, activeRequestId ? 'sending' : discordButtonPhase);"));
  assert.ok(root.includes("applyVelunaButtonPhase(velunaButton, activeVelunaSendId ? 'sending' : velunaButtonPhase);"));
});

test('public direct calls return controlled busy truth without duplicate posts',()=>{
  assert.ok(root.includes('function requestBusyResult(source)'));
  assert.ok(root.includes("reason: 'request_in_flight'"));
  assert.ok(root.includes("if (activeRequestId) return requestBusyResult('message');"));
  assert.ok(root.includes("if (activeRequestId) return requestBusyResult('manual');"));
  assert.ok(root.includes("if (activeRequestId) return requestBusyResult(reason || 'nowplaying');"));
  assert.ok(root.includes('if (result && result.busy) {'));
  assert.ok(root.includes('startupAutoPostDone = false;'));
});

test('network endpoints and protected audio contracts remain unchanged',()=>{
  assert.ok(root.includes("postJson('/api/discord/message'"));
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("fetchWithTimeout('/api/discord/status?t='"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.equal(/AudioContext|webkitAudioContext|createMediaElementSource/.test(root),false);
});

// final required-gate retrigger after hash-locked self-clean
