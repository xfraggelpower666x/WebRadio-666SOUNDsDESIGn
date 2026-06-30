import { verifyAdminAuth, verifyPwIssuedToken } from './radio-admin-config-addon.js';
/*
############################################################
# 666SOUNDsDESIGn — Discord Webhook HTML Player Add-on
# Created: 2026-05-07
# Modified: 2026-05-07
# Version: V3.8
# Purpose: Secret-safe Discord bridge with structured underground broadcast embeds, metadata, artwork, socials and access-gated posts.
# Change Summary:
# - Add-only Worker routes; no stream/fallback/notfallplayer logic touched.
# - NO_KV / NO_R2: uses only in-memory cooldown/dedupe as safety net.
# - Adds manual radio-info/player-share post and track-change nowplaying post.
# - V3.8: Manual big broadcast post stays manual; automatic song-change post is compact, metadata-focused and deduped.
# - V3.9: Empty/AutoDJ/no-DJ metadata is normalized to DJ: 666 DJ for all Discord embeds.
# - V3.10: Optional private-channel track-change webhook mirrors nowplaying posts.
# - V3.11: Accepts existing Cloudflare Secret PRIVATE_TRACK_SHOOTER.
# - Returns compact status JSON for frontend LED indicator.
############################################################
*/

const ADDON_VERSION = 'V4.0-20260625-SHARED-ADMIN-AUTH';
const DEFAULT_RADIO_NAME = '666SOUNDsDESIGn WebRadio';
const DEFAULT_DOMAIN = 'webradio.666soundsdesign-broadcaster.com';
const DEFAULT_PLAYER_URL = 'https://webradio.666soundsdesign-broadcaster.com';
const DEFAULT_STREAM_URL = 'https://webradio.666soundsdesign-broadcaster.com/stream';
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
      'access-control-allow-headers': 'content-type,authorization,x-admin-token'
    }
  });
}

function clean(value, fallback = '', max = 500) {
  return String(value ?? fallback).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeDiscordDj(value) {
  const fallback = '666 DJ';
  const raw = clean(value, '', 160);
  if (!raw) return fallback;
  const lowered = raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!lowered) return fallback;
  if (lowered === 'unknown' || lowered === 'none' || lowered === 'n a' || lowered === 'na') return fallback;
  if (lowered === 'no dj' || lowered === 'nodj' || lowered === 'no dj status') return fallback;
  if (lowered.includes('auto dj') || lowered.includes('autodj') || lowered.includes('auto-dj')) return fallback;
  if (lowered.includes('dj 666') || lowered.includes('dj-666')) return fallback;
  if (lowered.includes('666soundsdesign dj')) return fallback;
  return raw;
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
  const nowPlaying = clean(input.nowPlaying || input.now_playing || input.songtitle, '', 360).toLowerCase();
  const key = (artist || title) ? `${artist}::${title}` : nowPlaying;
  return key.replace(/unknown|live stream|666soundsdesign webradio/g, '').trim() ? key : '';
}

function baseSettings(input = {}) {
  const domain = clean(input.domain || input.subdomain, DEFAULT_DOMAIN, 180).replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const playerUrl = clean(input.playerUrl, `https://${domain}`, 300);
  const streamUrl = clean(input.streamUrl, `https://${domain}/stream`, 300);
  return {
    radioName: clean(input.radioName, DEFAULT_RADIO_NAME, 180),
    domain,
    playerUrl,
    streamUrl,
    backupStreamUrl: clean(input.backupStreamUrl, 'https://my.idjstream.com/666soundsdesign/stream', 300),
    previewImage: clean(input.previewImage, DEFAULT_PREVIEW_IMAGE, 400),
    artwork: clean(input.artwork || input.cover || input.coverArt || input.cover_url || input.image || input.icon || input.logo || input.albumArt || input.album_art || input.art, '', 400),
    username: clean(input.username, DEFAULT_USERNAME, 120),
    discordInfo: clean(input.discordInfo || input.discord || '', '', 400),
    embedInfo: clean(input.embedInfo || input.embedCode || '', '', 800),
    soundcloudUrl: clean(input.soundcloudUrl, 'https://soundcloud.com/fraggelpower666', 300),
    mixcloudUrl: clean(input.mixcloudUrl, 'https://www.mixcloud.com/Fraggelpower666/', 300),
    youtubeUrl: clean(input.youtubeUrl, 'https://music.youtube.com/@fraggelpower666', 300),
    facebookUrl: clean(input.facebookUrl, 'https://www.facebook.com/PsyTranceFraggeL2k', 300),
    instagramUrl: clean(input.instagramUrl, 'https://www.instagram.com/fraggelpower/', 300),
    tiktokUrl: clean(input.tiktokUrl, 'https://www.tiktok.com/@fraggelpower666', 300),
    discordProfileUrl: clean(input.discordProfileUrl, 'https://discord.com/users/1332026823168757776', 300),
    distrokidUrl1: clean(input.distrokidUrl1, 'https://distrokid.com/hyperfollow/fraggelpower666/dark-techno-hyper-psy-trance-full-on', 300),
    distrokidUrl2: clean(input.distrokidUrl2, 'https://distrokid.com/hyperfollow/fraggelpower666/the-dark-dancer-volume-i', 300),
    distrokidUrl3: clean(input.distrokidUrl3, 'https://distrokid.com/hyperfollow/fraggelpower666/the-dark-dancer-volume-ii', 300)
  };
}

function safeImage(url) {
  const u = clean(url, '', 400);
  if (!u) return null;
  // Discord embeds are more reliable with PNG/JPG/WEBP/GIF than SVG.
  if (/\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(u)) return { url: u };
  return null;
}

function metadataValues(input = {}) {
  const artist = clean(input.artist, '', 180);
  const title = clean(input.title || input.track, '', 260);
  const np = clean(input.nowPlaying || input.now_playing || (artist || title ? `${artist}${artist && title ? ' – ' : ''}${title}` : ''), '', 360) || 'Live Stream';
  const listeners = clean(input.listeners || input.listener_count || input.currentlisteners, 'Unknown', 80);
  const bitrateRaw = clean(input.bitrate || input.kbps || input.stream_bitrate, 'Unknown', 80);
  const bitrate = bitrateRaw === 'Unknown' ? bitrateRaw : String(bitrateRaw).replace(/\s*kbps\s*$/i, '') + ' kbps';
  const dj = normalizeDiscordDj(input.dj || input.djusername || input.djstatus || input.streamer || input.client);
  const source = clean(input.source || input.activeSource || input.streamSource, 'Mainstream / Auto Switch', 180);
  return { artist, title, nowPlaying: np, listeners, bitrate, dj, source };
}

function metadataFields(input = {}) {
  const m = metadataValues(input);
  return [
    { name: '🎵 Now Playing', value: m.nowPlaying.slice(0, 1024), inline: false },
    { name: '👥 Listeners', value: m.listeners.slice(0, 1024), inline: true },
    { name: '📶 Bitrate', value: m.bitrate.slice(0, 1024), inline: true },
    { name: '🎧 DJ / Status', value: m.dj.slice(0, 1024), inline: true },
    { name: '🛰️ Source', value: m.source.slice(0, 1024), inline: true }
  ];
}

function radioIntroText(s) {
  return [
    '🖤🔥 **WELCOME TO 666SOUNDsDESIGn DIGITAL UNDERGROUND** 🔥🖤',
    '',
    '‼️ **THIS IS NOT MAINSTREAM WEB RADIO** ‼️',
    '24/7 PsyTrance · Techno · PsyTechno',
    'Self-produced electronic music from the underground.',
    '',
    '666SOUNDsDESIGn is digital underground — driving energy without compromise.',
    'No algorithm. No trend following. 🖤 Just honest sound. 🖤'
  ].join('\n').slice(0, 4000);
}

function streamLinksText(s) {
  return [
    `🎛️ **Web Radio Tune in:** ${s.playerUrl}`,
    '',
    `**Main Stream:**\n${s.streamUrl}\nhttp://${s.domain}/stream`,
    '',
    `**Backup Stream:**\n${s.backupStreamUrl}\nhttp://my.idjstream.com/666soundsdesign/stream`
  ].join('\n').slice(0, 4000);
}

function socialsText(s) {
  return [
    `🎵 **SoundCloud:** ${s.soundcloudUrl}`,
    `🎵 **Mixcloud:** ${s.mixcloudUrl}`,
    `🎵 **YouTube:** ${s.youtubeUrl}`,
    `🎵 **Facebook:** ${s.facebookUrl}`,
    `🎵 **Instagram:** ${s.instagramUrl}`,
    `🎵 **TikTok:** ${s.tiktokUrl}`,
    `🎵 **Discord:** ${s.discordProfileUrl}`,
    '',
    `💿 **DistroKid Releases:**\n${s.distrokidUrl1}\n${s.distrokidUrl2}\n${s.distrokidUrl3}`
  ].join('\n').slice(0, 4000);
}

function copyrightText() {
  return [
    '🫦 **xXXx_FRAGGLE_xXXx aka FRAGGELPOWER666** 🫦',
    'Live Music Producer · Live Act DJ · Artist Pro',
    'My Music Label → 666SOUNDsDESIGn 2026',
    '',
    'All music you hear from my stream or broadcaster is © FRAGGELPOWER666.',
    'Self-designed music, composed and produced by me.',
    '',
    '🔥 **HAVE FUN AND ENJOY THE UNDERGROUND** 🔥'
  ].join('\n').slice(0, 4000);
}

function applyImages(embed, { thumbnail, image } = {}) {
  const thumb = safeImage(thumbnail);
  const img = safeImage(image);
  if (thumb) embed.thumbnail = thumb;
  if (img) embed.image = img;
  return embed;
}

function manualPayload(input = {}) {
  const s = baseSettings(input);
  const embeds = [];
  embeds.push(applyImages({
    title: '🖤 666SOUNDsDESIGn Digital Underground',
    description: radioIntroText(s),
    url: s.playerUrl,
    color: 0xff3dbb,
    fields: metadataFields(input),
    footer: { text: '666SOUNDsDESIGn • Digital Underground Broadcast' },
    timestamp: nowIso()
  }, { thumbnail: s.previewImage, image: s.artwork }));
  embeds.push(applyImages({
    title: '🎛️ Web Radio Tune In',
    description: streamLinksText(s),
    url: s.playerUrl,
    color: 0x16fff3,
    footer: { text: 'Player • Main Stream • Backup Stream' }
  }, { thumbnail: s.previewImage }));
  embeds.push({
    title: '🌐 Socials & Releases',
    description: socialsText(s),
    color: 0x7b4dff,
    footer: { text: 'SoundCloud • Mixcloud • YouTube • Socials • Releases' }
  });
  embeds.push({
    title: '© 666SOUNDsDESIGn 2026',
    description: copyrightText(),
    color: 0xff3dbb,
    footer: { text: 'FRAGGELPOWER666 • Original Productions Without Compromise' }
  });
  return { username: s.username, content: '🖤🔥 **666SOUNDsDESIGn DIGITAL UNDERGROUND CONNECTED** 🔥🖤', embeds };
}

function nowPlayingPayload(input = {}) {
  const s = baseSettings(input);
  const m = metadataValues(input);
  const embed = applyImages({
    title: '▶️ Now Playing — 666SOUNDsDESIGn',
    description: `**${m.nowPlaying}**\n\n‼️ This is not mainstream web radio.`,
    url: s.playerUrl,
    color: 0x7b4dff,
    fields: metadataFields(input),
    footer: { text: '666SOUNDsDESIGn • Now Playing • Digital Underground' },
    timestamp: nowIso()
  }, { thumbnail: s.previewImage, image: s.artwork });
  return { username: s.username, embeds: [embed] };
}

function messagePayload(input = {}) {
  const s = baseSettings(input);
  const message = clean(input.message || input.text || input.content, '', 1800);
  const embeds = [];
  embeds.push(applyImages({
    title: '💬 666SOUNDsDESIGn Channel Message',
    description: message || 'Message empty.',
    url: s.playerUrl,
    color: 0x16fff3,
    fields: metadataFields(input),
    footer: { text: '666SOUNDsDESIGn • Manual Channel Message' },
    timestamp: nowIso()
  }, { thumbnail: s.previewImage, image: s.artwork }));
  embeds.push({
    title: '🌐 Radio & Social Links',
    description: [streamLinksText(s), '', socialsText(s)].join('\n\n').slice(0, 4000),
    color: 0xff3dbb,
    footer: { text: '666SOUNDsDESIGn • Links' }
  });
  return { username: s.username, embeds };
}

function getDiscordWebhook(env) {
  return env && (env.DISCORD_WEBHOOK_URL || env.DISCORD_WEBHOOK || env.DISCORD_WEBHOOK_URI || env.DISCORD_WEBHOOK_ENDPOINT || env.WEBHOOK_URL);
}

function getPrivateTrackWebhook(env) {
  return env && (
    env.DISCORD_PRIVATE_TRACK_WEBHOOK_URL ||
    env.DISCORD_PRIVATE_WEBHOOK_URL ||
    env.DISCORD_RUBY_TRACK_WEBHOOK_URL ||
    env.DISCORD_TRACK_PRIVATE_WEBHOOK ||
    env.PRIVATE_DISCORD_WEBHOOK_URL ||
    env.PRIVATE_TRACK_SHOOTER
  );
}

async function sendDiscordToWebhook(webhook, payload) {
  if (!webhook) throw new Error('Discord webhook missing.');
  const res = await fetch(String(webhook), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}: ${text.slice(0, 300)}`);
  return { status: res.status, body: text || 'OK' };
}

async function sendDiscord(env, payload) {
  const webhook = getDiscordWebhook(env);
  if (!webhook) throw new Error('Discord webhook secret missing. Accepted names: DISCORD_WEBHOOK_URL, DISCORD_WEBHOOK, DISCORD_WEBHOOK_URI, DISCORD_WEBHOOK_ENDPOINT, WEBHOOK_URL.');
  const result = await sendDiscordToWebhook(webhook, payload);
  runtime.lastOkAt = Date.now();
  runtime.lastError = '';
  return result;
}

async function sendPrivateNowPlayingIfConfigured(env, payload) {
  const privateWebhook = getPrivateTrackWebhook(env);
  if (!privateWebhook) return { configured: false, skipped: true };
  try {
    const result = await sendDiscordToWebhook(privateWebhook, payload);
    return { configured: true, ok: true, result };
  } catch (err) {
    return { configured: true, ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function timingSafeEqualText(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

function serviceTokenOk(request, env = {}) {
  const expected = String(env.DISCORD_ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const headerToken = String(request.headers.get('x-admin-token') || '').trim();
  const auth = String(request.headers.get('authorization') || '').trim();
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return timingSafeEqualText(headerToken || bearer, expected);
}

async function sharedAdminOk(request, env = {}) {
  const auth = await verifyAdminAuth(request, env);
  const pw = verifyPwIssuedToken(auth);
  return Boolean(auth && auth.ok && pw && pw.ok);
}

async function discordAccessOk(request, env = {}) {
  if (serviceTokenOk(request, env)) return true;
  return sharedAdminOk(request, env);
}

export async function handleDiscordNotifyV3(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const isRoute = path === '/api/discord/manual' || path === '/api/discord/share' || path === '/api/discord/message' || path === '/api/discord/nowplaying' || path === '/api/discord/status' || path === '/api/discord/debug';
  if (!isRoute) return null;

  if (request.method === 'OPTIONS') return json({ ok: true, addon: ADDON_VERSION });

  if (path === '/api/discord/status') {
    return json({
      ok: true,
      addon: ADDON_VERSION,
      ready: Boolean(getDiscordWebhook(env)),
      authMode: 'shared-admin-bearer'
    });
  }

  if (path === '/api/discord/debug') {
    if (!(await discordAccessOk(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);
    return json({
      ok: true,
      addon: ADDON_VERSION,
      mode: 'NO_KV_NO_R2_PLAYER_EVENT_DRIVEN',
      webhookConfigured: Boolean(getDiscordWebhook(env)),
      privateTrackWebhookConfigured: Boolean(getPrivateTrackWebhook(env)),
      serviceTokenConfigured: Boolean(env && env.DISCORD_ADMIN_TOKEN),
      sharedAdminAuth: true,
      lastKind: runtime.lastKind,
      lastOkAt: runtime.lastOkAt ? new Date(runtime.lastOkAt).toISOString() : null,
      lastErrorAt: runtime.lastErrorAt ? new Date(runtime.lastErrorAt).toISOString() : null,
      lastError: runtime.lastError || '',
      lastTrackKey: runtime.lastTrackKey ? '[set]' : ''
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
  if (!(await discordAccessOk(request, env))) {
    runtime.lastKind = 'access-denied';
    return json({ ok: false, led: 'error', error: 'shared admin session required', addon: ADDON_VERSION }, 401);
  }

  try {
    const input = await readInput(request);
    if (path === '/api/discord/message') {
      const message = clean(input.message || input.text || input.content, '', 1800);
      if (!message) return json({ ok: false, error: 'message text missing' }, 400);
      runtime.lastKind = 'message';
      const result = await sendDiscord(env, messagePayload(input));
      return json({ ok: true, type: 'message', led: 'ok', discord: result, addon: ADDON_VERSION });
    }
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
      const payload = nowPlayingPayload(input);
      const result = await sendDiscord(env, payload);
      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload);
      return json({ ok: true, type: 'nowplaying', led: 'ok', discord: result, privateTrack, addon: ADDON_VERSION });
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
