/**
 * 666SOUNDsDESIGn — Master CORS Proxy + Radio Metadata API
 * Routes:
 *   /cors?u=<ENCODED_TARGET_URL>
 *   /api/radio/metadata[?source=mainradio]
 *   /api/radio/listeners
 *   /api/radio/history
 */

const TARGETS = {
  idjStream: 'https://my.idjstream.com/8686/stream',
  idjInfo: 'https://my.idjstream.com/cp/get_info.php?p=8686',
  idjHistory: 'https://my.idjstream.com/666soundsdesign/7.html',
  idjAltStream: 'https://my.idjstream.com/666soundsdesign/stream',
  idjStats: 'https://my.idjstream.com:8686/stats?sid=1',
  sunshineBunker: 'https://stream.sunshine-live.de/amsterdam/mp3-192/stream.sunshine-live.de/',
  sunshineClub: 'https://stream.sunshine-live.de/club/mp3-192/stream.sunshine-live.de/',
  sunshineClubsounds: 'https://stream.sunshine-live.de/playlist1/mp3-192/stream.sunshine-live.de/',
  sunshineIamraving: 'https://stream.sunshine-live.de/iamraving/mp3-192/stream.sunshine-live.de/',
  sunshineMelodictechno: 'https://stream.sunshine-live.de/melodic-techno/mp3-192/stream.sunshine-live.de/'
};

const ALLOWLIST = Object.values(TARGETS);

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': 'Range,Content-Type,Accept,Origin',
    'Access-Control-Expose-Headers': 'Content-Length,Content-Range,Accept-Ranges,Content-Type',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/radio/metadata') return json(await buildMetadata(url.searchParams.get('source') || 'mainradio'), origin);
    if (url.pathname === '/api/radio/listeners') return json(await buildListeners(), origin);
    if (url.pathname === '/api/radio/history') return json(await buildHistory(), origin);

    if (url.pathname !== '/cors') {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
    }

    const target = url.searchParams.get('u');
    if (!target) return new Response('Missing u', { status: 400, headers: corsHeaders(origin) });

    let decoded;
    try { decoded = decodeURIComponent(target); }
    catch { return new Response('Bad u', { status: 400, headers: corsHeaders(origin) }); }

    if (!ALLOWLIST.includes(decoded)) {
      return new Response('Blocked (not allowlisted)', { status: 403, headers: corsHeaders(origin) });
    }

    const upstream = await fetch(decoded, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'Range': request.headers.get('Range') || '',
        'Accept': request.headers.get('Accept') || '*/*',
        'User-Agent': '666SOUNDsDESIGn-Worker/1.0'
      }
    });

    const headers = new Headers(upstream.headers);
    Object.entries(corsHeaders(origin)).forEach(([k,v]) => headers.set(k,v));
    headers.set('Cache-Control', decoded.includes('/stream') ? 'no-store' : 'max-age=5');
    if (!headers.get('Content-Type')) {
      headers.set('Content-Type', decoded.includes('get_info.php') ? 'application/json; charset=utf-8' : (decoded.endsWith('.html') ? 'text/plain; charset=utf-8' : 'audio/mpeg'));
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  }
};

async function buildMetadata(source) {
  if (String(source).startsWith('sunshine_')) {
    return {
      ok: true,
      source,
      sourceType: 'sunshine',
      title: sourceLabelFromKey(source),
      dj: sourceLabelFromKey(source),
      djusername: sourceLabelFromKey(source),
      bitrate: '192',
      listeners: 0,
      unique: 0,
      art: '',
      image: '',
      cover: '',
      history: []
    };
  }

  const [infoRaw, statsRaw, history] = await Promise.all([
    fetchTarget(TARGETS.idjInfo, 'json-or-text').catch(() => ({})),
    fetchTarget(TARGETS.idjStats, 'text').catch(() => ''),
    buildHistory().catch(() => ({ history: [] }))
  ]);

  const info = normalizeInfo(infoRaw);
  const stats = parseStats(statsRaw);
  const title = firstNonEmpty(info.title, info.songtitle, info.currenttrack, info.currentSong, stats.currentSong, 'LIVE · 666SOUNDsDESIGn · Online ·');
  const dj = firstNonEmpty(info.dj, info.djusername, info.dj_name, 'AUTOMIX');
  const image = firstNonEmpty(info.art, info.image, info.cover, '');
  const bitrate = firstNonEmpty(info.bitrate, stats.bitrate, '—');

  return {
    ok: true,
    source: 'idj-worker-aggregated',
    sourceType: 'radio',
    title,
    dj,
    djusername: dj,
    bitrate,
    listeners: toNumber(stats.listeners, info.listeners, info.currentlisteners, 0),
    unique: toNumber(stats.unique, info.unique, info.uniquelisteners, 0),
    peakListeners: toNumber(stats.peakListeners, info.peaklisteners, 0),
    maxListeners: toNumber(stats.maxListeners, info.maxlisteners, 0),
    streamStatus: firstNonEmpty(stats.streamStatus, info.streamstatus, 'ONLINE'),
    art: image,
    image,
    cover: image,
    history: history.history || [],
    raw: { info, stats }
  };
}

async function buildListeners() {
  const statsRaw = await fetchTarget(TARGETS.idjStats, 'text').catch(() => '');
  const stats = parseStats(statsRaw);
  return {
    ok: true,
    source: 'idj-stats',
    listeners: toNumber(stats.listeners, 0),
    unique: toNumber(stats.unique, 0),
    peakListeners: toNumber(stats.peakListeners, 0),
    maxListeners: toNumber(stats.maxListeners, 0),
    streamStatus: firstNonEmpty(stats.streamStatus, 'ONLINE'),
    bitrate: firstNonEmpty(stats.bitrate, '—'),
    currentSong: firstNonEmpty(stats.currentSong, '')
  };
}

async function buildHistory() {
  const raw = await fetchTarget(TARGETS.idjHistory, 'text');
  const history = parseHistory(raw);
  return { ok: true, source: 'idj-history', history };
}

async function fetchTarget(target, mode) {
  const res = await fetch(target, { headers: { 'User-Agent': '666SOUNDsDESIGn-Worker/1.0', 'Accept': '*/*' } });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${target}`);
  if (mode === 'json') return res.json();
  if (mode === 'text') return res.text();
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

function normalizeInfo(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  const text = String(raw);
  try { return JSON.parse(text); } catch {}
  const map = parseGenericKeyValue(text);
  return {
    title: firstNonEmpty(map.title, map.songtitle, map.currenttrack, map.currentsong),
    dj: firstNonEmpty(map.dj, map.djusername, map.dj_name),
    listeners: toNumber(map.listeners, map.currentlisteners, 0),
    bitrate: firstNonEmpty(map.bitrate, ''),
    image: firstNonEmpty(map.image, map.cover, map.art, '')
  };
}

function parseStats(raw) {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw || {});
  const map = parseGenericKeyValue(text);
  return {
    listeners: toNumber(map.currentlisteners, map.listeners, extractNumber(text, /currentlisteners[^\d]*(\d+)/i), extractNumber(text, /listeners[^\d]*(\d+)/i)),
    unique: toNumber(map.uniquelisteners, map.unique, map.unique_listeners, extractNumber(text, /uniquelisteners[^\d]*(\d+)/i), extractNumber(text, /unique[^\d]*(\d+)/i)),
    peakListeners: toNumber(map.peaklisteners, extractNumber(text, /peaklisteners[^\d]*(\d+)/i)),
    maxListeners: toNumber(map.maxlisteners, extractNumber(text, /maxlisteners[^\d]*(\d+)/i)),
    bitrate: firstNonEmpty(map.bitrate, extractText(text, /bitrate[^\d]*(\d+)/i)),
    currentSong: firstNonEmpty(map.currentsong, map.title, map.songtitle),
    streamStatus: firstNonEmpty(map.streamstatus, map.status, 'ONLINE')
  };
}

function parseGenericKeyValue(raw) {
  const text = String(raw || '');
  const cleaned = text
    .replace(/<\/?(?:br|p|div|tr|td|th|li|ul|table|tbody|thead)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lines = cleaned.split(/\n|\|/).map(v => v.trim()).filter(Boolean);
  const out = {};
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9 _-]{2,40})\s*[:=]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '');
    out[key] = m[2].trim();
  }
  return out;
}

function extractNumber(text, regex) {
  const match = String(text || '').match(regex);
  return match ? Number(match[1]) : undefined;
}

function extractText(text, regex) {
  const match = String(text || '').match(regex);
  return match ? match[1] : '';
}

function parseHistory(raw) {
  const text = String(raw || '');
  const cleaned = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const matches = Array.from(cleaned.matchAll(/>([^<>]{4,160})</g)).map(m => sanitize(m[1]));
  const filtered = [];
  for (const item of matches) {
    if (!item) continue;
    if (/^(home|contact|impressum|privacy|cookies)$/i.test(item)) continue;
    if (/^\d{1,2}:\d{2}/.test(item) || / - /.test(item) || / · /.test(item)) filtered.push(item);
  }
  return Array.from(new Set(filtered)).slice(0, 8);
}

function sourceLabelFromKey(key) {
  return String(key || '').replace(/^sunshine_/, 'Sunshine ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function sanitize(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function toNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function json(data, origin) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
      'Cache-Control': 'no-store'
    }
  });
}
