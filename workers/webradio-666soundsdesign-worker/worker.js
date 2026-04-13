/**
 * =========================================================
 * 666SOUNDsDESIGn — WORKER: webradio-666soundsdesign-worker
 * =========================================================
 *
 * TYPE:        radio
 * VERSION:     v1.0.0
 *
 * DESCRIPTION:
 * Zentraler RADIO CORE Worker für öffentliche Stream-Ausgabe,
 * Health/Debug, Metadata/Webhook-Verarbeitung und mehrstufige
 * Source-Fallback-Logik.
 *
 * ROUTES:
 * /health                → Status Check
 * /debug                 → Debug Infos
 * /stream                → öffentlicher Stream
 * /api/radio/stream      → Alias für Stream
 * /backup                → direkter letzter Backup-Stream
 * /api/radio/backup      → Alias für Backup
 * /metadata              → Metadaten
 * /api/radio/metadata    → Alias für Metadaten
 * /status                → kombinierter Status
 * /api/radio/status      → Alias für Status
 * /listeners             → Hörerzahlen
 * /api/radio/listeners   → Alias für Hörerzahlen
 * /history               → Verlauf im Worker-RAM
 * /api/radio/history     → Alias für Verlauf
 * /debug                 → Debug Infos
 * /api/radio/debug       → Alias für Debug
 * /api/radio/webhook     → SonicPanel Webhook JSON
 *
 * =========================================================
 */

const WORKER_NAME = "RADIO CORE";
const BUILD = "RADIO_CORE_v1.0.0";

/**
 * =========================================================
 * HARTE LETZTE NOTFALL-STREAMS
 * Diese beiden bleiben immer die finalen Fallbacks.
 * =========================================================
 */
const DEFAULT_PROVIDER_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const DEFAULT_PROVIDER_BACKUP = "https://my.idjstream.com:8686/stream";

/**
 * Optionaler JSON-Meta-Endpunkt
 */
const DEFAULT_META_JSON_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

/**
 * Timing
 */
const DEFAULT_WEBHOOK_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_META_FETCH_CACHE_MS = 15 * 1000;
const DEFAULT_STREAM_CHECK_TIMEOUT_MS = 5000;

/**
 * =========================================================
 * RAM-STATE
 * Für jetzt okay. Später besser in KV / Durable Object.
 * =========================================================
 */
let RADIO_STATE = {
  updatedAt: 0,
  song: null,
  art: null,
  djusername: null,
  listeners: 0,
  unique: 0,
  bitrate: null,
  stream: "offline",

  sslplay: null,
  sslurl: null,
  domain: null,
  sslport: null,
  radioip: null,
  port: null,

  raw: null
};

let HISTORY = [];
let META_CACHE = { updatedAt: 0, data: null };
let STREAM_STATUS = {
  lastCheckedAt: 0,
  selectedSource: "none",
  lastTargetUrl: null,
  lastError: null,
  candidates: []
};

function now() {
  return Date.now();
}

function toMs(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Range,X-Admin-Password",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function json(data, origin = "*", status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function text(body, origin = "*", status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function sanitizeUrl(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  return v;
}

function safeString(value) {
  return value == null ? null : String(value).trim() || null;
}

function isFreshWebhookState(webhookTtlMs) {
  return RADIO_STATE.updatedAt > 0 && (now() - RADIO_STATE.updatedAt) < webhookTtlMs;
}

function normalizeWebhookPayload(data) {
  return {
    updatedAt: now(),
    song: data?.song ?? data?.title ?? null,
    art: data?.art ?? null,
    djusername: data?.djusername ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
    stream: data?.stream ?? "offline",

    sslplay: sanitizeUrl(data?.sslplay),
    sslurl: sanitizeUrl(data?.sslurl),
    domain: safeString(data?.domain),
    sslport: safeString(data?.sslport),
    radioip: safeString(data?.radioip),
    port: safeString(data?.port),

    raw: data ?? null
  };
}

function normalizeProviderPayload(data) {
  return {
    updatedAt: now(),
    song: data?.title ?? data?.song ?? null,
    art: data?.art ?? null,
    djusername: data?.djusername ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
    stream: data?.stream ?? "offline",

    sslplay: sanitizeUrl(data?.sslplay),
    sslurl: sanitizeUrl(data?.sslurl),
    domain: safeString(data?.domain),
    sslport: safeString(data?.sslport),
    radioip: safeString(data?.radioip),
    port: safeString(data?.port),

    raw: data ?? null
  };
}

function saveHistory(item) {
  if (!item?.song) return;
  const latest = HISTORY[0];
  if (latest && latest.song === item.song) return;

  HISTORY.unshift({
    ts: new Date().toISOString(),
    song: item.song,
    art: item.art || null,
    djusername: item.djusername || null,
    listeners: Number(item.listeners || 0)
  });

  HISTORY = HISTORY.slice(0, 30);
}

function buildSslPlayFromParts(state) {
  const domain = safeString(state?.domain);
  const sslport = safeString(state?.sslport);
  if (!domain || !sslport) return null;
  return `https://${domain}:${sslport}/`;
}

function metadataJson(sourceState, sourceLabel = "memory") {
  return {
    status: "ok",
    worker: WORKER_NAME,
    build: BUILD,
    source: sourceLabel,
    title: sourceState.song || null,
    song: sourceState.song || null,
    art: sourceState.art || null,
    image: sourceState.art || null,
    cover: sourceState.art || null,
    dj: sourceState.djusername || null,
    djusername: sourceState.djusername || null,
    listeners: Number(sourceState.listeners || 0),
    unique: Number(sourceState.unique || 0),
    bitrate: sourceState.bitrate || null,
    stream: sourceState.stream || "offline",
    sslplay: sourceState.sslplay || null,
    sslurl: sourceState.sslurl || null,
    domain: sourceState.domain || null,
    sslport: sourceState.sslport || null,
    radioip: sourceState.radioip || null,
    port: sourceState.port || null,
    updatedAt: sourceState.updatedAt || 0
  };
}

async function getProviderMetadata(metaJsonUrl, metaFetchCacheMs) {
  if (META_CACHE.data && (now() - META_CACHE.updatedAt) < metaFetchCacheMs) {
    return META_CACHE.data;
  }

  const res = await fetch(metaJsonUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "666SOUNDsDESIGn Radio Core Worker"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (!res.ok) {
    throw new Error(`META_HTTP_${res.status}`);
  }

  const normalized = normalizeProviderPayload(await res.json());
  META_CACHE = { updatedAt: now(), data: normalized };
  saveHistory(normalized);
  return normalized;
}

async function resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs) {
  if (isFreshWebhookState(webhookTtlMs)) {
    return { state: RADIO_STATE, source: "webhook" };
  }

  try {
    const providerState = await getProviderMetadata(metaJsonUrl, metaFetchCacheMs);
    return { state: providerState, source: "provider_json" };
  } catch (err) {
    return { state: RADIO_STATE, source: "stale_memory", error: String(err) };
  }
}

function buildSourceCandidates(state, env) {
  const candidates = [];
  function add(label, url) {
    const clean = sanitizeUrl(url);
    if (!clean) return;
    if (candidates.some((x) => x.url === clean)) return;
    candidates.push({ label, url: clean });
  }

  add("worker_internal_primary", env?.INTERNAL_STREAM_URL_1);
  add("worker_internal_secondary", env?.INTERNAL_STREAM_URL_2);
  add("worker_internal_tertiary", env?.INTERNAL_STREAM_URL_3);
  add("worker_internal_quaternary", env?.INTERNAL_STREAM_URL_4);

  add("webhook_sslplay", state?.sslplay);
  add("webhook_sslurl", state?.sslurl);
  add("webhook_domain_sslport", buildSslPlayFromParts(state));

  add("provider_main_final_fallback", env?.STREAM_MAIN || DEFAULT_PROVIDER_MAIN);
  add("provider_backup_final_fallback", env?.STREAM_BACKUP || DEFAULT_PROVIDER_BACKUP);

  return candidates;
}

async function quickStreamProbe(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "audio/mpeg,*/*",
        "Range": "bytes=0-1",
        "Accept-Encoding": "identity"
      },
      signal: controller.signal,
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    clearTimeout(timeout);
    return res.ok || res.status === 206 || res.status === 416;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

async function selectBestStream(state, env, timeoutMs) {
  const candidates = buildSourceCandidates(state, env);

  STREAM_STATUS.lastCheckedAt = now();
  STREAM_STATUS.candidates = candidates.map((x) => x.label);
  STREAM_STATUS.selectedSource = "none";
  STREAM_STATUS.lastTargetUrl = null;
  STREAM_STATUS.lastError = null;

  for (const candidate of candidates) {
    const ok = await quickStreamProbe(candidate.url, timeoutMs);
    if (ok) {
      STREAM_STATUS.selectedSource = candidate.label;
      STREAM_STATUS.lastTargetUrl = candidate.url;
      return candidate;
    }
  }

  if (candidates.length > 0) {
    STREAM_STATUS.selectedSource = `emergency_${candidates[0].label}`;
    STREAM_STATUS.lastTargetUrl = candidates[0].url;
    STREAM_STATUS.lastError = "ALL_PROBES_FAILED";
    return candidates[0];
  }

  throw new Error("NO_STREAM_CANDIDATES");
}

async function streamProxy(request, targetUrl, origin) {
  const upstreamRequest = new Request(targetUrl, request);
  upstreamRequest.headers.set("Accept-Encoding", "identity");

  const range = request.headers.get("Range");
  if (range) upstreamRequest.headers.set("Range", range);

  const accept = request.headers.get("Accept");
  if (accept) upstreamRequest.headers.set("Accept", accept);

  const upstream = await fetch(upstreamRequest, {
    method: "GET",
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const headers = new Headers(upstream.headers);
  Object.entries(cors(origin)).forEach(([k, v]) => headers.set(k, v));

  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "audio/mpeg");
  }

  headers.set("X-Worker-Name", WORKER_NAME);
  headers.set("X-Worker-Build", BUILD);
  headers.set("X-Active-Stream-Target", targetUrl);

  ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade"].forEach((h) => {
    headers.delete(h);
  });

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    const metaJsonUrl = env?.META_JSON_URL || DEFAULT_META_JSON_URL;
    const webhookTtlMs = toMs(env?.WEBHOOK_CACHE_TTL_MS, DEFAULT_WEBHOOK_CACHE_TTL_MS);
    const metaFetchCacheMs = toMs(env?.META_FETCH_CACHE_MS, DEFAULT_META_FETCH_CACHE_MS);
    const streamCheckTimeoutMs = toMs(env?.STREAM_CHECK_TIMEOUT_MS, DEFAULT_STREAM_CHECK_TIMEOUT_MS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname === "/health" || url.pathname === "/api/radio/health") {
      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    if (url.pathname === "/debug" || url.pathname === "/api/radio/debug") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        resolvedSource: resolved.source,
        resolvedState: resolved.state,
        candidates: buildSourceCandidates(resolved.state, env),
        streamStatus: STREAM_STATUS,
        historyCount: HISTORY.length
      }, origin);
    }

    if ((url.pathname === "/stream" || url.pathname === "/api/radio/stream") &&
        (request.method === "GET" || request.method === "HEAD")) {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      const best = await selectBestStream(resolved.state, env, streamCheckTimeoutMs);
      return streamProxy(request, best.url, origin);
    }

    if ((url.pathname === "/backup" || url.pathname === "/api/radio/backup") &&
        (request.method === "GET" || request.method === "HEAD")) {
      const backup = env?.STREAM_BACKUP || DEFAULT_PROVIDER_BACKUP;
      return streamProxy(request, backup, origin);
    }

    if (url.pathname === "/api/radio/webhook" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ status: "error", worker: WORKER_NAME, error: "invalid json" }, origin, 400);
      }

      RADIO_STATE = normalizeWebhookPayload(data);
      saveHistory(RADIO_STATE);

      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        received: true,
        updatedAt: RADIO_STATE.updatedAt,
        extracted: {
          sslplay: RADIO_STATE.sslplay,
          sslurl: RADIO_STATE.sslurl,
          domain: RADIO_STATE.domain,
          sslport: RADIO_STATE.sslport,
          stream: RADIO_STATE.stream
        }
      }, origin);
    }

    if (url.pathname === "/metadata" || url.pathname === "/api/radio/metadata") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json(metadataJson(resolved.state, resolved.source), origin);
    }

    if (url.pathname === "/status" || url.pathname === "/api/radio/status") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        metadata: metadataJson(resolved.state, resolved.source),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    if (url.pathname === "/listeners" || url.pathname === "/api/radio/listeners") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        source: resolved.source,
        listeners: Number(resolved.state.listeners || 0),
        unique: Number(resolved.state.unique || 0),
        bitrate: resolved.state.bitrate || null,
        updatedAt: resolved.state.updatedAt || 0
      }, origin);
    }

    if (url.pathname === "/history" || url.pathname === "/api/radio/history") {
      return json({
        status: "ok",
        worker: WORKER_NAME,
        build: BUILD,
        history: HISTORY
      }, origin);
    }

    if (url.pathname === "/") {
      return text("Worker läuft", origin, 200);
    }

    return new Response("Worker läuft", {
      status: 200,
      headers: {
        ...cors(origin),
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
};
