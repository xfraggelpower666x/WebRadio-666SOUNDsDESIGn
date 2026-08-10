/*
 * 666SOUNDsDESIGn — Discord Global Now Playing Router
 * Version: V1.0-20260810
 * Wraps the existing Discord addon only for automatic Now Playing delivery.
 * Manual Discord messages and manual Now Playing remain available unchanged.
 */

function routerJson(data, status = 200) {
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

function clean(value, max = 800) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function trackKey(input = {}) {
  const artist = clean(input.artist, 160).toLowerCase();
  const title = clean(input.title || input.track, 240).toLowerCase();
  const nowPlaying = clean(input.nowPlaying || input.now_playing || input.songtitle, 360).toLowerCase();
  const key = (artist || title) ? `${artist}::${title}` : nowPlaying;
  return key.replace(/unknown|live stream|666soundsdesign webradio/g, '').trim() ? key : '';
}

function isManualNowPlaying(input = {}) {
  return clean(input.reason, 80).toLowerCase() === 'manual-now-playing';
}

function gateStub(env) {
  const namespace = env && env.DISCORD_NOWPLAYING_GATE;
  if (!namespace || typeof namespace.idFromName !== 'function' || typeof namespace.get !== 'function') return null;
  const id = namespace.idFromName('666soundsdesign-global-now-playing');
  return namespace.get(id);
}

async function gateCall(stub, action, body) {
  const response = await stub.fetch(new Request(`https://discord-nowplaying-gate.local/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  }));
  let data = {};
  try { data = await response.json(); } catch (_) {}
  return { response, data };
}

async function responseData(response) {
  if (!response || typeof response.clone !== 'function') return {};
  try { return await response.clone().json(); } catch (_) { return {}; }
}

export async function handleDiscordNotifyWithGlobalTrackGate(request, env = {}, fallbackHandler) {
  if (typeof fallbackHandler !== 'function') throw new Error('discord_fallback_handler_missing');

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (path !== '/api/discord/nowplaying' || request.method !== 'POST') {
    return fallbackHandler(request, env);
  }

  let input = {};
  try { input = await request.clone().json(); } catch (_) {}

  // Explicit manual Now Playing remains a user action and may intentionally repeat the current title.
  if (isManualNowPlaying(input)) return fallbackHandler(request, env);

  const key = trackKey(input);
  if (!key) return fallbackHandler(request, env);

  const stub = gateStub(env);
  if (!stub) {
    // Compatibility fallback for local/dev environments without the Durable Object binding.
    return fallbackHandler(request, env);
  }

  let claim;
  try {
    claim = await gateCall(stub, 'claim', { key });
  } catch (error) {
    return routerJson({
      ok: false,
      led: 'error',
      error: 'global_nowplaying_gate_unreachable',
      detail: clean(error && error.message ? error.message : error, 180)
    }, 503);
  }

  if (claim.data && claim.data.duplicate === true) {
    return routerJson({
      ok: true,
      skipped: true,
      deduped: true,
      globalGate: true,
      reason: claim.data.reason || 'global_duplicate_track',
      led: 'dedupe'
    });
  }

  if (!claim.response.ok || !claim.data || claim.data.claimed !== true || !claim.data.token) {
    return routerJson({
      ok: false,
      led: 'warning',
      error: 'global_nowplaying_gate_busy',
      retryAfterMs: Number(claim.data && claim.data.retryAfterMs || 1000),
      reason: clean(claim.data && claim.data.reason || 'gate_busy', 120)
    }, 409);
  }

  const token = claim.data.token;
  let resultResponse = null;
  try {
    resultResponse = await fallbackHandler(request, env);
    const data = await responseData(resultResponse);
    const accepted = Boolean(resultResponse && resultResponse.ok && data && data.ok === true);
    if (accepted) {
      try { await gateCall(stub, 'commit', { key, token }); } catch (_) {}
    } else {
      try { await gateCall(stub, 'release', { key, token }); } catch (_) {}
    }
    return resultResponse;
  } catch (error) {
    try { await gateCall(stub, 'release', { key, token }); } catch (_) {}
    throw error;
  }
}
