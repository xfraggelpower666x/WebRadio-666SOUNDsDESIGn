import test from 'node:test';
import assert from 'node:assert/strict';

import { DiscordNowPlayingGateCore } from '../worker-addons/discord-nowplaying-gate.js';
import { handleDiscordNotifyWithGlobalTrackGate } from '../worker-addons/discord-global-gate-router.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { return this.values.delete(key); }
}

function createGateEnvironment() {
  const gate = new DiscordNowPlayingGateCore({ storage: new MemoryStorage() }, {});
  const stub = { fetch: (request) => gate.fetch(request) };
  return {
    DISCORD_NOWPLAYING_GATE: {
      idFromName(name) { return `id:${name}`; },
      get() { return stub; }
    }
  };
}

function discordRequest(path, body) {
  return new Request(`https://webradio.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  });
}

async function json(response) {
  return response.json();
}

test('100 simultaneous player starts create exactly one automatic Now Playing delivery', async () => {
  const env = createGateEnvironment();
  let deliveries = 0;
  const fallback = async () => {
    deliveries += 1;
    await new Promise((resolve) => setTimeout(resolve, 12));
    return Response.json({ ok: true, type: 'nowplaying' });
  };

  const payload = {
    artist: 'FRAGGLEPOWER666',
    title: 'Track A',
    nowPlaying: 'FRAGGLEPOWER666 - Track A',
    reason: 'startup-first-now-playing'
  };

  const responses = await Promise.all(
    Array.from({ length: 100 }, () =>
      handleDiscordNotifyWithGlobalTrackGate(
        discordRequest('/api/discord/nowplaying', payload),
        env,
        fallback
      )
    )
  );

  const bodies = await Promise.all(responses.map(json));
  assert.equal(deliveries, 1);
  assert.equal(bodies.filter((body) => body.ok === true && body.skipped !== true).length, 1);
  assert.equal(bodies.filter((body) => body.skipped === true && body.deduped === true).length, 99);
});

test('every new track is delivered once and a repeated startup for the current track is suppressed', async () => {
  const env = createGateEnvironment();
  let deliveries = 0;
  const fallback = async () => {
    deliveries += 1;
    return Response.json({ ok: true, type: 'nowplaying' });
  };

  const send = (title, reason = 'watcher-track-change') =>
    handleDiscordNotifyWithGlobalTrackGate(
      discordRequest('/api/discord/nowplaying', {
        artist: '666SOUNDsDESIGn',
        title,
        nowPlaying: `666SOUNDsDESIGn - ${title}`,
        reason
      }),
      env,
      fallback
    );

  assert.equal((await json(await send('Track A', 'startup-first-now-playing'))).ok, true);
  assert.equal((await json(await send('Track B'))).ok, true);
  const duplicate = await json(await send('Track B', 'startup-first-now-playing'));
  assert.equal(duplicate.skipped, true);
  assert.equal(duplicate.deduped, true);
  assert.equal(deliveries, 2);

  assert.equal((await json(await send('Track A'))).ok, true);
  assert.equal(deliveries, 3, 'A -> B -> A is a real new track boundary and must post again');
});

test('manual Discord message shooter bypasses the automatic gate unchanged', async () => {
  const env = createGateEnvironment();
  let deliveries = 0;
  const fallback = async (request) => {
    deliveries += 1;
    const body = await request.json();
    return Response.json({ ok: true, type: 'message', message: body.message });
  };

  const response = await handleDiscordNotifyWithGlobalTrackGate(
    discordRequest('/api/discord/message', { message: 'Hello Discord' }),
    env,
    fallback
  );
  const body = await json(response);
  assert.equal(body.ok, true);
  assert.equal(body.message, 'Hello Discord');
  assert.equal(deliveries, 1);
});

test('explicit manual Now Playing remains possible even for the currently committed track', async () => {
  const env = createGateEnvironment();
  let deliveries = 0;
  const fallback = async () => {
    deliveries += 1;
    return Response.json({ ok: true, type: 'nowplaying' });
  };

  const automatic = {
    artist: 'LYVRA',
    title: 'Track X',
    nowPlaying: 'LYVRA - Track X',
    reason: 'startup-first-now-playing'
  };
  await handleDiscordNotifyWithGlobalTrackGate(
    discordRequest('/api/discord/nowplaying', automatic), env, fallback
  );

  const manual = await handleDiscordNotifyWithGlobalTrackGate(
    discordRequest('/api/discord/nowplaying', {
      ...automatic,
      reason: 'manual-now-playing',
      force: true
    }),
    env,
    fallback
  );

  assert.equal((await json(manual)).ok, true);
  assert.equal(deliveries, 2);
});

test('failed automatic delivery releases its claim so another listener can retry', async () => {
  const env = createGateEnvironment();
  let attempts = 0;
  const fallback = async () => {
    attempts += 1;
    if (attempts === 1) return Response.json({ ok: false, error: 'temporary_failure' }, { status: 500 });
    return Response.json({ ok: true, type: 'nowplaying' });
  };

  const payload = {
    artist: 'FRAGGLEPOWER666',
    title: 'Retry Track',
    reason: 'watcher-track-change'
  };

  const first = await handleDiscordNotifyWithGlobalTrackGate(
    discordRequest('/api/discord/nowplaying', payload), env, fallback
  );
  assert.equal(first.status, 500);

  const second = await handleDiscordNotifyWithGlobalTrackGate(
    discordRequest('/api/discord/nowplaying', payload), env, fallback
  );
  assert.equal((await json(second)).ok, true);
  assert.equal(attempts, 2);
});
