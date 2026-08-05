import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('active fetch controllers are released and physically aborted on suspend',()=>{
  assert.ok(root.includes('var activeFetchControllers = Object.create(null);'));
  assert.ok(root.includes('function releaseFetchController(controllerId, entry)'));
  assert.ok(root.includes('function abortActiveFetches()'));
  assert.ok(root.includes('activeFetchControllers[controllerId] = entry;'));
  const start=root.indexOf('  function suspendRuntime()');
  const end=root.indexOf('  function resumeRuntime()',start);
  const block=root.slice(start,end);
  assert.ok(block.includes('lifecycleSuspended = true;'));
  assert.ok(block.includes('abortActiveFetches();'));
  assert.ok(block.indexOf('lifecycleSuspended = true;') < block.indexOf('abortActiveFetches();'));
  assert.ok(root.includes("var controller = typeof AbortController === 'function' ? new AbortController() : null;"));
});
test('pending addon script loads are cancellable and lifecycle-owned',()=>{
  assert.ok(root.includes('function cancelPendingScriptLoads()'));
  assert.ok(root.includes("entry && typeof entry.cancel === 'function'"));
  assert.ok(root.includes('entry.createdByAddon = true;'));
  assert.ok(root.includes('if (entry.createdByAddon && script && script.parentNode) script.parentNode.removeChild(script);'));
  assert.ok(root.includes('clearScriptLoadEntry(id, entry);'));
  assert.ok(root.includes('cancelPendingScriptLoads();'));
});
test('player alert load ownership cannot clear a newer promise',()=>{
  assert.ok(root.includes('var loadPromise = (async function ()'));
  assert.ok(root.includes('playerAlertClientLoad = loadPromise;'));
  assert.ok(root.includes('if (playerAlertClientLoad === loadPromise) playerAlertClientLoad = null;'));
  assert.ok(root.includes('playerAlertClientLoad = null;\n    messengerOverlayClientLoad = null;\n    activeRequestId = 0;'));
});
test('cloned or remounted controls are rebound using non-cloned ownership markers',()=>{
  assert.ok(root.includes('button.__s666VelunaMessengerBound !== true'));
  assert.ok(root.includes('button.__s666VelunaMessengerBound = true;'));
  assert.ok(root.includes('button.__s666NoAuthDiscordBound === true'));
  assert.ok(root.includes('button.__s666NoAuthDiscordBound = true;'));
  assert.ok(root.includes("discordButton.closest('.tool-strip')"));
  assert.ok(root.includes('if (button.parentNode !== toolStrip)'));
  assert.ok(root.includes("button.addEventListener('click', openVelunaMessengerFromButton);"));
});
test('late mountAll and visual reconciliation restore bridge and busy authority',()=>{
  assert.ok(root.includes('function syncMountedBusyState()'));
  assert.ok(root.includes('function reconcileMountedControls()'));
  assert.ok(root.includes('mountVelunaMessengerButton();\n    installVelunaDiscordNoAuthBypass();\n    reconcileDiscordMessageOverlay();\n    syncMountedBusyState();'));
  assert.ok(root.includes('mountAll: function () { initVelunaMessengerBridge(); initSharedVisualBridge(); reconcileMountedControls(); return true; }'));
  const initStart=root.indexOf('  function initVelunaMessengerBridge()');
  const toolStripCheck=root.indexOf("if (!document.querySelector('.tool-strip')) return;",initStart);
  const listenerInstall=root.indexOf("window.addEventListener('s666:veluna-messenger-state'",initStart);
  assert.ok(initStart>=0&&listenerInstall>initStart&&toolStripCheck>listenerInstall);
});
test('reopened or remounted Discord overlay preserves active send truth',()=>{
  assert.ok(root.includes('var overlayBusy = Boolean(activeDiscordOverlaySendId || activeRequestId);'));
  assert.ok(root.includes('setDiscordOverlayButtonsDisabled(overlayBusy);'));
  assert.ok(root.includes("overlayBusy ? 'Discord verarbeitet bereits einen Versand …' : 'Bereit'"));
});
test('successful sends clear only the exact submitted draft revision',()=>{
  assert.ok(root.includes("var inputSnapshot = String(input && input.value || '');"));
  assert.ok(root.includes('var inputRevision = discordDraftRevision;'));
  assert.ok(root.includes('discordDraftRevision === inputRevision && discordDraftState === inputSnapshot'));
  assert.ok(root.includes("if (currentInput && currentInput.value === inputSnapshot) currentInput.value = '';"));
  assert.ok(root.includes("count.textContent = String(currentInput.value.length) + ' / ' + MSG_MAX"));
});
test('network, endpoint and protected audio contracts remain unchanged',()=>{
  assert.ok(root.includes("postJson('/api/discord/message'"));
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.equal(/AudioContext|webkitAudioContext|createMediaElementSource/.test(root),false);
});
// final required-gate retrigger after self-clean
