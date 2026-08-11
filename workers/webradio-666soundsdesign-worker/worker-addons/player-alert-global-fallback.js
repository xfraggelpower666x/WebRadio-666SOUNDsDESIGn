/*
 * 666SOUNDsDESIGn — Player Alert Global Durable Object Fallback
 * Version: V1.0-20260811
 *
 * Render remains the primary Player Alert backend. This wrapper mirrors every
 * successful send into the already-existing Durable Object binding and uses a
 * dedicated Durable Object instance when Render/KV fall back to edge-local
 * cache or return no active alert. No new Worker or Cloudflare resource is
 * created; the existing DISCORD_NOWPLAYING_GATE binding is reused with a
 * separate instance name and separate storage keys.
 */

const PLAYER_ALERT_DO_INSTANCE = 'player-alert-global-v1';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store'
    }
  });
}

async function responseJson(response) {
  if (!response) return null;
  try {
    return await response.clone().json();
  } catch (_) {
    return null;
  }
}

function durableObjectStub(env) {
  const binding = env && env.DISCORD_NOWPLAYING_GATE;
  if (!binding || typeof binding.idFromName !== 'function' || typeof binding.get !== 'function') return null;
  try {
    return binding.get(binding.idFromName(PLAYER_ALERT_DO_INSTANCE));
  } catch (_) {
    return null;
  }
}

async function durableObjectFetch(env, path, init = {}) {
  const stub = durableObjectStub(env);
  if (!stub || typeof stub.fetch !== 'function') return null;
  try {
    const request = new Request(`https://player-alert-global.internal${path}`, {
      method: init.method || 'GET',
      headers: { 'content-type': 'application/json' },
      body: init.body
    });
    const response = await stub.fetch(request);
    const data = await responseJson(response);
    return { ok: Boolean(response && response.ok), status: response ? response.status : 0, data };
  } catch (_) {
    return null;
  }
}

function hasItems(data) {
  return Boolean(data && Array.isArray(data.items) && data.items.length);
}

function isActive(data) {
  return Boolean(data && data.active === true && data.message);
}

function shouldMirrorSend(response, data) {
  return Boolean(response && response.ok && data && data.ok !== false && data.message && data.timestamp);
}

export async function handlePlayerAlertWithGlobalFallback(request, env, forward) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/player-alert/')) return forward(request, env);

  if (url.pathname === '/api/player-alert/status' && request.method === 'GET') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);
    if (!data || typeof data !== 'object') return primary;
    const bus = await durableObjectFetch(env, '/player-alert/status');
    return json({
      ...data,
      durableObjectFallbackConfigured: Boolean(durableObjectStub(env)),
      durableObjectFallbackOk: Boolean(bus && bus.ok && bus.data && bus.data.ok),
      durableObjectFallbackActive: Boolean(bus && bus.data && bus.data.current_active),
      mode: 'backend-primary-durable-object-global-fallback-optional-kv-cache-tertiary'
    }, primary.status);
  }

  if (url.pathname === '/api/player-alert/send' && request.method === 'POST') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);
    if (!shouldMirrorSend(primary, data)) return primary;

    const stored = await durableObjectFetch(env, '/player-alert/store', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (stored && stored.ok && data.source !== 'backend' && data.source !== 'kv-fallback') {
      return json({
        ...data,
        source: 'durable-object-fallback',
        fallback: true,
        fallbackFrom: data.source || 'worker-fallback'
      }, primary.status);
    }
    return primary;
  }

  if (url.pathname === '/api/player-alert/current' && request.method === 'GET') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);

    if (isActive(data) && (data.source === 'backend' || data.source === 'kv-fallback')) return primary;

    const bus = await durableObjectFetch(env, '/player-alert/current');
    if (bus && bus.ok && isActive(bus.data)) {
      return json({
        ...bus.data,
        source: 'durable-object-fallback',
        fallbackFrom: data && data.source ? data.source : 'none'
      });
    }
    return primary;
  }

  if (url.pathname === '/api/player-alert/history' && request.method === 'GET') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);
    if (hasItems(data) && (data.source === 'backend' || data.source === 'kv-fallback')) return primary;

    const bus = await durableObjectFetch(env, '/player-alert/history');
    if (bus && bus.ok && hasItems(bus.data)) {
      return json({
        ...bus.data,
        source: 'durable-object-fallback',
        fallbackFrom: data && data.source ? data.source : 'none'
      });
    }
    return primary;
  }

  return forward(request, env);
}

export const PLAYER_ALERT_GLOBAL_FALLBACK_INSTANCE = PLAYER_ALERT_DO_INSTANCE;
