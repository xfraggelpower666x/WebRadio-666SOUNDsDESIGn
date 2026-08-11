/*
 * 666SOUNDsDESIGn — Player Alert Global Durable Object Fallback
 * Version: V1.2-20260811
 *
 * Render remains the primary Player Alert backend. This wrapper mirrors every
 * successful send into the already-existing Durable Object binding and uses a
 * dedicated Durable Object instance when Render/KV fall back to edge-local
 * cache or when the global Durable Object has fresher state. History is merged
 * across primary + global state so recovery never hides older valid messages.
 * No new Worker or Cloudflare resource is created; the existing
 * DISCORD_NOWPLAYING_GATE binding is reused with a separate instance name and
 * separate storage keys.
 */

const PLAYER_ALERT_DO_INSTANCE = 'player-alert-global-v1';
const PLAYER_ALERT_HISTORY_LIMIT = 20;

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

function alertFromData(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.alert && typeof data.alert === 'object') return data.alert;
  return data;
}

function responseSource(data) {
  const alert = alertFromData(data);
  return String((data && data.source) || (alert && alert.source) || '').trim();
}

function alertTimestamp(data) {
  const alert = alertFromData(data);
  return Number(alert && alert.timestamp || 0) || 0;
}

function hasItems(data) {
  return Boolean(data && Array.isArray(data.items) && data.items.length);
}

function historyItemTimestamp(item) {
  const numeric = Number(item && item.timestamp || 0) || 0;
  if (numeric) return numeric;
  const parsed = Date.parse(String(item && item.createdAt || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function historyItemKey(item) {
  const id = String(item && item.id || '').trim();
  if (id) return `id:${id}`;
  return [
    historyItemTimestamp(item),
    String(item && (item.senderId || item.clientId) || '').trim(),
    String(item && item.message || '').trim()
  ].join('|');
}

function mergeHistoryItems(primaryData, busData) {
  const combined = [
    ...(primaryData && Array.isArray(primaryData.items) ? primaryData.items : []),
    ...(busData && Array.isArray(busData.items) ? busData.items : [])
  ]
    .filter((item) => item && item.message)
    .sort((a, b) => historyItemTimestamp(b) - historyItemTimestamp(a));

  const seen = new Set();
  const merged = [];
  for (const item of combined) {
    const key = historyItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= PLAYER_ALERT_HISTORY_LIMIT) break;
  }
  return merged;
}

function isActive(data) {
  const alert = alertFromData(data);
  return Boolean(alert && alert.active === true && alert.message);
}

function shouldMirrorSend(response, data) {
  const alert = alertFromData(data);
  return Boolean(response && response.ok && data && data.ok !== false && alert && alert.message && alert.timestamp);
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

    const mirrorAlert = alertFromData(data);
    const stored = await durableObjectFetch(env, '/player-alert/store', {
      method: 'POST',
      body: JSON.stringify(mirrorAlert)
    });

    const source = responseSource(data);
    if (stored && stored.ok && source !== 'backend' && source !== 'kv-fallback' && source !== 'render-backend') {
      return json({
        ...data,
        source: 'durable-object-fallback',
        fallback: true,
        fallbackFrom: source || 'worker-fallback'
      }, primary.status);
    }
    return primary;
  }

  if (url.pathname === '/api/player-alert/current' && request.method === 'GET') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);
    const bus = await durableObjectFetch(env, '/player-alert/current');
    const primaryActive = isActive(data);
    const busActive = Boolean(bus && bus.ok && isActive(bus.data));
    const primaryTimestamp = alertTimestamp(data);
    const busTimestamp = alertTimestamp(bus && bus.data);

    if (busActive && (!primaryActive || busTimestamp > primaryTimestamp)) {
      return json({
        ...bus.data,
        source: 'durable-object-fallback',
        fallbackFrom: responseSource(data) || 'none'
      });
    }

    const source = responseSource(data);
    if (primaryActive && (source === 'backend' || source === 'kv-fallback' || source === 'render-backend')) return primary;

    if (busActive) {
      return json({
        ...bus.data,
        source: 'durable-object-fallback',
        fallbackFrom: source || 'none'
      });
    }
    return primary;
  }

  if (url.pathname === '/api/player-alert/history' && request.method === 'GET') {
    const primary = await forward(request, env);
    const data = await responseJson(primary);
    const bus = await durableObjectFetch(env, '/player-alert/history');
    const primaryHasItems = hasItems(data);
    const busHasItems = Boolean(bus && bus.ok && hasItems(bus.data));

    if (primaryHasItems && busHasItems) {
      return json({
        ...data,
        ok: data.ok !== false,
        items: mergeHistoryItems(data, bus.data),
        source: 'merged-player-alert-history',
        fallbackFrom: responseSource(data) || 'none'
      }, primary.status);
    }

    if (primaryHasItems) return primary;

    if (busHasItems) {
      return json({
        ...bus.data,
        source: 'durable-object-fallback',
        fallbackFrom: responseSource(data) || 'none'
      });
    }
    return primary;
  }

  return forward(request, env);
}

export const PLAYER_ALERT_GLOBAL_FALLBACK_INSTANCE = PLAYER_ALERT_DO_INSTANCE;
