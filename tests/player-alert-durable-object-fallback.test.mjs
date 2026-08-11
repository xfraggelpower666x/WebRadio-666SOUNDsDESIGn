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

async function store(core, alert) {
  return core.fetch(new Request('https://do.test/player-alert/store', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(alert)
  }));
}

test('existing Durable Object core stores Player Alert state in isolated routes', async () => {
  const state = memoryState();
  const core = new DiscordNowPlayingGateCore(state, {});
  const now = Date.now();

  const stored = await store(core, {
    ok: true,
    active: true,
    id: 'alert-1',
    message: 'global hello',
    username: 'Tester',
    senderId: 'sender-a',
    timestamp: now,
    source: 'cache-tertiary'
  });
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

test('late older mirror cannot regress global current and history stays newest-first', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const now = Date.now();

  const newer = await store(core, {
    id: 'alert-newer',
    message: 'newer message',
    senderId: 'sender-new',
    timestamp: now,
    source: 'backend'
  });
  assert.equal((await newer.json()).current_updated, true);

  const lateOlder = await store(core, {
    id: 'alert-older-late',
    message: 'older response completed late',
    senderId: 'sender-old',
    timestamp: now - 5000,
    source: 'backend'
  });
  assert.equal((await lateOlder.json()).current_updated, false);

  const current = await core.fetch(new Request('https://do.test/player-alert/current'));
  const currentData = await current.json();
  assert.equal(currentData.id, 'alert-newer');
  assert.equal(currentData.message, 'newer message');

  const history = await core.fetch(new Request('https://do.test/player-alert/history'));
  const historyData = await history.json();
  assert.deepEqual(historyData.items.map((item) => item.id), ['alert-newer', 'alert-older-late']);
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

test('nested successful Render send payload is mirrored into the global Durable Object', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'render mirrored' })
    }),
    env,
    async () => json({
      ok: true,
      delivered: true,
      source: 'backend',
      fallback: false,
      alert: {
        ok: true,
        active: true,
        id: 'alert-render-1',
        message: 'render mirrored',
        username: 'Broadcast',
        senderId: 'sender-render',
        clientId: 'sender-render',
        timestamp: now,
        createdAt: new Date(now).toISOString(),
        version: 'render-test',
        source: 'web-player'
      }
    })
  );

  const responseData = await response.json();
  assert.equal(responseData.source, 'backend');

  const current = await core.fetch(new Request('https://do.test/player-alert/current'));
  const currentData = await current.json();
  assert.equal(currentData.active, true);
  assert.equal(currentData.id, 'alert-render-1');
  assert.equal(currentData.message, 'render mirrored');
});

test('current uses global Durable Object when backend/cache has no active alert', async () => {
  const state = memoryState();
  const core = new DiscordNowPlayingGateCore(state, {});
  const env = durableEnv(core);
  const now = Date.now();

  await store(core, { id: 'alert-3', message: 'from another network', timestamp: now });

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

test('newer global Durable Object current outranks an older still-active backend alert', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  await store(core, {
    id: 'alert-new-global',
    message: 'new global message',
    timestamp: now,
    source: 'cache-tertiary'
  });

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/current'),
    env,
    async () => json({
      ok: true,
      active: true,
      id: 'alert-old-backend',
      message: 'old backend message',
      timestamp: now - 5000,
      source: 'backend'
    })
  );

  const data = await response.json();
  assert.equal(data.id, 'alert-new-global');
  assert.equal(data.message, 'new global message');
  assert.equal(data.source, 'durable-object-fallback');
  assert.equal(data.fallbackFrom, 'backend');
});

test('active backend remains authoritative when it is at least as fresh as the mirrored global copy', async () => {
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

test('history merges newer global record with older backend records instead of replacing them', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  await store(core, {
    id: 'history-new',
    message: 'new history item',
    timestamp: now,
    source: 'cache-tertiary'
  });

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/history'),
    env,
    async () => json({
      ok: true,
      source: 'backend',
      items: [{
        id: 'history-old',
        message: 'old history item',
        timestamp: now - 5000,
        source: 'backend'
      }]
    })
  );

  const data = await response.json();
  assert.equal(data.source, 'merged-player-alert-history');
  assert.deepEqual(data.items.map((item) => item.id), ['history-new', 'history-old']);
  assert.equal(data.fallbackFrom, 'backend');
});

test('merged history deduplicates mirrored ids, sorts newest-first and limits LAST 20', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  await store(core, {
    id: 'shared-message',
    message: 'shared mirrored message',
    timestamp: now,
    senderId: 'sender-shared',
    source: 'backend'
  });

  const backendItems = [{
    id: 'shared-message',
    message: 'shared mirrored message',
    timestamp: now,
    senderId: 'sender-shared',
    source: 'backend'
  }];
  for (let index = 1; index <= 25; index += 1) {
    backendItems.push({
      id: `backend-${index}`,
      message: `backend message ${index}`,
      timestamp: now - (index * 1000),
      senderId: 'sender-backend',
      source: 'backend'
    });
  }

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/history'),
    env,
    async () => json({ ok: true, source: 'backend', items: backendItems })
  );
  const data = await response.json();

  assert.equal(data.source, 'merged-player-alert-history');
  assert.equal(data.items.length, 20);
  assert.equal(data.items.filter((item) => item.id === 'shared-message').length, 1);
  assert.equal(data.items[0].id, 'shared-message');
  for (let index = 1; index < data.items.length; index += 1) {
    assert.ok(Number(data.items[index - 1].timestamp) >= Number(data.items[index].timestamp));
  }
});

test('backend-only history is normalized, deduplicated, sorted and limited to LAST 20', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();
  const backendItems = [];
  for (let index = 1; index <= 25; index += 1) {
    backendItems.push({
      id: `backend-only-${index}`,
      message: `backend-only message ${index}`,
      timestamp: now - (index * 1000),
      senderId: 'sender-backend-only',
      source: 'backend'
    });
  }
  backendItems.push({ ...backendItems[0] });
  backendItems.reverse();

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/history'),
    env,
    async () => json({ ok: true, source: 'backend', items: backendItems })
  );
  const data = await response.json();

  assert.equal(data.source, 'backend');
  assert.equal(data.items.length, 20);
  assert.equal(data.items.filter((item) => item.id === 'backend-only-1').length, 1);
  assert.equal(data.items[0].id, 'backend-only-1');
  for (let index = 1; index < data.items.length; index += 1) {
    assert.ok(Number(data.items[index - 1].timestamp) >= Number(data.items[index].timestamp));
  }
});

test('Durable-Object-only history is normalized and limited to LAST 20 at the public route', async () => {
  const core = new DiscordNowPlayingGateCore(memoryState(), {});
  const env = durableEnv(core);
  const now = Date.now();

  for (let index = 1; index <= 25; index += 1) {
    await store(core, {
      id: `do-only-${index}`,
      message: `do-only message ${index}`,
      timestamp: now - (index * 1000),
      senderId: 'sender-do-only',
      source: 'cache-tertiary'
    });
  }

  const response = await handlePlayerAlertWithGlobalFallback(
    new Request('https://radio.test/api/player-alert/history'),
    env,
    async () => json({ ok: true, source: 'none', items: [] })
  );
  const data = await response.json();

  assert.equal(data.source, 'durable-object-fallback');
  assert.equal(data.items.length, 20);
  assert.equal(data.items[0].id, 'do-only-1');
  for (let index = 1; index < data.items.length; index += 1) {
    assert.ok(Number(data.items[index - 1].timestamp) >= Number(data.items[index].timestamp));
  }
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
