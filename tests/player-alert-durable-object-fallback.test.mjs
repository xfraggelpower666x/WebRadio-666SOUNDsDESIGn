import test from 'node:test';
import assert from 'node:assert/strict';

import { DiscordNowPlayingGateCore } from '../worker-addons/discord-nowplaying-gate.js';
import { handlePlayerAlertWithGlobalFallback } from '../worker-addons/player-alert-global-fallback.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function memoryState() {
  const map = new Map();
  return {
    storage: {
      async get(key) { return map.get(key); },
      async put(key, value) { map.set(key, value); },
      async delete(key) { return map.delete(key); }
    },
    map
  };
}

function durableEnv(core) {
  return {
    DISCORD_NOWPLAYING_GATE: {
      idFromName(name) { return name; },
      get() {
        return { fetch: (request) => core.fetch(request) };
      }
    }
  };
}

test('existing Durable Object core stores Player Alert state in isolated routes', async () => {
  const state = memoryState();
  const core = new DiscordNowPlayingGateCore(state, {});
  const now = Date.now();

  const stored = await core.fetch(new Request('https://do.test/player-alert/store', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      active: true,
      id: 'alert-1',
      message: 'global hello',
      username: 'Tester',
      senderId: 'sender-a',
      timestamp: now,
      source: 'cache-tertiary'
    })
  }));
  assert.equal(stored.status, 200);
  assert.equal((await stored.json()).stored, true);

  const current = await core.fetch(new Request('https://do.test/player-alert/current'));
  const currentData = await current.json();
  assert.equal(currentData.active, true);
  assert.equal(currentData.message, 'global hello');
  assert.equal(currentData.source, 'durable-object-fallback');
  assert.equal('rateKey' in currentData, false);

  const history = await core.fetch(new Request('https://do.test/player-alert/history'));
  const historyData = await history.json();
  assert.equal(historyData.items.length, 1);
  assert.equal(historyData.items[0].id, 'alert-1');

  const discordStatus = await core.fetch(new Request('https://do.test/status'));
  assert.equal(discordStatus.status, 200);
  const discordData = await discordStatus.json();
  assert.equal(discordData.ok, true);
});

test('cache-tertiary send is mirrored globally and returned as durable-object fallback', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();
  const request = new Request('https://radio.test/api/player-alert/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'cross network' })
  });

  const response = await handlePlayerAlertWithGlobalFallback(request, env, async () => json({
    ok: true,
    active: true,
    id: 'alert-2',
    message: 'cross network',
    username: 'Broadcast',
    senderId: 'sender-b',
    clientId: 'sender-b',
    timestamp: now,
    createdAt: new Date(now).toISOString(),
    version: 'test',
    source: 'cache-tertiary'
  }));

  const data = await response.json();
  assert.equal(data.source, 'durable-object-fallback');
  assert.equal(data.fallbackFrom, 'cache-tertiary');

  const current = await core.fetch(new Request('https://do.test/player-alert/current'));
  assert.equal((await current.json()).message, 'cross network');
});

test('current uses global Durable Object when backend/cache has no active alert', async () => {
  const state = memoryState();
  const core = new DiscordNowPlayingGateCore(state, {});
  const env = durableEnv(core);
  const now = Date.now();

  await core.fetch(new Request('https://do.test/player-alert/store', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'alert-3', message: 'from another network', timestamp: now })
  }));

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/current'),
    env,
    async () => json({ active: false, source: 'none' })
  );
  const data = await response.json();
  assert.equal(data.active, true);
  assert.equal(data.message, 'from another network');
  assert.equal(data.source, 'durable-object-fallback');
});

test('active Render backend remains authoritative while successful sends are mirrored', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  const sendResponse = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'backend wins' })
    }),
    env,
    async () => json({
      ok: true,
      active: true,
      id: 'alert-4',
      message: 'backend wins',
      timestamp: now,
      source: 'backend'
    })
  );
  assert.equal((await sendResponse.json()).source, 'backend');

  const currentResponse = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/current'),
    env,
    async () => json({
      ok: true,
      active: true,
      id: 'alert-4',
      message: 'backend wins',
      timestamp: now,
      source: 'backend'
    })
  );
  assert.equal((await currentResponse.json()).source, 'backend');
});

test('status advertises the global Durable Object fallback without exposing secrets', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/status'),
    env,
    async () => json({ ok: true, backendConfigured: true, kvConfigured: false })
  );
  const data = await response.json();
  assert.equal(data.durableObjectFallbackConfigured, true);
  assert.equal(data.durableObjectFallbackOk, true);
  assert.match(data.mode, /durable-object-global-fallback/);
  assert.equal('PLAYER_ALERT_SERVICE_TOKEN' in data, false);
});
