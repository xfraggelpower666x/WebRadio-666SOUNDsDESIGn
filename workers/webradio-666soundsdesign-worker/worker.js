/**
 * =========================================================
 * 666SOUNDsDESIGn — RADIO WORKER RECOVERY (Webhook First)
 * =========================================================
 *
 * Ziel:
 * - bestehenden Radio-Worker wiederherstellen
 * - Audio-Pfad unverändert stabil halten
 * - Metadaten primär aus Webhook nutzen
 * - INFO_API nur als Fallback
 *
 * Routen:
 * /health
 * /debug
 * /stream
 * /backup
 * /metadata
 * /status
 * /listeners
 * /history
 *
 * /api/radio/health
 * /api/radio/debug
 * /api/radio/stream
 * /api/radio/backup
 * /api/radio/metadata
 * /api/radio/status
 * /api/radio/listeners
 * /api/radio/history
 * /api/radio/webhook
 */

const WORKER_NAME = "webradio-666soundsdesign-worker";
const BUILD = "RECOVERY_WEBHOOK_FIRST";

const DEFAULT_STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const DEFAULT_STREAM_BACKUP = "https://my.idjstream.com:8686/stream";
const DEFAULT_META_JSON_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

const DEFAULT_WEBHOOK_CACHE_TTL_MS = 90 * 1000; // 1-Minuten-Webhook + Puffer
const DEFAULT_META_FETCH_CACHE_MS = 15 * 1000;
const DEFAULT_STREAM_CHECK_TIMEOUT_MS = 5000;

let RADIO_STATE = {
  updatedAt: 0,
  source: "bootstrap",
  stream: "offline",
  djstatus: "false",
  djusername: null,
  song: null,
  art: null,
  type: null,
  listeners: 0,
  unique: 0,
  bitrate: null,
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
  lastError: null
};

function now() {
  return Date.now();
}

function toMs(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function sanitizeUrl(value) {
  const s = safeString(value);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
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

function isFreshWebhookState(webhookTtlMs) {
  return RADIO_STATE.updatedAt > 0 && (now() - RADIO_STATE.updatedAt) < webhookTtlMs;
}

function buildSslPlayFromParts(state) {
  const domain = safeString(state?.domain);
  const sslport = safeString(state?.sslport);
  if (!domain || !sslport) return null;
  return `https://${domain}:${sslport}/`;
}

function normalizeWebhookPayload(data) {
  return {
    updatedAt: now(),
    source: "sonicpanel-webhook",
    stream: data?.stream ?? "offline",
    djstatus: data?.djstatus ?? "false",
    djusername: data?.djusername ?? null,
    song: data?.song ?? data?.title ?? null,
    art: data?.art ?? null,
    type: data?.type ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
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
    source: "provider-json",
    stream: data?.stream ?? "offline",
    djstatus: data?.djstatus ?? "false",
    djusername: data?.djusername ?? null,
    song: data?.title ?? data?.song ?? null,
    art: data?.art ?? null,
    type: data?.type ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
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
    listeners: Number(item.listeners || 0),
    source: item.source || null
  });

  HISTORY = HISTORY.slice(0, 30);
}

function metadataJson(sourceState, sourceLabel = "memory") {
  return {
    ok: true,
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
    type: sourceState.type || null,
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
      "Accept": "application/json,text/plain,*/*",
      "User-Agent": "666SOUNDsDESIGn Radio Worker Recovery"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (!res.ok) {
    throw new Error(`META_HTTP_${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  let normalized;

  if (ct.includes("json")) {
    normalized = normalizeProviderPayload(await res.json());
  } else {
    const rawText = await res.text();
    try {
      normalized = normalizeProviderPayload(JSON.parse(rawText));
    } catch {
      normalized = normalizeProviderPayload({ title: rawText?.trim() || null });
    }
  }

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
    return {
      state: RADIO_STATE,
      source: "stale_memory",
      error: String(err)
    };
  }
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
  const mainStream = env?.STREAM_MAIN || DEFAULT_STREAM_MAIN;
  const backupStream = env?.STREAM_BACKUP || DEFAULT_STREAM_BACKUP;

  STREAM_STATUS.lastCheckedAt = now();
  STREAM_STATUS.selectedSource = "none";
  STREAM_STATUS.lastTargetUrl = null;
  STREAM_STATUS.lastError = null;

  const mainOk = await quickStreamProbe(mainStream, timeoutMs);
  if (mainOk) {
    STREAM_STATUS.selectedSource = "main";
    STREAM_STATUS.lastTargetUrl = mainStream;
    return { label: "main", url: mainStream };
  }

  const backupOk = await quickStreamProbe(backupStream, timeoutMs);
  if (backupOk) {
    STREAM_STATUS.selectedSource = "backup";
    STREAM_STATUS.lastTargetUrl = backupStream;
    STREAM_STATUS.lastError = "PRIMARY_FAILED";
    return { label: "backup", url: backupStream };
  }

  STREAM_STATUS.selectedSource = "emergency_main";
  STREAM_STATUS.lastTargetUrl = mainStream;
  STREAM_STATUS.lastError = "ALL_PROBES_FAILED";
  return { label: "emergency_main", url: mainStream };
}

async function streamProxy(request, targetUrl, origin) {
  const upstreamHeaders = new Headers();
  const range = request.headers.get("Range");
  const accept = request.headers.get("Accept");

  if (range) upstreamHeaders.set("Range", range);
  if (accept) upstreamHeaders.set("Accept", accept);
  upstreamHeaders.set("Accept-Encoding", "identity");

  const upstream = await fetch(targetUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const headers = new Headers(upstream.headers);
  Object.entries(cors(origin)).forEach(([k, v]) => headers.set(k, v));

  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "audio/mpeg");
  }

  headers.set("Cache-Control", "no-store");
  headers.set("X-Worker-Name", WORKER_NAME);
  headers.set("X-Worker-Build", BUILD);
  headers.set("X-Active-Stream-Target", targetUrl);

  ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade"].forEach((h) => headers.delete(h));

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

    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/radio/health") {
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    if (url.pathname === "/debug" || url.pathname === "/api/radio/debug") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        resolvedSource: resolved.source,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        resolvedState: resolved.state,
        streamStatus: STREAM_STATUS,
        historyCount: HISTORY.length
      }, origin);
    }

    if ((url.pathname === "/webhook" || url.pathname === "/api/radio/webhook") && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ ok: false, error: "invalid json", worker: WORKER_NAME }, origin, 400);
      }

      RADIO_STATE = normalizeWebhookPayload(data);
      saveHistory(RADIO_STATE);

      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        received: true,
        updatedAt: RADIO_STATE.updatedAt,
        extracted: {
          song: RADIO_STATE.song,
          listeners: RADIO_STATE.listeners,
          sslplay: RADIO_STATE.sslplay,
          sslurl: RADIO_STATE.sslurl,
          domain: RADIO_STATE.domain,
          sslport: RADIO_STATE.sslport,
          stream: RADIO_STATE.stream
        }
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
      const backup = env?.STREAM_BACKUP || DEFAULT_STREAM_BACKUP;
      return streamProxy(request, backup, origin);
    }

    if (
      url.pathname === "/metadata" ||
      url.pathname === "/meta" ||
      url.pathname === "/api/radio/metadata" ||
      url.pathname === "/api/radio/meta"
    ) {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json(metadataJson(resolved.state, resolved.source), origin);
    }

    if (
      url.pathname === "/status" ||
      url.pathname === "/nowplaying" ||
      url.pathname === "/api/radio/status" ||
      url.pathname === "/api/radio/nowplaying"
    ) {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        metadata: metadataJson(resolved.state, resolved.source),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    if (url.pathname === "/listeners" || url.pathname === "/api/radio/listeners") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
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
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        history: HISTORY
      }, origin);
    }

    return text("Worker läuft", origin, 200);
  }
};
