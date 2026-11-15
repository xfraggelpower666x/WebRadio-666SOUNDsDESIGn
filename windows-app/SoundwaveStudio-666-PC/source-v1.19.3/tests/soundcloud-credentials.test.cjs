'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { createSoundCloudCredentialStore } = require('../src/shared/soundcloud-credentials.cjs');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radio-wave-credentials-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const storage = {
    available: true,
    async isAsyncEncryptionAvailable() { return this.available; },
    async encryptStringAsync(value) { return Buffer.from(value, 'utf8').map(b => b ^ 0xa5); },
    async decryptStringAsync(value) { return { result: Buffer.from(value).map(b => b ^ 0xa5).toString('utf8') }; }
  };
  return { dir, storage, store: createSoundCloudCredentialStore(storage, () => dir) };
}

test('credentials are encrypted, persist, replace and delete', async t => {
  const { dir, store } = fixture(t);
  assert.equal(await store.read(), null);
  await store.save({ clientId: 'test-client', clientSecret: 'test-secret' });
  assert.deepEqual(await store.read(), { clientId: 'test-client', clientSecret: 'test-secret' });
  assert.equal(fs.readFileSync(path.join(dir, 'soundcloud-credentials.enc')).includes(Buffer.from('test-secret')), false);
  await store.save({ clientId: 'new-client', clientSecret: 'new-secret' });
  assert.deepEqual(await store.read(), { clientId: 'new-client', clientSecret: 'new-secret' });
  store.clear();
  assert.equal(await store.read(), null);
});

test('unavailable encryption and corrupt credentials fail explicitly', async t => {
  const { dir, storage, store } = fixture(t);
  storage.available = false;
  await assert.rejects(store.save({ clientId: 'a', clientSecret: 'b' }), /secure_storage_unavailable/);
  assert.equal(store.stored(), false);
  await assert.rejects(store.save({ clientId: '', clientSecret: 'b' }), /credentials_invalid/);
  storage.available = true;
  fs.writeFileSync(path.join(dir, 'soundcloud-credentials.enc'), 'invalid');
  await assert.rejects(store.read(), /credentials_decryption_failed/);
});

test('detached window snapshots do not copy password values', () => {
  const workspace = fs.readFileSync(path.join(__dirname, '../src/workspace.js'), 'utf8');
  const start = workspace.indexOf('  function controlsSnapshot(');
  const end = workspace.indexOf('  async function detachWindow(', start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  runInNewContext(workspace.slice(start, end), context);
  const snapshot = context.controlsSnapshot({
    querySelectorAll: () => [
      { id: 'secret', tagName: 'INPUT', type: 'password', value: 'do-not-copy' },
      { id: 'title', tagName: 'INPUT', type: 'text', value: 'visible' }
    ]
  });
  assert.equal(snapshot.length, 2);
  assert.equal(snapshot[0].id, 'secret');
  assert.equal(snapshot[0].hasValue, true);
  assert.equal('value' in snapshot[0], false);
  assert.doesNotMatch(JSON.stringify(snapshot), /do-not-copy/);
  assert.equal(snapshot[1].id, 'title');
  assert.equal(snapshot[1].value, 'visible');
});

function tokenContext(fetch) {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = main.indexOf('async function soundCloudCredentials()');
  const end = main.indexOf('function soundCloudPermalink(', start);
  assert.ok(start >= 0 && end > start);
  const context = {
    process: { env: {} }, soundCloudCredentialStore: { read: () => ({ clientId: 'id', clientSecret: 'secret' }) },
    soundCloudToken: null, soundCloudTokenRequest: null, soundCloudCredentialRevision: 0, soundCloudCredentialWrite: Promise.resolve(),
    soundCloudStreamProxy: { reset() {} },
    soundCloudFetch: fetch, SOUND_CLOUD_AUTH: 'https://example.test', URLSearchParams, Buffer
  };
  runInNewContext(main.slice(start, end), context);
  return context;
}

test('concurrent token requests share one SoundCloud exchange', async () => {
  let count = 0;
  const context = tokenContext(async (_url, options) => {
    count++;
    assert.match(options.headers.authorization, /^Basic /);
    assert.equal(options.body.get('grant_type'), 'client_credentials');
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) };
  });
  assert.deepEqual(await Promise.all([context.soundCloudAccessToken(), context.soundCloudAccessToken()]), ['token', 'token']);
  assert.equal(count, 1);
});

test('changing credentials rejects an in-flight old token', async () => {
  let finish;
  const context = tokenContext(() => new Promise(resolve => { finish = resolve; }));
  const pending = context.soundCloudAccessToken();
  await new Promise(resolve => setImmediate(resolve));
  context.soundCloudCredentialRevision++;
  finish({ ok: true, json: async () => ({ access_token: 'old', expires_in: 3600 }) });
  await assert.rejects(pending, /credentials_changed/);
  assert.equal(context.soundCloudToken, null);
});

test('SoundCloud API retries an unauthorized request with a fresh token', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = main.indexOf('async function soundCloudCredentials()');
  const end = main.indexOf('function normalizeSoundCloudTrack(', start);
  assert.ok(start >= 0 && end > start);
  const calls = [];
  const context = {
    process: { env: {} }, soundCloudCredentialStore: { read: () => ({ clientId: 'id', clientSecret: 'secret' }) },
    soundCloudToken: { accessToken: 'expired', expiresAt: Date.now() + 3600000 },
    soundCloudTokenRequest: null, soundCloudCredentialRevision: 0, soundCloudCredentialWrite: Promise.resolve(),
    soundCloudStreamProxy: { reset() {} },
    SOUND_CLOUD_AUTH: 'https://auth.example.test', SOUND_CLOUD_API: 'https://api.example.test',
    URLSearchParams, URL, Buffer, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/oauth/token')) return { ok: true, status: 200, json: async () => ({ access_token: 'fresh', expires_in: 3600 }) };
      if (calls.length === 1) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ title: 'track' }) };
    }
  };
  runInNewContext(main.slice(start, end), context);
  assert.equal((await context.soundCloudApi('/tracks/test')).title, 'track');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.headers.authorization, 'OAuth expired');
  assert.match(calls[1].options.headers.authorization, /^Basic /);
  assert.equal(calls[2].options.headers.authorization, 'OAuth fresh');
});

test('credential IPC stores and clears values without returning them', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const helpersStart = main.indexOf('async function soundCloudCredentials()');
  const helpersEnd = main.indexOf('function soundCloudPermalink(', helpersStart);
  const routesStart = main.indexOf("registerIpc('soundcloud:status'");
  const routesEnd = main.indexOf("registerIpc('soundcloud:library'", routesStart);
  assert.ok(helpersStart >= 0 && helpersEnd > helpersStart && routesStart >= 0 && routesEnd > routesStart);
  let saved = null;
  const handlers = {};
  const context = {
    process: { env: {} }, soundCloudToken: null, soundCloudTokenRequest: null,
    soundCloudCredentialRevision: 0, soundCloudCredentialWrite: Promise.resolve(),
    soundCloudStreamProxy: { reset() {} },
    soundCloudCredentialStore: {
      read: async () => saved, save: async value => { saved = value; },
      clear: () => { saved = null; }, stored: () => !!saved
    },
    safeStorage: { isAsyncEncryptionAvailable: async () => true },
    SOUND_CLOUD_CREATOR_URL: 'https://soundcloud.com/example',
    registerIpc: (name, _role, handler) => { handlers[name] = handler; }
  };
  runInNewContext(main.slice(helpersStart, helpersEnd) + main.slice(routesStart, routesEnd), context);
  await handlers['soundcloud:credentials-save']({}, { clientId: 'private-id', clientSecret: 'private-secret' });
  const status = await handlers['soundcloud:status']({});
  assert.equal(status.configured, true);
  assert.equal(status.source, 'stored');
  assert.doesNotMatch(JSON.stringify(status), /private-id|private-secret/);
  await handlers['soundcloud:credentials-clear']({});
  assert.equal((await handlers['soundcloud:status']({})).configured, false);
});
