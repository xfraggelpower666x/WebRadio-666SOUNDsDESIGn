/*
############################################################
# 666SOUNDsDESIGn — Discord Webhook HTML Player Add-on
# Created: 2026-05-07
# Modified: 2026-05-07
# Version: V3.2
# Purpose: Secret-safe Discord bridge with access-gated manual player card posts.
# Change Summary:
# - Add-only Worker routes; no stream/fallback/notfallplayer logic touched.
# - NO_KV / NO_R2: uses only in-memory cooldown/dedupe as safety net.
# - Adds manual radio-info/player-share post and track-change nowplaying post.
# - Returns compact status JSON for frontend LED indicator.
############################################################
*/

const ADDON_VERSION = 'V3.2-20260507-GATE-REPAIR';
const DEFAULT_RADIO_NAME = '666SOUNDsDESIGn WebRadio';
const DEFAULT_DOMAIN = 'webradio.666soundsdesign-broadcaster.com';
const DEFAULT_PLAYER_URL = 'https://webradio.666soundsdesign-broadcaster.com';
const DEFAULT_STREAM_URL = 'https://webradio.666soundsdesign-broadcaster.com/api/radio/stream';
const DEFAULT_PREVIEW_IMAGE = 'https://webradio.666soundsdesign-broadcaster.com/assets/icons/icon-512x512.png';
const DEFAULT_USERNAME = '666SOUNDsDESIGn Radio';
const MIN_TRACK_COOLDOWN_MS = 20000;
const MIN_MANUAL_COOLDOWN_MS = 10000;

const runtime = globalThis.__S666_DISCORD_V3_RUNTIME__ || {
  lastTrackKey: '',
  lastTrackAt: 0,
  lastManualAt: 0,
  lastOkAt: 0,
  lastErrorAt: 0,
  lastError: '',
  lastKind: 'idle'
};
globalThis.__S666_DISCORD_V3_RUNTIME__ = runtime;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-token,x-discord-gate-code'
    }
  });
}

function clean(value, fallback = '', max = 500) {
  return String(value ?? fallback).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function readInput(request) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const out = {};
    for (const [k, v] of url.searchParams.entries()) out[k] = v;
    return out;
  }
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await request.json(); } catch { return {}; }
  }
  try { return Object.fromEntries((await request.formData()).entries()); } catch { return {}; }
}

function nowIso() { return new Date().toISOString(); }

function trackKey(input) {
  const artist = clean(input.artist, '', 160).toLowerCase();
  const title = clean(input.title || input.track, '', 240).toLowerCase();
  const nowPlaying = clean(input.nowPlaying, '', 360).toLowerCase();
  return (artist || title) ? `${artist}::${title}` : nowPlaying;
}

function baseSettings(input = {}) {
  const domain = clean(input.domain || input.subdomain, DEFAULT_DOMAIN, 180).replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const playerUrl = clean(input.playerUrl, `https://${domain}`, 300);
  const streamUrl = clean(input.streamUrl, `https://${domain}/api/radio/stream`, 300);
  return {
    radioName: clean(input.radioName, DEFAULT_RADIO_NAME, 180),
    domain,
    playerUrl,
    streamUrl,
    previewImage: clean(input.previewImage, DEFAULT_PREVIEW_IMAGE, 400),
    username: clean(input.username, DEFAULT_USERNAME, 120),
    discordInfo: clean(input.discordInfo || input.discord || '', '', 400),
    embedInfo: clean(input.embedInfo || input.embedCode || '', '', 800)
  };
}

function safeImage(url) {
  const u = clean(url, '', 400);
  if (!u) return null;
  // Discord embeds are more reliable with PNG/JPG/WEBP/GIF than SVG.
  if (/\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(u)) return { url: u };
  return null;
}

function manualPayload(input = {}) {
  const s = baseSettings(input);
  const embedText = s.embedInfo || `Embed info for other websites / apps:\n${s.streamUrl}`;
  const lines = [
    `**Radio:** ${s.radioName}`,
    `**Domain:** ${s.domain}`,
    `**Player:** ${s.playerUrl}`,
    `**Webradio-Stream:** ${s.streamUrl}`,
    '',
    embedText,
    '',
    `▶️ Open Player: ${s.playerUrl}`
  ];
  if (s.discordInfo) lines.push('', `**Discord:** ${s.discordInfo}`);
  const embed = {
    title: `🚀 ${s.radioName}`,
    description: lines.join('\n').slice(0, 4000),
    url: s.playerUrl,
    color: 0xff3dbb,
    footer: { text: '666SOUNDsDESIGn • Cyber Radio System • Player Card' },
    timestamp: nowIso()
  };
  const image = safeImage(s.previewImage);
  if (image) embed.image = image;
  return { username: s.username, embeds: [embed] };
}

function nowPlayingPayload(input = {}) {
  const s = baseSettings(input);
  const artist = clean(input.artist, '', 160);
  const title = clean(input.title || input.track, '', 240);
  const np = clean(input.nowPlaying, artist || title ? `${artist}${artist && title ? ' – ' : ''}${title}` : 'Live Stream', 360);
  const source = clean(input.source, 'Mainstream / Backup Stream / Auto Switch', 180);
  return {
    username: s.username,
    embeds: [{
      title: '▶️ Now Playing',
      description: `**${np}**\n\n**Radio:** ${s.radioName}\n**Source:** ${source}`,
      url: s.playerUrl,
      color: 0x7b4dff,
      footer: { text: '666SOUNDsDESIGn • Now Playing' },
      timestamp: nowIso()
    }],
  };
}

function getDiscordWebhook(env) {
  return env && (env.DISCORD_WEBHOOK_URL || env.DISCORD_WEBHOOK || env.DISCORD_WEBHOOK_URI || env.DISCORD_WEBHOOK_ENDPOINT || env.WEBHOOK_URL);
}

async function sendDiscord(env, payload) {
  const webhook = getDiscordWebhook(env);
  if (!webhook) throw new Error('Discord webhook secret missing. Accepted names: DISCORD_WEBHOOK_URL, DISCORD_WEBHOOK, DISCORD_WEBHOOK_URI, DISCORD_WEBHOOK_ENDPOINT, WEBHOOK_URL.');
  const url = String(webhook);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}: ${text.slice(0, 300)}`);
  runtime.lastOkAt = Date.now();
  runtime.lastError = '';
  return { status: res.status, body: text || 'OK' };
}

function tokenOk(request, env) {
  if (!env || !env.DISCORD_ADMIN_TOKEN) return true;
  return request.headers.get('x-admin-token') === env.DISCORD_ADMIN_TOKEN;
}

const FALLBACK_DISCORD_GATE_SHA256 = '911aa98122df056905093e0e83a4a0b0f304f32bcf2e69cf035347ddc8872cb0';

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function gateCodeOk(request, env) {
  const given = clean(request.headers.get('x-discord-gate-code') || '', '', 140);
  if (!given) return false;
  if (env && env.DISCORD_GATE_CODE) return given === String(env.DISCORD_GATE_CODE);
  const expectedHash = String((env && env.DISCORD_GATE_SHA256) || FALLBACK_DISCORD_GATE_SHA256).trim().toLowerCase();
  return (await sha256Hex(given)) === expectedHash;
}

export async function handleDiscordNotifyV3(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const isRoute = path === '/api/discord/manual' || path === '/api/discord/share' || path === '/api/discord/nowplaying' || path === '/api/discord/status' || path === '/api/discord/debug';
  if (!isRoute) return null;

  if (request.method === 'OPTIONS') return json({ ok: true, addon: ADDON_VERSION });

  if (path === '/api/discord/status' || path === '/api/discord/debug') {
    return json({
      ok: true,
      addon: ADDON_VERSION,
      mode: 'NO_KV_NO_R2_PLAYER_EVENT_DRIVEN',
      webhookConfigured: Boolean(getDiscordWebhook(env)),
      acceptedWebhookSecretNames: ['DISCORD_WEBHOOK_URL','DISCORD_WEBHOOK','DISCORD_WEBHOOK_URI','DISCORD_WEBHOOK_ENDPOINT','WEBHOOK_URL'],
      adminTokenEnabled: Boolean(env && env.DISCORD_ADMIN_TOKEN),
      gateCodeEnabled: true,
      lastKind: runtime.lastKind,
      lastOkAt: runtime.lastOkAt ? new Date(runtime.lastOkAt).toISOString() : null,
      lastErrorAt: runtime.lastErrorAt ? new Date(runtime.lastErrorAt).toISOString() : null,
      lastError: runtime.lastError || '',
      lastTrackKey: runtime.lastTrackKey ? '[set]' : ''
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
  if (!tokenOk(request, env)) return json({ ok: false, error: 'invalid admin token' }, 401);
  if ((path === '/api/discord/manual' || path === '/api/discord/share') && !(await gateCodeOk(request, env))) {
    runtime.lastKind = 'access-denied';
    return json({ ok: false, led: 'error', error: 'access denied: invalid discord gate code', addon: ADDON_VERSION }, 401);
  }

  try {
    const input = await readInput(request);
    if (path === '/api/discord/nowplaying') {
      const key = trackKey(input);
      if (!key) return json({ ok: false, error: 'track/artist/title/nowPlaying fehlt' }, 400);
      const now = Date.now();
      if (key === runtime.lastTrackKey && now - runtime.lastTrackAt < MIN_TRACK_COOLDOWN_MS) {
        runtime.lastKind = 'nowplaying-dedupe';
        return json({ ok: true, skipped: true, reason: 'duplicate track cooldown', led: 'dedupe', addon: ADDON_VERSION });
      }
      runtime.lastTrackKey = key;
      runtime.lastTrackAt = now;
      runtime.lastKind = 'nowplaying';
      const result = await sendDiscord(env, nowPlayingPayload(input));
      return json({ ok: true, type: 'nowplaying', led: 'ok', discord: result, addon: ADDON_VERSION });
    }

    const now = Date.now();
    if (now - runtime.lastManualAt < MIN_MANUAL_COOLDOWN_MS) {
      runtime.lastKind = 'manual-cooldown';
      return json({ ok: true, skipped: true, reason: 'manual cooldown', led: 'cooldown', addon: ADDON_VERSION });
    }
    runtime.lastManualAt = now;
    runtime.lastKind = 'manual';
    const result = await sendDiscord(env, manualPayload(input));
    return json({ ok: true, type: 'manual', led: 'ok', discord: result, addon: ADDON_VERSION });
  } catch (err) {
    runtime.lastErrorAt = Date.now();
    runtime.lastError = err && err.message ? err.message : String(err);
    runtime.lastKind = 'error';
    return json({ ok: false, led: 'error', error: runtime.lastError, addon: ADDON_VERSION }, 500);
  }
}
