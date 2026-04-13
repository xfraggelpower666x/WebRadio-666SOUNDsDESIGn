/**
 * =========================================================
 * 666SOUNDsDESIGn — RADIO WORKER V5 STABLE SELF-HEAL
 * =========================================================
 *
 * ROOT RULE:
 * - Frontend lives in repo root
 * - Worker lives in /workers/webradio-666soundsdesign-worker/
 *
 * ENDPOINTS:
 * GET/HEAD  /stream
 * GET/HEAD  /api/radio/stream
 * GET/HEAD  /backup
 * GET/HEAD  /api/radio/backup
 * GET       /metadata
 * GET       /api/radio/metadata
 * GET       /status
 * GET       /api/radio/status
 * GET       /listeners
 * GET       /api/radio/listeners
 * GET       /history
 * GET       /api/radio/history
 * POST      /api/radio/webhook
 * GET       /debug
 * GET       /api/radio/debug
 * GET       /health
 * GET       /api/radio/health
 */

const BUILD = "RADIO_V5_STABLE_SELF_HEAL";

const DEFAULT_STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const DEFAULT_STREAM_BACKUP = "https://my.idjstream.com:8686/stream";
const DEFAULT_META_JSON_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

const DEFAULT_WEBHOOK_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_META_FETCH_CACHE_MS = 15 * 1000;
const DEFAULT_STREAM_CHECK_TIMEOUT_MS = 5000;

let RADIO_STATE = {
  updatedAt: 0,
  song: null,
  art: null,
  djusername: null,
  listeners: 0,
  unique: 0,
  bitrate: null,
  stream: "offline",
  raw: null
};

let HISTORY = [];
let META_CACHE = { updatedAt: 0, data: null };
let STREAM_STATUS = {
  lastCheckedAt: 0,
  primaryOk: null,
  backupOk: null,
  activeSource: "unknown",
  lastError: null,
  lastTargetUrl: null
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
    "Vary": "Origin"
  };
}

function json(data, origin = "*", status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function text(body, origin = "*", status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeStreamState(state) {
  const raw = String(state?.stream || "").toLowerCase().trim();
  const listeners = Number(state?.listeners || 0);
  const title = String(state?.song || "").trim();
  const dj = String(state?.djusername || "").trim().toLowerCase();

  if (raw === "live") return "live";
  if (raw === "autodj") return "autodj";

  if (raw === "offline") {
    if (listeners > 0 || title || state?.art) return "autodj";
    if (["autodj", "auto dj", "no dj", "false", "none", ""].includes(dj)) return "autodj";
  }

  return raw || "offline";
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
    raw: data ?? null
  };
}

function normalizeProviderPayload(data) {
  const djRaw = String(data?.djusername ?? "").trim().toLowerCase();
  let stream = "offline";

  if (djRaw && !["autodj", "auto dj", "none", "false"].includes(djRaw)) {
    stream = "live";
  } else if (data?.title || Number(data?.listeners || 0) > 0) {
    stream = "autodj";
  }

  return {
    updatedAt: now(),
    song: data?.title ?? data?.song ?? null,
    art: data?.art ?? null,
    djusername: data?.djusername ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
    stream,
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

  HISTORY = HISTORY.slice(0, 20);
}

function metadataJson(sourceState, sourceLabel = "memory") {
  const normalizedStream = normalizeStreamState(sourceState);

  return {
    ok: true,
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
    stream: normalizedStream,
    mode:
      normalizedStream === "live"
        ? "LIVE_DJ"
        : normalizedStream === "autodj"
          ? "AUTO_DJ"
          : "OFFLINE",
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
      "User-Agent": "666SOUNDsDESIGn Radio Worker V5"
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
    return { state: providerState, source: "fallback_provider" };
  } catch {
    return { state: RADIO_STATE, source: "stale_memory" };
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

async function selectBestStream(mainStream, backupStream, timeoutMs) {
  const primaryOk = await quickStreamProbe(mainStream, timeoutMs);

  STREAM_STATUS.lastCheckedAt = now();
  STREAM_STATUS.primaryOk = primaryOk;
  STREAM_STATUS.lastTargetUrl = null;

  if (primaryOk) {
    STREAM_STATUS.backupOk = null;
    STREAM_STATUS.activeSource = "main";
    STREAM_STATUS.lastError = null;
    STREAM_STATUS.lastTargetUrl = mainStream;
    return { url: mainStream, source: "main" };
  }

  const backupOk = await quickStreamProbe(backupStream, timeoutMs);
  STREAM_STATUS.backupOk = backupOk;

  if (backupOk) {
    STREAM_STATUS.activeSource = "backup";
    STREAM_STATUS.lastError = "PRIMARY_FAILED";
    STREAM_STATUS.lastTargetUrl = backupStream;
    return { url: backupStream, source: "backup" };
  }

  STREAM_STATUS.activeSource = "emergency_main";
  STREAM_STATUS.lastError = "PRIMARY_AND_BACKUP_PROBE_FAILED";
  STREAM_STATUS.lastTargetUrl = mainStream;

  return { url: mainStream, source: "emergency_main" };
}

async function streamProxy(req, targetUrl, origin) {
  const headers = new Headers();
  const range = req.headers.get("Range");
  const accept = req.headers.get("Accept");

  if (range) headers.set("Range", range);
  if (accept) headers.set("Accept", accept);
  headers.set("Accept-Encoding", "identity");

  const upstream = await fetch(targetUrl, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const h = new Headers(upstream.headers);
  Object.entries(cors(origin)).forEach(([k, v]) => h.set(k, v));

  if (!h.get("Content-Type")) h.set("Content-Type", "audio/mpeg");
  h.set("Cache-Control", "no-store");
  h.set("X-Radio-Build", BUILD);
  h.set("X-Active-Stream-Target", targetUrl);

  ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade"].forEach((x) => h.delete(x));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: h
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    const mainStream = env?.STREAM_MAIN || DEFAULT_STREAM_MAIN;
    const backupStream = env?.STREAM_BACKUP || DEFAULT_STREAM_BACKUP;
    const metaJsonUrl = env?.META_JSON_URL || DEFAULT_META_JSON_URL;

    const webhookTtlMs = toMs(env?.WEBHOOK_CACHE_TTL_MS, DEFAULT_WEBHOOK_CACHE_TTL_MS);
    const metaFetchCacheMs = toMs(env?.META_FETCH_CACHE_MS, DEFAULT_META_FETCH_CACHE_MS);
    const streamCheckTimeoutMs = toMs(env?.STREAM_CHECK_TIMEOUT_MS, DEFAULT_STREAM_CHECK_TIMEOUT_MS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/health" ||
      url.pathname === "/api/radio/health"
    ) {
      const metaResolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        build: BUILD,
        main: mainStream,
        backup: backupStream,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        metaSource: metaResolved.source,
        streamSource: STREAM_STATUS.activeSource,
        streamStatus: STREAM_STATUS
      }, origin);
    }

    if (
      (url.pathname === "/stream" || url.pathname === "/api/radio/stream") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const best = await selectBestStream(mainStream, backupStream, streamCheckTimeoutMs);
      return streamProxy(request, best.url, origin);
    }

    if (
      (url.pathname === "/backup" || url.pathname === "/api/radio/backup") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return streamProxy(request, backupStream, origin);
    }

    if (url.pathname === "/api/radio/webhook" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ ok: false, error: "invalid json" }, origin, 400);
      }

      RADIO_STATE = normalizeWebhookPayload(data);
      saveHistory(RADIO_STATE);

      return json({
        ok: true,
        received: true,
        build: BUILD,
        updatedAt: RADIO_STATE.updatedAt
      }, origin);
    }

    if (url.pathname === "/metadata" || url.pathname === "/api/radio/metadata") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json(metadataJson(resolved.state, resolved.source), origin);
    }

    if (url.pathname === "/status" || url.pathname === "/api/radio/status") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        build: BUILD,
        stream: mainStream,
        backup: backupStream,
        metaUrl: metaJsonUrl,
        streamStatus: STREAM_STATUS,
        state: metadataJson(resolved.state, resolved.source)
      }, origin);
    }

    if (url.pathname === "/listeners" || url.pathname === "/api/radio/listeners") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        build: BUILD,
        source: resolved.source,
        listeners: Number(resolved.state.listeners || 0),
        unique: Number(resolved.state.unique || 0),
        bitrate: resolved.state.bitrate || null,
        stream: normalizeStreamState(resolved.state),
        updatedAt: resolved.state.updatedAt || 0
      }, origin);
    }

    if (url.pathname === "/history" || url.pathname === "/api/radio/history") {
      return json({ ok: true, build: BUILD, source: "memory", history: HISTORY }, origin);
    }

    if (url.pathname === "/debug" || url.pathname === "/api/radio/debug") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json({
        ok: true,
        build: BUILD,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        radioState: RADIO_STATE,
        resolvedSource: resolved.source,
        resolvedState: resolved.state,
        streamStatus: STREAM_STATUS,
        historyCount: HISTORY.length
      }, origin);
    }

    return text("Not found", origin, 404);
  }
};
