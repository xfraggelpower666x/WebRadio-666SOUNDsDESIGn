/**
 * 666SOUNDsDESIGn — FINAL WORKER (NO R2 / NO KV)
 * Stable Radio Core for HUD System
 * Supports both legacy root endpoints and /api/radio/* endpoints.
 */

const BUILD = "FINAL_NEURAL_READY_V3_REAL_FULL";
const STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const STREAM_BACKUP = "https://my.idjstream.com/8686/stream";
const WEBHOOK_CACHE_TTL_MS = 10 * 60 * 1000;

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

function cors(origin="*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Range",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    "Vary": "Origin"
  };
}

function json(data, origin="*", status=200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeWebhookPayload(data) {
  return {
    updatedAt: Date.now(),
    song: data?.song ?? null,
    art: data?.art ?? null,
    djusername: data?.djusername ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
    stream: data?.stream ?? "offline",
    raw: data ?? null
  };
}

function normalizeStreamState(state) {
  const raw = String(state?.stream || "").toLowerCase().trim();
  const listeners = Number(state?.listeners || 0);
  const title = String(state?.song || "").trim();
  const dj = String(state?.djusername || "").trim().toLowerCase();

  if (raw === "live") return "live";
  if (raw === "autodj") return "autodj";

  if (raw === "offline") {
    if (listeners > 0) return "autodj";
    if (title) return "autodj";
    if (["autodj", "auto dj", "no dj", "false", "none", ""].includes(dj)) return "autodj";
    if (state?.art) return "autodj";
  }
  return raw || "offline";
}

function metadataJson() {
  const normalizedStream = normalizeStreamState(RADIO_STATE);
  return {
    ok: true,
    title: RADIO_STATE.song || null,
    song: RADIO_STATE.song || null,
    art: RADIO_STATE.art || null,
    image: RADIO_STATE.art || null,
    cover: RADIO_STATE.art || null,
    dj: RADIO_STATE.djusername || null,
    djusername: RADIO_STATE.djusername || null,
    listeners: Number(RADIO_STATE.listeners || 0),
    unique: Number(RADIO_STATE.unique || 0),
    bitrate: RADIO_STATE.bitrate || null,
    stream: normalizedStream,
    mode: normalizedStream === "live" ? "LIVE_DJ" : normalizedStream === "autodj" ? "AUTO_DJ" : "OFFLINE",
    updatedAt: RADIO_STATE.updatedAt || 0
  };
}

function saveHistory(item) {
  if (!item?.song) return;
  HISTORY.unshift({
    ts: new Date().toISOString(),
    song: item.song,
    art: item.art || null,
    djusername: item.djusername || null,
    listeners: item.listeners || 0
  });
  HISTORY = HISTORY.slice(0, 10);
}

async function streamProxy(req, url, origin) {
  const headers = new Headers();
  const range = req.headers.get("Range");
  const accept = req.headers.get("Accept");

  if (range) headers.set("Range", range);
  if (accept) headers.set("Accept", accept);
  headers.set("Accept-Encoding", "identity");

  const upstream = await fetch(url, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const h = new Headers(upstream.headers);
  Object.entries(cors(origin)).forEach(([k,v]) => h.set(k,v));
  if (!h.get("Content-Type")) h.set("Content-Type", "audio/mpeg");
  h.set("Cache-Control", "no-store");
  h.delete("connection");
  h.delete("keep-alive");
  h.delete("proxy-connection");
  h.delete("transfer-encoding");
  h.delete("upgrade");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: h
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/health" ||
      url.pathname === "/api/radio/health"
    ) {
      return json({
        ok: true,
        build: BUILD,
        main: STREAM_MAIN,
        backup: STREAM_BACKUP,
        webhookFresh: RADIO_STATE.updatedAt > 0 && (Date.now() - RADIO_STATE.updatedAt) < WEBHOOK_CACHE_TTL_MS
      }, origin);
    }

    // stream aliases
    if ((url.pathname === "/radio" || url.pathname === "/stream" || url.pathname === "/api/radio/stream") &&
        (request.method === "GET" || request.method === "HEAD")) {
      return streamProxy(request, STREAM_MAIN, origin);
    }

    if ((url.pathname === "/backup" || url.pathname === "/api/radio/backup") &&
        (request.method === "GET" || request.method === "HEAD")) {
      return streamProxy(request, STREAM_BACKUP, origin);
    }

    if (url.pathname === "/api/radio/webhook" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ ok:false, error:"invalid json" }, origin, 400);
      }
      RADIO_STATE = normalizeWebhookPayload(data);
      saveHistory(RADIO_STATE);
      return json({ ok:true, received:true, updatedAt: RADIO_STATE.updatedAt }, origin);
    }

    if (url.pathname === "/meta" || url.pathname === "/metadata" || url.pathname === "/api/radio/metadata") {
      return json(metadataJson(), origin);
    }

    if (url.pathname === "/nowplaying") {
      return json({
        title: RADIO_STATE.song || null,
        art: RADIO_STATE.art || null,
        bitrate: RADIO_STATE.bitrate || null,
        djusername: RADIO_STATE.djusername || null
      }, origin);
    }

    if (url.pathname === "/status" || url.pathname === "/api/radio/status") {
      return json({
        ok: true,
        stream: STREAM_MAIN,
        backup: STREAM_BACKUP,
        state: metadataJson()
      }, origin);
    }

    if (url.pathname === "/history" || url.pathname === "/api/radio/history") {
      return json({ ok:true, source:"memory", history:HISTORY }, origin);
    }

    if (url.pathname === "/listeners" || url.pathname === "/api/radio/listeners") {
      return json({
        ok: true,
        listeners: Number(RADIO_STATE.listeners || 0),
        unique: Number(RADIO_STATE.unique || 0),
        bitrate: RADIO_STATE.bitrate || null,
        stream: normalizeStreamState(RADIO_STATE),
        updatedAt: RADIO_STATE.updatedAt || 0
      }, origin);
    }

    return new Response("Not found", { status:404, headers:cors(origin) });
  }
};
