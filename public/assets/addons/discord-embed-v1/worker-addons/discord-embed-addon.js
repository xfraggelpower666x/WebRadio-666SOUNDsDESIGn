/*
############################################################
# 666SOUNDsDESIGn — Discord Embed Addon Worker Module
# Created: 2026-05-05
# Modified: 2026-05-05
# Version: V1.0
# Purpose: Secret-safe Discord webhook sender for Player Embed cards.
# Change Summary:
# - Add-only helper for Cloudflare Worker integration.
# - Keeps DISCORD_WEBHOOK_URL server-side in env/secret.
# - Provides POST /api/discord/player-card compatible handler.
############################################################
*/

const DEFAULT_PLAYER_URL = 'https://webradio.666soundsdesign-broadcaster.com';
const DEFAULT_PREVIEW_IMAGE = 'https://webradio.666soundsdesign-broadcaster.com/assets/discord/discord-preview.svg';
const DEFAULT_AVATAR = 'https://webradio.666soundsdesign-broadcaster.com/assets/images/logo-neon.png';

function jsonResponse(data, status = 200) {
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

function buildDiscordPlayerPayload(input = {}) {
  const playerUrl = String(input.playerUrl || DEFAULT_PLAYER_URL).trim();
  const previewImage = String(input.previewImage || DEFAULT_PREVIEW_IMAGE).trim();
  const avatarUrl = String(input.avatarUrl || DEFAULT_AVATAR).trim();
  const nowPlaying = String(input.nowPlaying || 'Live Cyber Radio Player').trim();
  const listeners = input.listeners !== undefined && input.listeners !== null ? String(input.listeners).trim() : 'live';
  const source = String(input.source || 'Mainstream / Backstream').trim();
  const title = String(input.title || '🎧 666SOUNDsDESIGn WebRadio').trim();

  return {
    username: '666SOUNDsDESIGn Radio',
    avatar_url: avatarUrl,
    content: '',
    embeds: [
      {
        title,
        description: [
          `**Now Playing:** ${nowPlaying}`,
          `**Source:** ${source}`,
          `**Listeners:** ${listeners}`,
          '',
          'Cyber Radio System online.'
        ].join('\n'),
        url: playerUrl,
        color: 65535,
        image: { url: previewImage },
        footer: { text: '666SOUNDsDESIGn • Player Embed Addon V1' },
        timestamp: new Date().toISOString()
      }
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: '▶️ Player öffnen',
            url: playerUrl
          }
        ]
      }
    ]
  };
}

async function readJsonSafe(request) {
  try {
    const type = request.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('application/json')) return {};
    return await request.json();
  } catch (_) {
    return {};
  }
}

function isAuthorized(request, env) {
  // Deutscher Kommentar: Optionaler Admin-Schutz. Wenn DISCORD_ADMIN_TOKEN nicht gesetzt ist, ist der Endpoint offen.
  // Empfehlung: Für öffentliches Repo/Domain DISCORD_ADMIN_TOKEN als Secret setzen.
  if (!env.DISCORD_ADMIN_TOKEN) return true;
  const token = request.headers.get('x-admin-token') || '';
  return token === env.DISCORD_ADMIN_TOKEN;
}

export async function handleDiscordPlayerCard(request, env) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true, route: '/api/discord/player-card', method: 'OPTIONS' });
  }

  if (!env || !env.DISCORD_WEBHOOK_URL) {
    return jsonResponse({ ok: false, error: 'DISCORD_WEBHOOK_URL secret missing' }, 500);
  }

  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      addon: '666SOUNDsDESIGn Discord Embed Addon',
      version: 'V1.0',
      route: '/api/discord/player-card',
      methods: ['POST'],
      secretRequired: ['DISCORD_WEBHOOK_URL'],
      optionalSecret: ['DISCORD_ADMIN_TOKEN']
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(request, env)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const input = await readJsonSafe(request);
  const payload = buildDiscordPlayerPayload(input);
  const webhookUrl = String(env.DISCORD_WEBHOOK_URL).includes('?')
    ? `${env.DISCORD_WEBHOOK_URL}&with_components=true`
    : `${env.DISCORD_WEBHOOK_URL}?with_components=true`;

  const discordResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const bodyText = await discordResponse.text();

  if (!discordResponse.ok) {
    return jsonResponse({
      ok: false,
      discordStatus: discordResponse.status,
      discordBody: bodyText.slice(0, 500)
    }, 502);
  }

  return jsonResponse({
    ok: true,
    sent: true,
    discordStatus: discordResponse.status,
    playerUrl: payload.embeds[0].url
  });
}

/*
INTEGRATION IN BESTEHENDEN worker.js:

1) Oben einfügen:
import { handleDiscordPlayerCard } from './worker-addons/discord-embed-addon.js';

2) In fetch(request, env, ctx) nach URL-Erstellung einfügen:
if (url.pathname === '/api/discord/player-card') {
  return handleDiscordPlayerCard(request, env);
}

3) Secret setzen:
DISCORD_WEBHOOK_URL = Discord Webhook URL
Optional: DISCORD_ADMIN_TOKEN = eigenes Admin-Passwort/Token
*/
