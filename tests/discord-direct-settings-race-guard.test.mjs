import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rootPath = new URL('../js/audio-start-core.js', import.meta.url);
const publicPath = new URL('../public/js/audio-start-core.js', import.meta.url);

async function sources() {
  const root = await readFile(rootPath, 'utf8');
  const mirror = await readFile(publicPath, 'utf8');
  return { root, mirror };
}

test('Discord race guard is isolated from and preserves the canonical audio start core', async () => {
  const { root, mirror } = await sources();
  assert.equal(mirror, root);
  assert.match(root, /function installS666AudioStartCore\(global\)/);
  assert.match(root, /global\.S666AudioStartCore = Object\.freeze\(\{ create \}\)/);
  assert.match(root, /function installS666DiscordDirectSettingsRaceGuard\(global\)/);
  assert.ok(root.indexOf('installS666DiscordDirectSettingsRaceGuard') > root.indexOf('global.S666AudioStartCore'));
});

test('Direct Discord settings cannot be edited through the mounted controls while delivery is active', async () => {
  const { root } = await sources();
  assert.match(root, /const CONTROL_SELECTOR = \[/);
  assert.match(root, /#s666DiscordAutoTarget/);
  assert.match(root, /\[data-direct-webhook\]/);
  assert.match(root, /control\.disabled = true/);
  assert.match(root, /data-s666-race-guard-disabled/);
  assert.match(root, /MutationObserver/);
});

test('Same-tab and cross-tab settings changes are detected without exposing webhook values', async () => {
  const { root } = await sources();
  assert.match(root, /const STORAGE_KEY = 's666_discord_direct_v1'/);
  assert.match(root, /storagePrototype\.setItem = function s666DiscordRaceGuardedSetItem/);
  assert.match(root, /global\.addEventListener\('storage'/);
  assert.match(root, /settingsChangedDuringDelivery = true/);
  assert.doesNotMatch(root, /console\.(?:log|info|warn|error).*Webhook/i);
  assert.doesNotMatch(root, /dispatch\([^\n]*deliveredWebhook/);
});

test('A changed automatic target or webhook is force-delivered after the old request settles', async () => {
  const { root } = await sources();
  assert.match(root, /const currentWebhook = currentAutoWebhook\(\)/);
  assert.match(root, /currentWebhook !== deliveredWebhook/);
  assert.match(root, /postTrackIfChanged\(true, 'settings-race-retry'\)/);
  assert.match(root, /result && result\.busy && attempt < 4/);
  assert.ok(root.indexOf('const currentWebhook = currentAutoWebhook()') > root.indexOf('function settleDirectRequest'));
  assert.ok(root.indexOf("postTrackIfChanged(true, 'settings-race-retry')") < root.indexOf('function settleDirectRequest'));
});

test('Webhook comparison truth table retries only when the current automatic destination differs', () => {
  const mustRetry = ({ accepted, changed, current, delivered }) => Boolean(
    accepted && changed && current && delivered && current !== delivered
  );
  assert.equal(mustRetry({ accepted: true, changed: true, current: 'B', delivered: 'A' }), true);
  assert.equal(mustRetry({ accepted: true, changed: true, current: 'A', delivered: 'A' }), false);
  assert.equal(mustRetry({ accepted: false, changed: true, current: 'B', delivered: 'A' }), false);
  assert.equal(mustRetry({ accepted: true, changed: false, current: 'B', delivered: 'A' }), false);
});
