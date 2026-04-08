/**
 * 666SOUNDsDESIGn — Radio Worker FINAL Webhook Fix
 *
 * Pflicht-Endpunkte:
 * GET  /api/radio/stream
 * GET  /api/radio/metadata
 * GET  /api/radio/status
 * GET  /api/radio/history
 * GET  /api/radio/listeners
 * GET  /api/radio/intro
 * GET  /api/radio/crawler
 * POST /api/radio/webhook
 *
 * Optional:
 * GET  /health
 * GET  /api/radio/health
 *
 * ENV REQUIRED:
 * - STREAM_URL
 * - ACTIVE_SOURCE = "radio"
 *
 * ENV OPTIONAL:
 * - METADATA_URL
 * - STATUS_PAGE_URL
 * - INTRO_OBJECT_KEY
 * - SOURCE_LIST
 *
 * SECRETS REQUIRED:
 * - ADMIN_PASSWORD
 *
 * OPTIONAL:
 * - RADIO_INTRO_BUCKET (R2 binding)
 * - HISTORY_KV (KV binding)
 */

const DEFAULT_INTRO_KEY = "intro.mp3";
const WEBHOOK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten

let RADIO_STATE = {
  source: "bootstrap",
  updatedAt: 0,
  stream: "offline",
  djstatus: "false",
  djusername: null,
  song: null,
  art: null,
  type: null,
  ulistener: 0,
  listeners: 0,
  client: null,
  port: null,
  radioip: null,
  bitrate: null,
  sslport: null,
  domain: null,
  sslplay: null,
  sslurl: null,
  raw: null,
};

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Password,Range,Accept,Origin",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(obj, origin = "*", status = 200) {
  const h = new Headers(corsHeaders(origin));
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(obj, null, 2), { status, headers: h });
}

function getAdminToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return (request.headers.get("X-Admin-Password") || "").trim();
}

function isFreshWebhookState() {
  return RADIO_STATE.updatedAt > 0 && (Date.now() - RADIO_STATE.updatedAt) < WEBHOOK_CACHE_TTL_MS;
}

function normalizeWebhookPayload(data) {
  return {
    source: "sonicpanel-webhook",
    updatedAt: Date.now(),
    stream: data?.stream ?? "offline",
    djstatus: data?.djstatus ?? "false",
    djusername: data?.djusername ?? null,
    song: data?.song ?? null,
    art: data?.art ?? null,
    type: data?.type ?? null,
    ulistener: Number(data?.ulistener ?? 0) || 0,
    listeners: Number(data?.listeners ?? 0) || 0,
    client: data?.client ?? null,
    port: data?.port ?? null,
    radioip: data?.radioip ?? null,
    bitrate: data?.bitrate ?? null,
    sslport: data?.sslport ?? null,
    domain: data?.domain ?? null,
    sslplay: data?.sslplay ?? null,
    sslurl: data?.sslurl ?? null,
    raw: data ?? null,
  };
}

async function saveHistory(env, item) {
  try {
    if (env.HISTORY_KV && item?.song) {
      const key = `history:${Date.now()}`;
      await env.HISTORY_KV.put(key, JSON.stringify({
        ts: new Date().toISOString(),
        song: item.song,
        art: item.art || null,
        djusername: item.djusername || null,
        listeners: item.listeners || 0,
      }), { expirationTtl: 7 * 24 * 3600 });
    }
  } catch {}
}

async function readHistory(env) {
  try {
    if (!env.HISTORY_KV) return [];
    const listed = await env.HISTORY_KV.list({ prefix: "history:", limit: 10 });
    const keys = (listed.keys || []).map(k => k.name).sort().reverse().slice(0, 8);
    const out = [];
    for (const key of keys) {
      const raw = await env.HISTORY_KV.get(key);
      if (!raw) continue;
      try { out.push(JSON.parse(raw)); } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

async function streamPassthrough(request, targetUrl, origin = "*") {
  const upstreamHeaders = new Headers();
  const range = request.headers.get("Range");
  const accept = request.headers.get("Accept");
  if (range) upstreamHeaders.set("Range", range);
  if (accept) upstreamHeaders.set("Accept", accept);
  upstreamHeaders.set("Accept-Encoding", "identity");

  const upstream = await fetch(targetUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
    cf: { cacheTtl: 0, cacheEverything: false },
  });

  const headers = new Headers(upstream.headers);
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
  headers.set("Cache-Control", "no-store");
  if (!headers.get("Content-Type")) headers.set("Content-Type", "audio/mpeg");
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("proxy-connection");
  headers.delete("transfer-encoding");
  headers.delete("upgrade");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function fetchMetadataFallback(env) {
  if (!env.METADATA_URL) return null;
  try {
    const res = await fetch(env.METADATA_URL, {
      headers: {
        "User-Agent": "666SOUNDsDESIGn-Radio-Worker/1.0",
        "Accept": "application/json,text/plain,*/*",
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await res.json();
      return normalizeWebhookPayload(j);
    }
    const text = await res.text();
    try {
      return normalizeWebhookPayload(JSON.parse(text));
    } catch {
      return normalizeWebhookPayload({
        stream: "unknown",
        song: text?.trim() || null,
      });
    }
  } catch {
    return null;
  }
}

function buildMetadataJson(state) {
  return {
    ok: true,
    source: state.source || "unknown",
    title: state.song || null,
    song: state.song || null,
    art: state.art || null,
    image: state.art || null,
    cover: state.art || null,
    dj: state.djusername || null,
    djusername: state.djusername || null,
    listeners: Number(state.listeners || 0),
    unique: Number(state.ulistener || 0),
    bitrate: state.bitrate || null,
    stream: state.stream || "offline",
    type: state.type || null,
    updatedAt: state.updatedAt || 0,
  };
}

function buildStatusJson(env, state) {
  return {
    ok: true,
    status: state.stream || "offline",
    stream: env.STREAM_URL || null,
    metadata: buildMetadataJson(state),
    activeSource: env.ACTIVE_SOURCE || "radio",
    timestamp: new Date().toISOString(),
    statusPage: env.STATUS_PAGE_URL || null,
  };
}

async function introResponse(env, origin) {
  const key = env.INTRO_OBJECT_KEY || DEFAULT_INTRO_KEY;
  const bucket = env.RADIO_INTRO_BUCKET;
  if (!bucket) {
    return jsonResponse({
      ok: false,
      error: "INTRO_BUCKET_NOT_CONFIGURED",
      key,
    }, origin, 503);
  }
  const obj = await bucket.get(key);
  if (!obj) {
    return jsonResponse({
      ok: false,
      error: "INTRO_OBJECT_NOT_FOUND",
      key,
    }, origin, 404);
  }
  const headers = new Headers(corsHeaders(origin));
  headers.set("Content-Type", obj.httpMetadata?.contentType || "audio/mpeg");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(obj.body, { status: 200, headers });
}

async function crawlerResponse(env) {
  let parsed = [];
  try {
    parsed = JSON.parse(env.SOURCE_LIST || "[]");
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [];
  }
  return {
    ok: true,
    activeSource: env.ACTIVE_SOURCE || "radio",
    stream: env.STREAM_URL || null,
    metadataUrl: env.METADATA_URL || null,
    statusPageUrl: env.STATUS_PAGE_URL || null,
    sourceList: parsed,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/health" || url.pathname === "/api/radio/health") {
      return jsonResponse({
        ok: true,
        service: "666soundsdesign-radio-worker",
        activeSource: env.ACTIVE_SOURCE || "radio",
        streamConfigured: !!env.STREAM_URL,
        metadataConfigured: !!env.METADATA_URL,
        introConfigured: !!env.RADIO_INTRO_BUCKET,
        webhookFresh: isFreshWebhookState(),
      }, origin, 200);
    }

    if (!url.pathname.startsWith("/api/radio/")) {
      return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
    }

    const path = url.pathname.replace("/api/radio", "") || "/";

    // WEBHOOK
    if (path === "/webhook" && request.method === "POST") {
      let data = null;
      try {
        data = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "INVALID_JSON" }, origin, 400);
      }

      const normalized = normalizeWebhookPayload(data);
      RADIO_STATE = normalized;
      await saveHistory(env, normalized);

      return jsonResponse({
        ok: true,
        received: true,
        source: normalized.source,
        song: normalized.song,
        listeners: normalized.listeners,
        updatedAt: normalized.updatedAt,
      }, origin, 200);
    }

    // STREAM
    if (path === "/stream" && (request.method === "GET" || request.method === "HEAD")) {
      if (!env.STREAM_URL) {
        return jsonResponse({ ok: false, error: "STREAM_URL_MISSING" }, origin, 500);
      }
      return streamPassthrough(request, env.STREAM_URL, origin);
    }

    // METADATA
    if (path === "/metadata" && request.method === "GET") {
      let state = isFreshWebhookState() ? RADIO_STATE : null;
      if (!state) state = await fetchMetadataFallback(env);
      if (!state) state = RADIO_STATE.updatedAt ? RADIO_STATE : normalizeWebhookPayload({ stream: "offline" });

      return jsonResponse(buildMetadataJson(state), origin, 200);
    }

    // STATUS
    if (path === "/status" && request.method === "GET") {
      let state = isFreshWebhookState() ? RADIO_STATE : null;
      if (!state) state = await fetchMetadataFallback(env);
      if (!state) state = RADIO_STATE.updatedAt ? RADIO_STATE : normalizeWebhookPayload({ stream: "offline" });

      return jsonResponse(buildStatusJson(env, state), origin, 200);
    }

    // HISTORY
    if (path === "/history" && request.method === "GET") {
      const history = await readHistory(env);
      return jsonResponse({
        ok: true,
        source: env.HISTORY_KV ? "history-kv" : "memory/fallback",
        history,
      }, origin, 200);
    }

    // LISTENERS
    if (path === "/listeners" && request.method === "GET") {
      let state = isFreshWebhookState() ? RADIO_STATE : null;
      if (!state) state = await fetchMetadataFallback(env);
      if (!state) state = RADIO_STATE.updatedAt ? RADIO_STATE : normalizeWebhookPayload({ stream: "offline" });

      return jsonResponse({
        ok: true,
        listeners: Number(state.listeners || 0),
        unique: Number(state.ulistener || 0),
        stream: state.stream || "offline",
        updatedAt: state.updatedAt || 0,
      }, origin, 200);
    }

    // INTRO
    if (path === "/intro" && request.method === "GET") {
      return introResponse(env, origin);
    }

    // CRAWLER
    if (path === "/crawler" && request.method === "GET") {
      return jsonResponse(await crawlerResponse(env), origin, 200);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
  }
};
