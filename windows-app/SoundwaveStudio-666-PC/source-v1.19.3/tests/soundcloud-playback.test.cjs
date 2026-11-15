'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSoundCloudStreamProxy } = require('../src/shared/soundcloud-stream.cjs');
const { createSoundCloudPlayback } = require('../src/soundcloud-playback.js');
const fs = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');

const api = 'https://api.soundcloud.com/tracks/soundcloud:tracks:1/streams/token/';
const request = (path = 'current?v=1', options = {}) => new Request(`swsc://audio/${path}`, options);
const makeProxy = fetch => createSoundCloudStreamProxy({ fetch, accessToken: async () => 'secret-token', invalidateToken: () => {} });

test('SoundCloud advances normally but not when an export finishes at track end', async () => {
  const integration = fs.readFileSync(path.join(__dirname, '../src/integration/666-integration.js'), 'utf8');
  const line = integration.split(/\r?\n/).find(value => value.includes("audio.addEventListener('ended',async()=>"));
  assert.ok(line);
  let handler, exporting = true, advances = 0, plays = 0;
  const context = {
    audio: { addEventListener: (_event, callback) => { handler = callback; } },
    mode: 'soundcloud', outputMode: false, rt: { isExporting: () => exporting },
    window: { api: { soundCloudNext: async () => { advances++; return {}; } } },
    playSoundCloud: async () => { plays++; }, q: () => ({ textContent: '' })
  };
  runInNewContext(line, context);
  await handler();
  assert.equal(advances, 0);
  assert.equal(plays, 0);
  exporting = false;
  await handler();
  assert.equal(advances, 1);
  assert.equal(plays, 1);
});

test('SoundCloud error recovery does not advance or resume during an export', async () => {
  const integration = fs.readFileSync(path.join(__dirname, '../src/integration/666-integration.js'), 'utf8');
  const start = integration.indexOf("  audio.addEventListener('error',async()=>{if(mode!=='soundcloud'");
  const multilineStart = integration.indexOf("  audio.addEventListener('error',async()=>{\n    if(mode!=='soundcloud'");
  const first = start >= 0 ? start : multilineStart;
  const end = integration.indexOf("\n  window.addEventListener('offline'", first);
  assert.ok(first >= 0 && end > first);
  let handler, exporting = true, advances = 0, plays = 0, timer;
  const status = {};
  const context = {
    audio: { addEventListener: (_event, callback) => { handler = callback; } },
    mode: 'soundcloud', outputMode: false, soundCloudErrorSkips: 0,
    rt: { isExporting: () => exporting },
    window: { api: { soundCloudNext: async () => { advances++; return {}; } } },
    playSoundCloud: async () => { plays++; }, q: () => status,
    setTimeout: fn => { timer = fn; }
  };
  runInNewContext(integration.slice(first, end), context);
  await handler();
  assert.equal(advances, 0);
  assert.equal(plays, 0);
  assert.match(status.textContent, /automatic skip paused/);

  exporting = false;
  const pending = handler();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(advances, 1);
  exporting = true;
  timer();
  await pending;
  assert.equal(plays, 0);
  assert.match(status.textContent, /recovery paused/);

  exporting = false;
  const normal = handler();
  await new Promise(resolve => setImmediate(resolve));
  timer();
  await normal;
  assert.equal(advances, 2);
  assert.equal(plays, 1);
});

test('SoundCloud library buttons have separate forwardable IDs for each section', async () => {
  const integration = fs.readFileSync(path.join(__dirname, '../src/integration/666-integration.js'), 'utf8');
  const start = integration.indexOf('  async function refreshSoundCloudLibrary()');
  const end = integration.indexOf("\n  q('#soundcloud-library-refresh')", start);
  assert.ok(start >= 0 && end > start);
  const box = { innerHTML: '', querySelectorAll: () => [] };
  const context = {
    q: () => box,
    window: { api: { soundCloudLibrary: async () => ({
      playlists: [{ title: 'List', kind: 'playlist', permalink: 'https://example.test/playlist', trackCount: 2 }],
      tracks: [{ title: 'Song', kind: 'track', permalink: 'https://example.test/track' }]
    }) } }
  };
  runInNewContext(integration.slice(start, end), context);
  await context.refreshSoundCloudLibrary();
  assert.match(box.innerHTML, /id="soundcloud-item-playlist-0"/);
  assert.match(box.innerHTML, /id="soundcloud-item-track-0"/);
});

test('track activation uses the authenticated plural streams endpoint and rejects stale source switches', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = main.indexOf('async function activateSoundCloudIndex(');
  const end = main.indexOf('async function resolveSoundCloud(', start);
  const urls = [], source = { urn: 'soundcloud:tracks:1', access: 'playable', title: 'T', artist: 'A' };
  const context = {
    soundCloudQueue: [source], soundCloudQueueIndex: -1, soundCloudCurrent: null,
    soundCloudRevision: 0, soundCloudCredentialRevision: 0, sharedSourceState: { mode: 'soundcloud' },
    soundCloudApi: async url => { urls.push(url); return { hls_aac_160_url: api }; },
    soundCloudStreamProxy: { reset() {}, prepare: () => ({ kind: 'hls', preview: false }) },
    broadcastSourceState() {}, encodeURIComponent
  };
  runInNewContext(main.slice(start, end), context);
  const result = await context.activateSoundCloudIndex(0);
  assert.equal(urls[0], '/tracks/soundcloud%3Atracks%3A1/streams');
  assert.equal(result.playbackKind, 'hls');
  context.sharedSourceState.mode = 'radio';
  await assert.rejects(context.activateSoundCloudIndex(0), /soundcloud_track_changed/);
});

test('stream metadata endpoint rejects a successful non-JSON response', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = main.indexOf('async function soundCloudApi(');
  const end = main.indexOf('function normalizeSoundCloudTrack(', start);
  const context = {
    soundCloudAccessToken: async () => 'token', SOUND_CLOUD_API: 'https://api.soundcloud.com',
    soundCloudFetch: async () => new Response('<html>denied</html>', { headers: { 'content-type': 'text/html' } })
  };
  runInNewContext(main.slice(start, end), context);
  await assert.rejects(context.soundCloudApi('/tracks/soundcloud%3Atracks%3A1/streams'), /invalid_content_type/);
});

test('authenticated HLS playlists rewrite references into bounded internal URLs without leaking tokens', async () => {
  const calls = [];
  const proxy = makeProxy(async (url, opts) => {
    calls.push({ url, opts });
    if (url === api) return new Response(null, { status: 302, headers: { location: 'https://cf-media.sndcdn.com/master.m3u8?signature=secret' } });
    if (url.includes('master.m3u8')) return new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=128000\nchild.m3u8\n', { headers: { 'content-type': 'application/vnd.apple.mpegurl' } });
    if (url.includes('child.m3u8')) return new Response('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:4,\nchunk.ts\n#EXT-X-ENDLIST', { headers: { 'content-type': 'application/x-mpegurl' } });
    return new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { 'content-type': 'video/mp2t', 'content-range': 'bytes 0-2/3' } });
  });
  assert.deepEqual(proxy.prepare({ hls_aac_160_url: api }, 'playable', 1), { kind: 'hls', preview: false });
  const master = await (await proxy.handle(request())).text();
  assert.equal(await (await proxy.handle(request())).text(), master);
  assert.doesNotMatch(master, /secret|soundcloud\.com|sndcdn\.com/);
  const childUrl = master.split('\n').find(line => line.startsWith('swsc:'));
  const child = await (await proxy.handle(new Request(childUrl))).text();
  assert.match(child, /URI="swsc:\/\/audio\/resource\//);
  const segment = child.split('\n').find(line => line.startsWith('swsc:'));
  const result = await proxy.handle(new Request(segment, { headers: { range: 'bytes=0-2' } }));
  assert.equal(result.status, 206);
  assert.equal(result.headers.get('content-range'), 'bytes 0-2/3');
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [1, 2, 3]);
  assert.equal(calls[0].opts.headers.authorization, 'OAuth secret-token');
  assert.equal(calls.find(call => call.url.includes('master.m3u8')).opts.headers.authorization, undefined);
  assert.equal(calls.at(-1).opts.headers.range, 'bytes=0-2');
});

test('preview is explicitly selected and proxied as audio, not a playlist', async () => {
  const proxy = makeProxy(async () => new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }));
  assert.deepEqual(proxy.prepare({ hls_aac_160_url: api, preview_mp3_128_url: api }, 'preview', 1), { kind: 'preview', preview: true });
  const result = await proxy.handle(request());
  assert.equal(result.headers.get('content-type'), 'audio/mpeg');
  assert.equal(await result.text(), 'audio');
});

test('expired API token retries once, and never forwards authorization to a CDN', async () => {
  let token = 'old', invalidations = 0;
  const calls = [];
  const proxy = createSoundCloudStreamProxy({
    accessToken: async () => token,
    invalidateToken: old => { assert.equal(old, 'old'); invalidations++; token = 'new'; },
    fetch: async (url, options) => {
      calls.push({ url, authorization: options.headers.authorization });
      if (calls.length === 1) return new Response(null, { status: 401 });
      if (calls.length === 2) return new Response(null, { status: 302, headers: { location: 'https://media.sndcdn.com/a.mp3' } });
      return new Response('audio', { headers: { 'content-type': 'audio/mpeg' } });
    }
  });
  proxy.prepare({ preview_mp3_128_url: api }, 'preview', 1);
  assert.equal((await proxy.handle(request())).status, 200);
  assert.equal(invalidations, 1);
  assert.deepEqual(calls.map(x => x.authorization), ['OAuth old', 'OAuth new', undefined]);
});

test('rejects untrusted URLs, redirects, stale revisions, bad routes and non-media content', async () => {
  let calls = 0;
  const proxy = makeProxy(async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }); });
  assert.throws(() => proxy.prepare({ hls_aac_160_url: 'https://sndcdn.com.evil.example/a' }, 'playable', 1), /untrusted_url/);
  assert.throws(() => proxy.prepare({ hls_aac_160_url: 'https://api.soundcloud.com/me' }, 'playable', 1), /untrusted_url/);
  proxy.prepare({ hls_aac_160_url: api }, 'playable', 1);
  assert.equal((await proxy.handle(request('current?v=2'))).status, 404);
  assert.equal((await proxy.handle(request('resource/11111111-1111-1111-1111-111111111111?v=1'))).status, 404);
  assert.equal((await proxy.handle(request('current?v=1', { method: 'POST' }))).status, 404);
  assert.equal(calls, 0);
  assert.equal((await proxy.handle(request())).status, 502);
  assert.equal(calls, 1);
  const bad = makeProxy(async () => new Response('<html>denied</html>', { headers: { 'content-type': 'text/html' } }));
  bad.prepare({ preview_mp3_128_url: api }, 'preview', 1);
  assert.equal((await bad.handle(request())).status, 502);
  const invalidList = makeProxy(async () => new Response('<html>denied</html>', { headers: { 'content-type': 'text/plain' } }));
  invalidList.prepare({ hls_aac_160_url: api }, 'playable', 1);
  assert.equal((await invalidList.handle(request())).status, 502);
  const evilList = makeProxy(async () => new Response('#EXTM3U\nhttp://127.0.0.1/a', { headers: { 'content-type': 'text/plain' } }));
  evilList.prepare({ hls_aac_160_url: api }, 'playable', 1);
  assert.equal((await evilList.handle(request())).status, 502);
});

test('stale requests cannot return content after a track change', async () => {
  let complete;
  const proxy = makeProxy(() => new Promise(resolve => { complete = resolve; }));
  proxy.prepare({ preview_mp3_128_url: api }, 'preview', 1);
  const pending = proxy.handle(request());
  await new Promise(resolve => setImmediate(resolve));
  proxy.reset();
  complete(new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }));
  assert.equal((await pending).status, 404);
});

test('cancelling an internal media request cancels its upstream fetch', async () => {
  let upstream;
  const proxy = makeProxy((_url, options) => {
    upstream = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
  proxy.prepare({ preview_mp3_128_url: api }, 'preview', 1);
  const controller = new AbortController();
  const pending = proxy.handle(request('current?v=1', { signal: controller.signal }));
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  assert.equal(upstream.aborted, true);
  assert.equal((await pending).status, 502);
});

test('HLS attaches to the existing audio element, reports fatal errors and tears down on source switches', () => {
  const events = [], audio = { canPlayType: () => '', load: () => events.push('load') };
  class MockHls {
    static Events = { ERROR: 'error' };
    static isSupported() { return true; }
    constructor(options) { events.push(options); }
    on(_event, cb) { this.error = cb; MockHls.instance = this; }
    loadSource(url) { events.push(url); }
    attachMedia(media) { assert.equal(media, audio); events.push('attach'); }
    destroy() { events.push('destroy'); }
  }
  const errors = [], player = createSoundCloudPlayback(audio, MockHls, error => errors.push(error));
  player.load({ playbackKind: 'hls', mediaUrl: 'swsc://audio/current?v=1' });
  assert.deepEqual(events.slice(0, 3), [{ enableWorker: false }, 'swsc://audio/current?v=1', 'attach']);
  MockHls.instance.error('error', { fatal: true, details: 'manifestLoadError' });
  assert.match(errors[0], /manifestLoadError/);
  assert.equal(events.at(-1), 'destroy');
  player.load({ playbackKind: 'preview', mediaUrl: 'swsc://audio/current?v=2' });
  assert.equal(audio.src, 'swsc://audio/current?v=2');
  assert.equal(events.at(-1), 'load');
  assert.throws(() => createSoundCloudPlayback(audio, null, () => {}).load({ playbackKind: 'hls' }), /not supported/);
});
