'use strict';

const { randomUUID } = require('crypto');

const allowedHost = host => host === 'api.soundcloud.com' || host === 'sndcdn.com' || host.endsWith('.sndcdn.com');
function trustedUrl(value, base) {
  const url = new URL(value, base);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHost(url.hostname)) throw new Error('soundcloud_stream_untrusted_url');
  if (url.hostname === 'api.soundcloud.com' && !url.pathname.startsWith('/tracks/')) throw new Error('soundcloud_stream_untrusted_url');
  return url.href;
}
async function readPlaylist(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('soundcloud_stream_invalid_playlist');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw new Error('soundcloud_stream_playlist_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

function createSoundCloudStreamProxy({ fetch, accessToken, invalidateToken }) {
  let state = null;
  const reset = () => { state = null; };
  function prepare(streams, access, revision) {
    const preview = access === 'preview';
    const kind = preview ? 'preview' : (streams?.hls_aac_160_url || streams?.hls_mp3_128_url ? 'hls' : 'preview');
    const url = kind === 'hls' ? (streams.hls_aac_160_url || streams.hls_mp3_128_url) : streams?.preview_mp3_128_url;
    if (!url) throw new Error('soundcloud_stream_unavailable');
    state = { revision: String(revision), kind, entries: new Map([['current', { url: trustedUrl(url), kind: kind === 'hls' ? 'playlist' : 'media' }]]), resources: new Map() };
    return { kind, preview: kind === 'preview' };
  }
  async function fetchResource(url, range, signal) {
    let current = trustedUrl(url), retried = false;
    for (let redirects = 0; redirects <= 5; redirects++) {
      const target = new URL(current);
      const headers = { accept: '*/*' };
      if (range) headers.range = range;
      const token = target.hostname === 'api.soundcloud.com' ? await accessToken() : null;
      if (token) headers.authorization = `OAuth ${token}`;
      const response = await fetch(current, { headers, redirect: 'manual', signal });
      if (response.status === 401 && target.hostname === 'api.soundcloud.com' && !retried) {
        retried = true; invalidateToken(token); redirects--; continue;
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('soundcloud_stream_redirect_invalid');
        current = trustedUrl(location, current);
        continue;
      }
      return { response, url: current };
    }
    throw new Error('soundcloud_stream_redirect_limit');
  }
  function rewritePlaylist(text, base, active) {
    if (!text.replace(/^\uFEFF/, '').startsWith('#EXTM3U')) throw new Error('soundcloud_stream_invalid_playlist');
    let nextPlaylist = false;
    const add = (value, kind) => {
      const url = trustedUrl(value, base);
      const resource = kind + '\0' + url;
      let id = active.resources.get(resource);
      if (!id) {
        if (active.entries.size >= 10000) throw new Error('soundcloud_stream_playlist_too_large');
        id = randomUUID();
        active.entries.set(id, { url, kind });
        active.resources.set(resource, id);
      }
      return `swsc://audio/resource/${id}?v=${encodeURIComponent(active.revision)}`;
    };
    return text.split(/\r?\n/).map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXT-X-STREAM-INF:')) nextPlaylist = true;
      if (trimmed.startsWith('#')) {
        const rewritten = line.replace(/URI="([^"]+)"/g, (_match, url) => `URI="${add(url, /^#EXT-X-(MEDIA|I-FRAME-STREAM-INF):/.test(trimmed) ? 'playlist' : 'media')}"`);
        if (/https?:\/\//i.test(rewritten) || /\bURI=(?!")/i.test(rewritten)) throw new Error('soundcloud_stream_invalid_playlist');
        return rewritten;
      }
      if (!trimmed) return line;
      const kind = nextPlaylist || /\.m3u8(?:[?#]|$)/i.test(trimmed) ? 'playlist' : 'media';
      nextPlaylist = false;
      return add(trimmed, kind);
    }).join('\n');
  }
  async function handle(request) {
    const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
    try {
      const u = new URL(request.url), active = state;
      if (request.method !== 'GET' || u.hostname !== 'audio' || u.username || u.password || u.port || !active || u.searchParams.get('v') !== active.revision) return new Response('Not found', { status: 404, headers });
      const match = u.pathname.match(/^\/resource\/([0-9a-f-]{36})$/);
      const key = u.pathname === '/current' ? 'current' : match?.[1];
      const entry = active.entries.get(key);
      if (!entry) return new Response('Not found', { status: 404, headers });
      const range = request.headers.get('range');
      if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response('Invalid range', { status: 416, headers });
      const { response, url } = await fetchResource(entry.url, range, request.signal);
      if (active !== state) return new Response('Not found', { status: 404, headers });
      if (!response.ok) return new Response(`SoundCloud stream HTTP ${response.status}`, { status: 502, headers });
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (entry.kind === 'playlist') {
        if (!['application/vnd.apple.mpegurl', 'application/x-mpegurl', 'audio/mpegurl', 'audio/x-mpegurl', 'text/plain', 'application/octet-stream'].includes(type)) throw new Error('soundcloud_stream_invalid_content_type');
        if (Number(response.headers.get('content-length')) > 1024 * 1024) throw new Error('soundcloud_stream_playlist_too_large');
        const text = await readPlaylist(response);
        if (active !== state) return new Response('Not found', { status: 404, headers });
        return new Response(rewritePlaylist(text, url, active), { headers: { ...headers, 'content-type': 'application/vnd.apple.mpegurl' } });
      }
      if (!['audio/mpeg', 'audio/aac', 'audio/mp4', 'video/mp4', 'video/mp2t', 'audio/mp2t', 'application/octet-stream', 'binary/octet-stream'].includes(type)) throw new Error('soundcloud_stream_invalid_content_type');
      for (const name of ['content-length', 'content-range', 'accept-ranges']) {
        const value = response.headers.get(name); if (value) headers[name] = value;
      }
      headers['content-type'] = type;
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const message = /^soundcloud_[a-z_]+$/.test(error?.message || '') ? error.message : 'soundcloud_stream_error';
      return new Response(message, { status: 502, headers });
    }
  }
  return { prepare, reset, handle };
}
module.exports = { createSoundCloudStreamProxy };
