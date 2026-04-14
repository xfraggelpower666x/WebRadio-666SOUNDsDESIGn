/**
 * RADIO PLAYER V2 REAL FIX — WORKER CORE PATCH
 *
 * Ziel:
 * - /stream = stabiler Hauptstream (Custom Mount)
 * - /fallback-stream = direkter Originalstream
 * - /metadata = JSON für Frontend
 * - /health = schneller JSON-Check
 * - /debug = Diagnose JSON
 * - statische Assets weiter aus dem Worker auslieferbar
 *
 * WICHTIG:
 * - Kein Frontend-HTML-Umbau hier
 * - Keine Dashboard-Abhängigkeit
 * - Frontend soll NUR noch /metadata vom Worker holen
 */

const BUILD = "WORKER_CORE_FIX_PATCH_V1";

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>666SOUNDsDESIGn Radio</title>
  <link rel="stylesheet" href="/css/main.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <div class="brand-kicker">DIGITAL UNDERGROUND CONNECTED</div>
        <h1>666SOUNDsDESIGn</h1>
        <div class="brand-sub">Radio Player</div>
      </div>
    </header>

    <main class="layout">
      <section class="main-panel glass-panel">
        <div class="panel-head">
          <span>NOW PLAYING</span>
          <span id="sourceInfo">worker stream</span>
        </div>
        <div class="hero-grid">
          <div class="cover-box">
            <img id="coverImage" alt="cover" hidden />
            <div class="cover-fallback" id="coverFallback">
              <div class="cover-logo">666</div>
              <div class="cover-text">NO COVER / WORKER SOURCE</div>
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-line kicker">LIVE SIGNAL</div>
            <div class="track-title" id="trackTitle">Verbinde…</div>
            <div class="track-dj" id="trackDj">Metadaten werden geladen</div>
            <div class="stats-grid">
              <div class="stat-card"><div class="label">Listeners</div><div class="value" id="listenerInfo">--</div></div>
              <div class="stat-card"><div class="label">Bitrate</div><div class="value" id="bitrateInfo">--</div></div>
              <div class="stat-card"><div class="label">Mode</div><div class="value" id="modeInfo">--</div></div>
              <div class="stat-card"><div class="label">Status</div><div class="value" id="statusText">IDLE</div></div>
            </div>
            <div class="controls">
              <button class="btn btn-primary" id="btnPlay">Play</button>
              <button class="btn" id="btnPause">Pause</button>
              <button class="btn btn-danger" id="btnStop">Stop</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  <audio id="radioAudio" preload="none" crossorigin="anonymous"></audio>
  <script src="/js/app.js"></script>
</body>
</html>`;

const CSS_CONTENT = `
* { box-sizing: border-box; }
:root{
  --bg:#14171c; --bg2:#1a1f26; --panel:rgba(19,22,28,.88); --border:rgba(255,255,255,.10);
  --text:#f5f7fb; --muted:#9aa5b5; --pink:#ff2fd2; --turquoise:#21f7ff; --green:#7cff7f; --red:#ff5f74;
}
html,body{margin:0;min-height:100%;background:linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font-family:Inter,Arial,sans-serif;}
body{padding:18px}.app-shell{width:min(1200px,100%);margin:0 auto}.topbar,.glass-panel{background:rgba(18,21,27,.95);border:1px solid var(--border);border-radius:24px;padding:18px}
.brand-kicker,.brand-sub,.panel-head,.label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.14em}
.brand-block h1{margin:6px 0;font-size:42px}.layout{display:grid;grid-template-columns:1fr;gap:18px}.hero-grid{display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:18px}
.cover-box{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,#0f1116,#171b22)}
.cover-box img{width:100%;height:100%;object-fit:cover;display:block}.cover-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.cover-logo{width:110px;height:110px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);color:var(--pink);font-weight:900;font-size:34px}
.track-title{font-size:34px;font-weight:800;line-height:1.05;margin-bottom:10px}.track-dj{color:var(--muted);font-size:15px;margin-bottom:16px}
.stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px}.stat-card{border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(255,255,255,.025);padding:14px}
.value{margin-top:8px;font-size:22px;font-weight:700}.controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.btn{appearance:none;border:none;cursor:pointer;border-radius:14px;padding:14px 18px;background:#10131a;color:var(--text);border:1px solid rgba(255,255,255,.09);font-weight:700}
.btn-primary{color:#041316;background:linear-gradient(90deg,var(--turquoise),#8ffcff)}.btn-danger{background:linear-gradient(90deg,rgba(255,95,116,.20),rgba(255,95,116,.32))}
@media (max-width:760px){.hero-grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}}
`;

const JS_CONTENT = `
const WORKER_BASE = window.location.origin;
const ENDPOINTS = {
  stream: \`\${WORKER_BASE}/stream\`,
  fallback: \`\${WORKER_BASE}/fallback-stream\`,
  metadata: \`\${WORKER_BASE}/metadata\`,
  status: \`\${WORKER_BASE}/status\`,
  debug: \`\${WORKER_BASE}/debug\`,
  health: \`\${WORKER_BASE}/health\`
};

const META_INTERVAL_MS = 10000;
const audio = document.getElementById("radioAudio");
const coverImage = document.getElementById("coverImage");
const coverFallback = document.getElementById("coverFallback");
const trackTitle = document.getElementById("trackTitle");
const trackDj = document.getElementById("trackDj");
const listenerInfo = document.getElementById("listenerInfo");
const bitrateInfo = document.getElementById("bitrateInfo");
const modeInfo = document.getElementById("modeInfo");
const statusText = document.getElementById("statusText");
const sourceInfo = document.getElementById("sourceInfo");

document.getElementById("btnPlay")?.addEventListener("click", async () => {
  try {
    audio.src = ENDPOINTS.stream;
    audio.load();
    await audio.play();
    statusText.textContent = "PLAYING";
  } catch (e) {
    statusText.textContent = "PLAY ERROR";
  }
});
document.getElementById("btnPause")?.addEventListener("click", () => {
  audio.pause();
  statusText.textContent = "PAUSED";
});
document.getElementById("btnStop")?.addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  statusText.textContent = "STOPPED";
});

function splitTrack(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return { title: "No Track", artist: "---" };
  if (txt.includes(" - ")) {
    const [artist, ...rest] = txt.split(" - ");
    return { artist: artist.trim(), title: rest.join(" - ").trim() || txt };
  }
  return { title: txt, artist: "---" };
}

function applyCover(url) {
  if (!url) {
    coverImage.hidden = true;
    coverImage.removeAttribute("src");
    coverFallback.hidden = false;
    return;
  }
  coverImage.src = url;
  coverImage.hidden = false;
  coverFallback.hidden = true;
}
coverImage?.addEventListener("error", () => {
  coverImage.hidden = true;
  coverFallback.hidden = false;
});

async function refreshMetadata() {
  try {
    const res = await fetch(ENDPOINTS.metadata, { cache: "no-store" });
    if (!res.ok) throw new Error("metadata http " + res.status);
    const meta = await res.json();
    const split = splitTrack(meta.song || meta.title);
    trackTitle.textContent = split.title;
    trackDj.textContent = meta.djusername ? ("DJ: " + meta.djusername) : split.artist;
    listenerInfo.textContent = String(meta.listeners ?? 0);
    bitrateInfo.textContent = String(meta.bitrate ?? "--");
    modeInfo.textContent = String(meta.mode || meta.stream || "--");
    sourceInfo.textContent = String(meta.source || "worker");
    statusText.textContent = "READY";
    applyCover(meta.art || meta.image || meta.cover || "");
  } catch (e) {
    statusText.textContent = "META ERROR";
    sourceInfo.textContent = "metadata offline";
  }
}
refreshMetadata();
setInterval(refreshMetadata, META_INTERVAL_MS);
`;

function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Range,X-Admin-Password",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
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

function text(body, origin = "*", status = 200, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": contentType
    }
  });
}

const DEFAULT_STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const DEFAULT_STREAM_FALLBACK = "https://my.idjstream.com:8686/stream";
const DEFAULT_META_JSON_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";
const DEFAULT_META_FETCH_CACHE_MS = 15000;

let META_CACHE = { updatedAt: 0, data: null };

function now() { return Date.now(); }

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
    source: "provider_json",
    title: data?.title ?? data?.song ?? null,
    song: data?.title ?? data?.song ?? null,
    art: data?.art ?? data?.image ?? data?.cover ?? null,
    image: data?.art ?? data?.image ?? data?.cover ?? null,
    cover: data?.art ?? data?.image ?? data?.cover ?? null,
    dj: data?.djusername ?? data?.dj ?? null,
    djusername: data?.djusername ?? data?.dj ?? null,
    listeners: Number(data?.listeners ?? 0) || 0,
    unique: Number(data?.ulistener ?? data?.unique ?? 0) || 0,
    bitrate: data?.bitrate ?? null,
    stream,
    mode: stream === "live" ? "LIVE_DJ" : stream === "autodj" ? "AUTO_DJ" : "OFFLINE",
    raw: data ?? null
  };
}

async function getMetadata(metaJsonUrl, metaFetchCacheMs) {
  if (META_CACHE.data && (now() - META_CACHE.updatedAt) < metaFetchCacheMs) {
    return META_CACHE.data;
  }
  const res = await fetch(metaJsonUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json,text/plain,*/*",
      "User-Agent": "RADIO_PLAYER_V2_REAL_FIX Worker"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!res.ok) {
    throw new Error("META_HTTP_" + res.status);
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
  return normalized;
}

async function proxyStream(request, targetUrl, origin) {
  const headers = new Headers();
  const range = request.headers.get("Range");
  const accept = request.headers.get("Accept");
  if (range) headers.set("Range", range);
  if (accept) headers.set("Accept", accept);
  headers.set("Accept-Encoding", "identity");

  const upstream = await fetch(targetUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const out = new Headers(upstream.headers);
  Object.entries(cors(origin)).forEach(([k, v]) => out.set(k, v));
  if (!out.get("Content-Type")) out.set("Content-Type", "audio/mpeg");
  ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade"].forEach((h) => out.delete(h));

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const origin = request.headers.get("Origin") || "*";
      const mainStream = env?.STREAM_MAIN || DEFAULT_STREAM_MAIN;
      const fallbackStream = env?.STREAM_FALLBACK || DEFAULT_STREAM_FALLBACK;
      const metaJsonUrl = env?.META_JSON_URL || DEFAULT_META_JSON_URL;
      const metaFetchCacheMs = Number(env?.META_FETCH_CACHE_MS || DEFAULT_META_FETCH_CACHE_MS) || DEFAULT_META_FETCH_CACHE_MS;

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors(origin) });
      }

      // JSON endpoints
      if (url.pathname === "/health") {
        return json({
          ok: true,
          build: BUILD,
          worker: "RADIO_PLAYER_V2_REAL_FIX",
          mainStream,
          fallbackStream,
          metaJsonUrl
        }, origin);
      }

      if (url.pathname === "/debug") {
        return json({
          ok: true,
          build: BUILD,
          worker: "RADIO_PLAYER_V2_REAL_FIX",
          cacheAgeMs: META_CACHE.updatedAt ? (now() - META_CACHE.updatedAt) : null,
          hasCache: Boolean(META_CACHE.data),
          mainStream,
          fallbackStream,
          metaJsonUrl
        }, origin);
      }

      if (url.pathname === "/metadata") {
        const meta = await getMetadata(metaJsonUrl, metaFetchCacheMs);
        return json(meta, origin);
      }

      if (url.pathname === "/status") {
        const meta = await getMetadata(metaJsonUrl, metaFetchCacheMs);
        return json({
          ok: true,
          build: BUILD,
          mainStream,
          fallbackStream,
          state: meta
        }, origin);
      }

      // stream endpoints
      if (url.pathname === "/stream") {
        return proxyStream(request, mainStream, origin);
      }

      if (url.pathname === "/fallback-stream") {
        return proxyStream(request, fallbackStream, origin);
      }

      // static files from worker package
      if (url.pathname === "/css/main.css") {
        return text(CSS_CONTENT, origin, 200, "text/css; charset=utf-8");
      }

      if (url.pathname === "/js/app.js") {
        return text(JS_CONTENT, origin, 200, "application/javascript; charset=utf-8");
      }

      if (url.pathname === "/config/stream.config.js") {
        const cfg = {
          stream_url: "/stream",
          fallback_stream_url: "/fallback-stream",
          metadata_url: "/metadata",
          status_url: "/status",
          debug_url: "/debug",
          health_url: "/health"
        };
        return text("window.STREAM_CONFIG = " + JSON.stringify(cfg, null, 2) + ";", origin, 200, "application/javascript; charset=utf-8");
      }

      if (url.pathname === "/" || url.pathname === "/index.html") {
        return text(HTML_CONTENT, origin, 200, "text/html; charset=utf-8");
      }

      return text("Not Found", origin, 404);
    } catch (err) {
      return json({
        ok: false,
        build: BUILD,
        error: "worker_runtime_error",
        message: String(err)
      }, "*", 500);
    }
  }
};
