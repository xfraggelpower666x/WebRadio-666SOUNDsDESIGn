import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rootPath = new URL('../js/skip-control.js', import.meta.url);
const publicPath = new URL('../public/js/skip-control.js', import.meta.url);
const workerPath = new URL('../worker.js', import.meta.url);
const audioStartPath = new URL('../js/audio-start-core.js', import.meta.url);
const publicAudioStartPath = new URL('../public/js/audio-start-core.js', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const velunaPath = new URL('../veluna/index.html', import.meta.url);

async function read(url) {
  return readFile(url, 'utf8');
}

test('Discord race guard is isolated from and preserves the authoritative skip controller', async () => {
  const root = await read(rootPath);
  const mirror = await read(publicPath);
  assert.equal(mirror, root);
  assert.match(root, /666SOUNDsDESIGn authoritative Auto-DJ skip controller/);
  assert.match(root, /window\.S666SkipControl = \{/);
  assert.match(root, /function installS666DiscordDirectSettingsRaceGuard\(global\)/);
  assert.ok(root.indexOf('installS666DiscordDirectSettingsRaceGuard') > root.indexOf('window.S666SkipControl'));
});

test('The guard loads before the Discord addon on root, VELUNA and internal player', async () => {
  const index = await read(indexPath);
  const audioStart = await read(audioStartPath);
  assert.equal(await read(publicAudioStartPath), audioStart);
  assert.ok(index.indexOf('/js/audio-start-core.js') < index.indexOf('/js/addons/discord-player-addon-v3.js'));
  assert.match(audioStart, /ensureS666DiscordGuardLoader/);
  assert.match(audioStart, /\/js\/skip-control\.js\?v=2026-08-06-discord-race-guard-v2/);
  for (const source of [await read(velunaPath), await read(workerPath)]) {
    assert.ok(source.indexOf('/js/skip-control.js') >= 0);
    assert.ok(source.indexOf('/js/addons/discord-player-addon-v3.js') >= 0);
    assert.ok(source.indexOf('/js/skip-control.js') < source.indexOf('/js/addons/discord-player-addon-v3.js'));
  }
});

test('Direct settings stay locked until the Discord response body settles', async () => {
  const root = await read(rootPath);
  assert.match(root, /function wrapResponseBody\(response, deliveredWebhook\)/);
  assert.match(root, /var bodyMethods = \['json', 'text', 'arrayBuffer', 'blob', 'formData'\]/);
  assert.match(root, /return new Proxy\(response/);
  assert.match(root, /finish\(Boolean\(target\.ok\)\)/);
  assert.match(root, /BODY_FALLBACK_MS = 18000/);
  assert.match(root, /control\.disabled = true/);
  assert.match(root, /data-s666-race-guard-disabled/);
  const bodyStart = root.indexOf('function wrapResponseBody');
  assert.ok(root.indexOf('settleDirectRequest(deliveredWebhook', bodyStart) > bodyStart);
});

test('Same-tab and cross-tab destination changes trigger a full request-window retry', async () => {
  const root = await read(rootPath);
  assert.match(root, /STORAGE_KEY = 's666_discord_direct_v1'/);
  assert.match(root, /storagePrototype\.setItem = function s666DiscordRaceGuardedSetItem/);
  assert.match(root, /global\.addEventListener\('storage'/);
  assert.match(root, /RETRY_WINDOW_MS = 18000/);
  assert.match(root, /RETRY_DELAY_MS = 250/);
  assert.match(root, /postTrackIfChanged\(true, 'settings-race-retry'\)/);
  assert.match(root, /result && result\.busy && Date\.now\(\) <= deadline/);
  assert.match(root, /currentWebhook !== deliveredWebhook/);
});

test('The guard owns only NOW PLAYING embeds and leaves text messages untouched', async () => {
  const root = await read(rootPath);
  assert.match(root, /function isNowPlayingPayload\(init\)/);
  assert.match(root, /Array\.isArray\(body\.embeds\)/);
  assert.match(root, /toUpperCase\(\) === 'NOW PLAYING'/);
  assert.match(root, /if \(!isNowPlayingPayload\(init\)\) return ''/);
  assert.doesNotMatch(root, /console\.(?:log|info|warn|error).*Webhook/i);
  assert.doesNotMatch(root, /dispatch\([^\n]*deliveredWebhook/);
});

test('Destination comparison truth table retries only a successful stale delivery', () => {
  const mustRetry = ({ accepted, changed, current, delivered }) => Boolean(
    accepted && changed && current && delivered && current !== delivered
  );
  assert.equal(mustRetry({ accepted: true, changed: true, current: 'B', delivered: 'A' }), true);
  assert.equal(mustRetry({ accepted: true, changed: true, current: 'A', delivered: 'A' }), false);
  assert.equal(mustRetry({ accepted: false, changed: true, current: 'B', delivered: 'A' }), false);
  assert.equal(mustRetry({ accepted: true, changed: false, current: 'B', delivered: 'A' }), false);
});
