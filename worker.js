/**
 * ==========================================================
 * 666SOUNDsDESIGn — WORKER: webradio-666soundsdesign-worker-v6
 * ==========================================================
 *
 * TYPE:        radio
 * VERSION:     v6.0.0
 * BUILD:       SELF_HEAL_FINAL
 *
 * DESCRIPTION:
 * Zentraler RADIO CORE Worker mit:
 * - Self-Heal Stream-Auswahl
 * - öffentlichem Stream-Endpunkt
 * - SonicPanel/Webhook-Metadaten
 * - Provider-JSON-Fallback
 * - History im RAM
 * - Sunshine-/SoundCloud-/interne Quellen als Kandidaten
 * - harter finaler Main-/Backup-Fallback
 *
 * WICHTIG:
 * - Keine Transkodierung
 * - Nur Proxy / Routing / Auswahl / Fallback
 * - Audio-Pfad bleibt schlank
 *
 * ROUTES:
 * /health
 * /debug
 * /stream
 * /backup
 * /metadata
 * /status
 * /listeners
 * /history
 * /radio
 *
 * /api/radio/health
 * /api/radio/debug
 * /api/radio/stream
 * /api/radio/backup
 * /api/radio/metadata
 * /api/radio/status
 * /api/radio/listeners
 * /api/radio/history
 * /api/radio/radio
 * /api/radio/webhook
 *
 * =========================================================
 */

const WORKER_NAME = "webradio-666soundsdesign-worker-v6";
const BUILD = "V6_SELF_HEAL_FINAL";

/**
 * =========================================================
 * HARTE LETZTE NOTFALL-STREAMS
 * Diese beiden bleiben IMMER die finalen Fallbacks.
 * =========================================================
 */
const DEFAULT_PROVIDER_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const DEFAULT_PROVIDER_BACKUP = "https://my.idjstream.com:8686/stream";

/**
 * JSON / Metadata Fallback
 */
const DEFAULT_META_JSON_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

/**
 * Sunshine Presets
 */
const DEFAULT_SUNSHINE_STREAMS = {
  sunshine_live: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/",
  sunshine_techhouse: "https://stream.sunshine-live.de/sp4/mp3-192/utm_source=radio.menu/",
  sunshine_bunker: "https://stream.sunshine-live.de/amsterdam/mp3-192/stream.sunshine-live.de/",
  sunshine_club: "https://stream.sunshine-live.de/club/mp3-192/stream.sunshine-live.de/",
  sunshine_clubsounds: "https://stream.sunshine-live.de/playlist1/mp3-192/stream.sunshine-live.de/",
  sunshine_iamraving: "https://stream.sunshine-live.de/iamraving/mp3-192/stream.sunshine-live.de/",
  sunshine_melodic_techno: "https://stream.sunshine-live.de/melodic-techno/mp3-192/stream.sunshine-live.de/"
};

/**
 * Timing
 */
const DEFAULT_WEBHOOK_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_META_FETCH_CACHE_MS = 15 * 1000;
const DEFAULT_STREAM_CHECK_TIMEOUT_MS = 5000;

/**
 * =========================================================
 * RAM STATE
 * =========================================================
 */
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
  lastError: null,
  candidates: []
};

/**
 * =========================================================
 * UTILS
 * =========================================================
 */
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

/**
 * =========================================================
 * NORMALIZER
 * =========================================================
 */
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

/**
 * =========================================================
 * METADATA
 * =========================================================
 */
async function getProviderMetadata(metaJsonUrl, metaFetchCacheMs) {
  if (META_CACHE.data && (now() - META_CACHE.updatedAt) < metaFetchCacheMs) {
    return META_CACHE.data;
  }

  const res = await fetch(metaJsonUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json,text/plain,*/*",
      "User-Agent": "666SOUNDsDESIGn Radio Worker V6"
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
    const text = await res.text();
    try {
      normalized = normalizeProviderPayload(JSON.parse(text));
    } catch {
      normalized = normalizeProviderPayload({ title: text?.trim() || null });
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

/**
 * =========================================================
 * SOURCE CANDIDATES
 * Reihenfolge:
 * 1) interne Worker / interne URLs
 * 2) SoundCloud / Album-Fallbacks
 * 3) Webhook sslplay / sslurl / domain+sslport
 * 4) Sunshine Presets
 * 5) harter Main
 * 6) harter Backup
 * =========================================================
 */
function buildSourceCandidates(state, env) {
  const candidates = [];

  function add(label, url, category = "custom") {
    const clean = sanitizeUrl(url);
    if (!clean) return;
    if (candidates.some((x) => x.url === clean)) return;
    candidates.push({ label, url: clean, category });
  }

  /**
   * Interne Worker / Hybrid / AutoDJ
   */
  add("worker_internal_primary", env?.INTERNAL_STREAM_URL_1, "internal");
  add("worker_internal_secondary", env?.INTERNAL_STREAM_URL_2, "internal");
  add("worker_internal_tertiary", env?.INTERNAL_STREAM_URL_3, "internal");
  add("worker_internal_quaternary", env?.INTERNAL_STREAM_URL_4, "internal");

  /**
   * SoundCloud / Album-Fallbacks
   * Diese URLs bitte später per ENV sauber setzen.
   */
  add("soundcloud_album_1", env?.SOUNDCLOUD_ALBUM_URL_1, "soundcloud");
  add("soundcloud_album_2", env?.SOUNDCLOUD_ALBUM_URL_2, "soundcloud");
  add("soundcloud_album_3", env?.SOUNDCLOUD_ALBUM_URL_3, "soundcloud");

  /**
   * Dynamische SonicPanel Ziele
   */
  add("webhook_sslplay", state?.sslplay, "dynamic");
  add("webhook_sslurl", state?.sslurl, "dynamic");
  add("webhook_domain_sslport", buildSslPlayFromParts(state), "dynamic");

  /**
   * Sunshine Quellen
   */
  add("sunshine_live", env?.SUNSHINE_STREAM_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_live, "sunshine");
  add("sunshine_techhouse", env?.SUNSHINE_TECHHOUSE_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_techhouse, "sunshine");
  add("sunshine_bunker", env?.SUNSHINE_BUNKER_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_bunker, "sunshine");
  add("sunshine_club", env?.SUNSHINE_CLUB_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_club, "sunshine");
  add("sunshine_clubsounds", env?.SUNSHINE_CLUBSOUNDS_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_clubsounds, "sunshine");
  add("sunshine_iamraving", env?.SUNSHINE_IAMRAVING_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_iamraving, "sunshine");
  add("sunshine_melodic_techno", env?.SUNSHINE_MELODIC_TECHNO_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_melodic_techno, "sunshine");

  /**
   * Harte letzte Fallbacks
   */
  add("provider_main_final_fallback", env?.STREAM_MAIN || DEFAULT_PROVIDER_MAIN, "provider");
  add("provider_backup_final_fallback", env?.STREAM_BACKUP || DEFAULT_PROVIDER_BACKUP, "provider");

  return candidates;
}

/**
 * =========================================================
 * SELF HEAL PROBE
 * =========================================================
 */
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
  STREAM_STATUS.candidates = candidates.map((x) => ({
    label: x.label,
    category: x.category,
    url: x.url
  }));
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

/**
 * =========================================================
 * STREAM PROXY
 * =========================================================
 */
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

  [
    "connection",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "upgrade"
  ].forEach((h) => headers.delete(h));

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

/**
 * =========================================================
 * PLAYER CONFIG JSON
 * =========================================================
 */
function buildRadioConfig(origin) {
  return {
    ok: true,
    worker: WORKER_NAME,
    build: BUILD,
    branding: "666SOUNDsDESIGn",
    owner: "DJ Fraggel / DJ Fraggelpower666",

    intro: `${origin}/intro`,
    stream: `${origin}/stream`,
    stream_main: `${origin}/stream`,
    stream_backup: `${origin}/backup`,

    presets: {
      main: `${origin}/stream`,
      backup: `${origin}/backup`,
      sunshine_1: `${origin}/stream-sunshine/1`,
      sunshine_2: `${origin}/stream-sunshine/2`,
      sunshine_3: `${origin}/stream-sunshine/3`,
      sunshine_4: `${origin}/stream-sunshine/4`,
      sunshine_5: `${origin}/stream-sunshine/5`,
      sunshine_6: `${origin}/stream-sunshine/6`,
      sunshine_7: `${origin}/stream-sunshine/7`
    },

    metadata: `${origin}/metadata`,
    status: `${origin}/status`,
    listeners: `${origin}/listeners`,
    history: `${origin}/history`,
    debug: `${origin}/debug`,
    health: `${origin}/health`,
    webhook: `${origin}/api/radio/webhook`
  };
}

function sunshineUrlByPreset(env, id) {
  const map = {
    "1": env?.SUNSHINE_STREAM_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_live,
    "2": env?.SUNSHINE_TECHHOUSE_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_techhouse,
    "3": env?.SUNSHINE_BUNKER_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_bunker,
    "4": env?.SUNSHINE_CLUB_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_club,
    "5": env?.SUNSHINE_CLUBSOUNDS_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_clubsounds,
    "6": env?.SUNSHINE_IAMRAVING_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_iamraving,
    "7": env?.SUNSHINE_MELODIC_TECHNO_URL || DEFAULT_SUNSHINE_STREAMS.sunshine_melodic_techno
  };

  return map[String(id)] || null;
}

/**
 * =========================================================
 * MAIN FETCH
 * =========================================================
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    const metaJsonUrl = env?.META_JSON_URL || DEFAULT_META_JSON_URL;
    const webhookTtlMs = toMs(env?.WEBHOOK_CACHE_TTL_MS, DEFAULT_WEBHOOK_CACHE_TTL_MS);
    const metaFetchCacheMs = toMs(env?.META_FETCH_CACHE_MS, DEFAULT_META_FETCH_CACHE_MS);
    const streamCheckTimeoutMs = toMs(env?.STREAM_CHECK_TIMEOUT_MS, DEFAULT_STREAM_CHECK_TIMEOUT_MS);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors(origin)
      });
    }

    /**
     * HEALTH
     */
    if (url.pathname === "/health" || url.pathname === "/api/radio/health") {
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    /**
     * DEBUG
     */
    if (url.pathname === "/debug" || url.pathname === "/api/radio/debug") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);

      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        resolvedSource: resolved.source,
        webhookFresh: isFreshWebhookState(webhookTtlMs),
        resolvedState: resolved.state,
        candidates: buildSourceCandidates(resolved.state, env),
        streamStatus: STREAM_STATUS,
        historyCount: HISTORY.length
      }, origin);
    }

    /**
     * ROOT
     */
    if (url.pathname === "/") {
      return text("Worker läuft", origin, 200);
    }

    /**
     * RADIO CONFIG
     */
    if (
      url.pathname === "/radio" ||
      url.pathname === "/api/radio" ||
      url.pathname === "/api/radio/radio"
    ) {
      return json(buildRadioConfig(url.origin), origin);
    }

    /**
     * WEBHOOK
     */
    if (
      (url.pathname === "/webhook" || url.pathname === "/api/radio/webhook") &&
      request.method === "POST"
    ) {
      let data;

      try {
        data = await request.json();
      } catch {
        return json({
          ok: false,
          error: "invalid json",
          worker: WORKER_NAME
        }, origin, 400);
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

    /**
     * STREAM SELF-HEAL
     */
    if (
      (url.pathname === "/stream" || url.pathname === "/api/radio/stream") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      const best = await selectBestStream(resolved.state, env, streamCheckTimeoutMs);
      return streamProxy(request, best.url, origin);
    }

    /**
     * BACKUP DIREKT
     */
    if (
      (url.pathname === "/backup" || url.pathname === "/api/radio/backup") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const backup = env?.STREAM_BACKUP || DEFAULT_PROVIDER_BACKUP;
      return streamProxy(request, backup, origin);
    }

    /**
     * SUNSHINE PRESETS 1-7
     */
    const sunshineMatch = url.pathname.match(/^\/stream-sunshine\/([1-7])$/);
    if (sunshineMatch && (request.method === "GET" || request.method === "HEAD")) {
      const target = sunshineUrlByPreset(env, sunshineMatch[1]);
      if (!target) {
        return json({ ok: false, error: "sunshine preset not found" }, origin, 404);
      }
      return streamProxy(request, target, origin);
    }

    /**
     * METADATA
     */
    if (
      url.pathname === "/metadata" ||
      url.pathname === "/meta" ||
      url.pathname === "/api/radio/metadata" ||
      url.pathname === "/api/radio/meta"
    ) {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);
      return json(metadataJson(resolved.state, resolved.source), origin);
    }

    /**
     * STATUS
     */
    if (url.pathname === "/status" || url.pathname === "/api/radio/status") {
      const resolved = await resolveBestMetadata(metaJsonUrl, webhookTtlMs, metaFetchCacheMs);

      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        metadata: metadataJson(resolved.state, resolved.source),
        streamStatus: STREAM_STATUS
      }, origin);
    }

    /**
     * LISTENERS
     */
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

    /**
     * HISTORY
     */
    if (url.pathname === "/history" || url.pathname === "/api/radio/history") {
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        history: HISTORY
      }, origin);
    }
    /**
     * INTRO
     */
    if (url.pathname === "/intro" || url.pathname === "/api/radio/intro") {
      return json({
        ok: true,
        worker: WORKER_NAME,
        build: BUILD,
        message: "Intro route reserved",
        soundcloud: "https://soundcloud.com/fraggelpower666"
      }, origin);
    }
    /**
     * DEFAULT
     */
    return text("Worker läuft", origin, 200);
  }
};
