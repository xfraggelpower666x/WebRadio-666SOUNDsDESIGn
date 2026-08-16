const DEFAULT_STATS_URL = 'https://my.idjstream.com:8686/stats?sid=1&json=1';
const CACHE_TTL_MS = 15000;
const STALE_TTL_MS = 600000;
const FETCH_TIMEOUT_MS = 1500;

let cache = { value: null, fetchedAt: 0, pending: null };

export function parseLiveListenerCapacity(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload.maxlisteners ?? payload.maxListeners ?? payload.listener_capacity ?? payload.listenerCapacity;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

async function fetchCapacity(env) {
  const now = Date.now();
  if (cache.value != null && now - cache.fetchedAt < CACHE_TTL_MS) return cache.value;
  if (cache.pending) return cache.pending;

  cache.pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const statsUrl = String(env?.LISTENER_STATS_URL || DEFAULT_STATS_URL).trim() || DEFAULT_STATS_URL;
      const response = await fetch(statsUrl, {
        headers: { 'cache-control': 'no-store' },
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      if (!response.ok) throw new Error(`listener_stats_http_${response.status}`);
      const value = parseLiveListenerCapacity(await response.json());
      if (value == null) throw new Error('listener_stats_capacity_missing');
      cache = { value, fetchedAt: Date.now(), pending: null };
      return value;
    } catch (error) {
      if (cache.value != null && now - cache.fetchedAt < STALE_TTL_MS) return cache.value;
      return null;
    } finally {
      clearTimeout(timer);
      if (cache.pending) cache.pending = null;
    }
  })();

  return cache.pending;
}

export async function enrichNowPlayingWithLiveListenerCapacity(request, env, forward) {
  const [response, maxlisteners] = await Promise.all([
    forward(request, env),
    fetchCapacity(env)
  ]);
  if (!response || !response.ok || maxlisteners == null) return response;

  let payload;
  try {
    payload = await response.clone().json();
  } catch (error) {
    return response;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json; charset=UTF-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify({ ...payload, maxlisteners }), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
