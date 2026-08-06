import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const discord = read('js/addons/discord-player-addon-v3.js');
const discordMirror = read('public/js/addons/discord-player-addon-v3.js');
const messenger = read('js/messenger-overlay.js');
const messengerMirror = read('public/js/messenger-overlay.js');
const playerAlert = read('js/player-alert-client.js');
const playerAlertMirror = read('public/js/player-alert-client.js');

test('complete repair keeps every runtime mirror byte-identical', () => {
  assert.equal(discord, discordMirror);
  assert.equal(messenger, messengerMirror);
  assert.equal(playerAlert, playerAlertMirror);
});

test('Discord lifecycle cancellation owns timeout even without AbortController', () => {
  const start = discord.indexOf('  function fetchWithTimeout(');
  const end = discord.indexOf('  function lifecycleIsCurrent', start);
  const block = discord.slice(start, end);
  assert.match(block, /var controllerId = \+\+fetchControllerSequence;/);
  assert.match(block, /var entry = \{ controller: controller, abortReason: '', cancel: null \};/);
  assert.match(block, /activeFetchControllers\[controllerId\] = entry;/);
  assert.match(block, /if \(controller\) requestOptions\.signal = controller\.signal;/);
  assert.match(block, /entry\.cancel = cancelRequest;/);
  assert.match(block, /timer = setTimeout\(function \(\) \{ cancelRequest\('timeout'\); \}, limit\);/);
  assert.match(block, /try \{\s*fetchPromise = fetch\(url, requestOptions\);/);
  assert.match(block, /function cleanup\(\) \{\s*clearTimeout\(timer\);\s*releaseFetchController\(controllerId, entry\);/);
});

test('Discord loader owns pending source identity and base URI truth', () => {
  assert.match(discord, /var requestedSource = normalizedScriptSource\(src\);/);
  assert.match(discord, /pending\.source === requestedSource/);
  assert.match(discord, /pending\.cancel\(new Error\('script_source_changed:' \+ id\)\)/);
  assert.match(discord, /var currentSource = script\.src \|\| script\.getAttribute\('src'\) \|\| '';/);
  assert.match(discord, /source: requestedSource/);
  assert.match(discord, /forceRecovery: Boolean\(forceRecovery\)/);
  assert.equal(discord.includes('for (var i = 1; i <= 8; i += 1)'), false);
  assert.match(discord, /Array\.prototype\.slice\.call\(document\.getElementsByTagName\('script'\)\)/);
  assert.equal((discord.match(/loadScriptOnce\(id, src, true\)/g) || []).length, 2);
});

test('Messenger overlay is clone-safe and existing trigger buttons are rebound', () => {
  assert.match(messenger, /overlay\.__s666MessengerOverlayBound !== true/);
  assert.match(messenger, /overlay\.__s666MessengerOverlayBound = true/);
  assert.doesNotMatch(messenger, /overlay\.dataset\.bound === '1'/);
  assert.match(messenger, /button\.__s666MessengerTriggerBound !== true/);
  assert.match(messenger, /button\.__s666MessengerTriggerBound = true/);
  const mountStart = messenger.indexOf('  function mountTrigger()');
  const reconcileStart = messenger.indexOf('  function reconcileMessengerRuntime()', mountStart);
  const mount = messenger.slice(mountStart, reconcileStart);
  assert.ok(mount.indexOf("if (!button) {") < mount.indexOf('if (button.__s666MessengerTriggerBound !== true)'));
});

test('Messenger send is one owner and preserves a newer draft', () => {
  assert.match(messenger, /var activeSendId = 0;/);
  assert.match(messenger, /if \(activeSendId\) return Promise\.resolve\(false\);/);
  assert.match(messenger, /var sendId = \+\+sendSequence;/);
  assert.match(messenger, /if \(activeSendId !== sendId\) return false;/);
  assert.match(messenger, /draftRevision === inputRevision && draftState === inputSnapshot/);
  assert.match(messenger, /if \(currentTextarea && currentTextarea\.value === inputSnapshot\) currentTextarea\.value = '';/);
  assert.match(messenger, /if \(activeSendId === sendId\) activeSendId = 0;/);
  assert.match(messenger, /currentButton\.disabled = Boolean\(activeSendId\)/);
});

test('Messenger observer survives body replacement and remains single', () => {
  assert.match(messenger, /var root = document && typeof document\.nodeType === 'number' \? document : document\.body;/);
  assert.match(messenger, /observer\.observe\(root, \{ childList: true, subtree: true \}\);/);
  assert.match(messenger, /if \(mountTimer\) return;/);
  assert.match(messenger, /function stopObserver\(\)/);
  assert.match(messenger, /window\.addEventListener\('pagehide', stopObserver\);/);
  assert.match(messenger, /window\.addEventListener\('pageshow', function \(\) \{ reconcileMessengerRuntime\(\); startObserver\(\); \}\);/);
});

test('Player Alert timeout works without AbortController and cleans sync throws', () => {
  const start = playerAlert.indexOf('  function requestJson(');
  const end = playerAlert.indexOf('  function send', start);
  const block = playerAlert.slice(start, end);
  assert.match(block, /return new Promise\(function \(resolve, reject\) \{/);
  assert.match(block, /timer = setTimeout\(function \(\) \{/);
  assert.match(block, /fail\(timeoutError\(\)\);/);
  assert.match(block, /error\.name = 'AbortError';/);
  assert.match(block, /try \{\s*fetchPromise = fetch\(url, options\);/);
  assert.match(block, /Promise\.resolve\(fetchPromise\)/);
  assert.equal(block.includes('if (controller) controller.abort(); }, timeoutMs'), false);
});

test('Player Alert polling is owner-sequenced and BFCache aware', () => {
  assert.match(playerAlert, /pollInFlight: false, pollSequence: 0/);
  assert.match(playerAlert, /if \(state\.stopped \|\| state\.pollInFlight\) return;/);
  assert.match(playerAlert, /var pollId = \+\+state\.pollSequence;/);
  assert.match(playerAlert, /if \(state\.stopped \|\| pollId !== state\.pollSequence\) return;/);
  assert.match(playerAlert, /if \(pollId !== state\.pollSequence\) return;/);
  assert.match(playerAlert, /window\.addEventListener\('pagehide', stopPolling\);/);
  assert.match(playerAlert, /window\.addEventListener\('pageshow', startPolling\);/);
});

test('Player Alert receive overlay rebinds cloned nodes', () => {
  assert.match(playerAlert, /function bindReceiveOverlay\(backdrop\)/);
  assert.match(playerAlert, /backdrop\.__s666PlayerAlertReceiveBound === true/);
  assert.match(playerAlert, /backdrop\.__s666PlayerAlertReceiveBound = true/);
  assert.match(playerAlert, /bindReceiveOverlay\(backdrop\);/);
});

test('complete repair leaves endpoints and protected audio contracts untouched', () => {
  for (const endpoint of ['/api/discord/message', '/api/discord/nowplaying', '/api/discord/manual', '/api/discord/status', '/api/player-alert/send']) {
    assert.ok(discord.includes(endpoint) || playerAlert.includes(endpoint), endpoint);
  }
  assert.match(playerAlert, /requestJson\('\/api\/player-alert\/' \+ path \+ '\?t='/);
  for (const source of [discord, messenger, playerAlert]) {
    assert.doesNotMatch(source, /AudioContext|webkitAudioContext|createMediaElementSource|GainNode|BiquadFilterNode/);
  }
  assert.match(discord, /credentials: 'same-origin'/);
  assert.match(playerAlert, /credentials: 'same-origin'/);
});
