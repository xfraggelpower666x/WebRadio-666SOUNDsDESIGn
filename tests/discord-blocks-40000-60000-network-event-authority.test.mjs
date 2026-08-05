// CI retrigger after self-cleaning repair commit; runtime files unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');

test('Discord addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('Discord overlay sends share one single-flight authority',()=>{
  assert.ok(root.includes('var activeDiscordOverlaySendId = 0;'));
  assert.ok(root.includes('if (activeDiscordOverlaySendId) return;'));
  assert.ok(root.includes('if (activeRequestId) {'));
  assert.ok(root.indexOf('if (activeDiscordOverlaySendId) return;') < root.indexOf('if (activeRequestId) {', root.indexOf('  async function sendMessageFromOverlay()')));
  assert.ok(root.includes('setDiscordOverlayButtonsDisabled(true);'));
  assert.ok(root.includes('if (activeDiscordOverlaySendId === sendId) activeDiscordOverlaySendId = 0;'));
  assert.ok(root.includes('if (!lifecycleIsCurrent(sendLifecycle) || activeDiscordOverlaySendId !== sendId) return;'));
});

test('both overlay send controls stay disabled until the owning send settles',()=>{
  const start=root.indexOf('  function setDiscordOverlayButtonsDisabled(disabled)');
  const end=root.indexOf('  function scheduleDiscordOverlayFocus',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.includes("['s666DiscordMessageSend', 's666DiscordNowPlayingSend']"));
  assert.ok(block.includes('currentButton.disabled = Boolean(disabled)'));
});

test('background status failure cannot overwrite an active send state',()=>{
  const start=root.indexOf('  function initDiscordButtonStatusBridge()');
  const end=root.indexOf('  function resetTransientRuntimeState()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.includes("if (phase === 'status')"));
  assert.ok(block.includes('if (activeRequestId) return;'));
  assert.ok(block.indexOf('if (activeRequestId) return;') < block.indexOf("phase = 'error';"));
});

test('overlay focus targets only the current visible lifecycle and returns safely',()=>{
  assert.ok(root.includes('var discordOverlayFocusTimer = 0;'));
  assert.ok(root.includes('var discordOverlayReturnFocus = null;'));
  assert.ok(root.includes("!currentOverlay || currentOverlay.classList.contains('s666-discord-gate--hidden')"));
  assert.ok(root.includes('currentInput && currentOverlay.contains(currentInput)'));
  assert.ok(root.includes('previous.isConnected === false'));
  assert.ok(root.includes('scheduleDiscordOverlayFocus(0);'));
});

test('suspend invalidates overlay ownership and pending focus work',()=>{
  const start=root.indexOf('  function suspendRuntime()');
  const end=root.indexOf('  function resumeRuntime()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.includes('activeDiscordOverlaySendId = 0;'));
  assert.ok(block.includes('discordOverlaySendSequence += 1;'));
  assert.ok(block.includes('clearTimeout(discordOverlayFocusTimer);'));
  assert.ok(block.includes('resetTransientRuntimeState();'));
});

test('network and protected subsystem contracts remain unchanged',()=>{
  assert.ok(root.includes("postJson('/api/discord/message'"));
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.ok(root.includes("var controller = typeof AbortController === 'function' ? new AbortController() : null;"));
  assert.equal(/AudioContext|webkitAudioContext|createMediaElementSource/.test(root),false);
});
