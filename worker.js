/**
 * =========================================================
 * 666SOUNDsDESIGn — RADIO CORE WORKER V6.1
 * =========================================================
 * FIXES:
 * - ❌ SoundCloud komplett entfernt
 * - ✅ Radio-Streams haben höchste Priorität
 * - ✅ Stabiler Fallback (Main → Backup)
 * - ✅ Kein Chaos mehr in Candidate-Liste
 */

const BUILD = "V6_1_RADIO_PRIORITY_FIXED";

const STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const STREAM_BACKUP = "https://my.idjstream.com:8686/stream";

const META_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

// ==============================
// UTILS
// ==============================

function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range",
    "Cache-Control": "no-store"
  };
}

function json(data, origin = "*") {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...cors(origin),
      "Content-Type": "application/json"
    }
  });
}

// ==============================
// STREAM CHECK
// ==============================

async function testStream(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Range": "bytes=0-1",
        "Accept-Encoding": "identity"
      }
    });

    return res.ok || res.status === 206 || res.status === 416;
  } catch {
    return false;
  }
}

// ==============================
// STREAM SELECT
// ==============================

async function selectStream() {
  const mainOk = await testStream(STREAM_MAIN);

  if (mainOk) {
    return {
      url: STREAM_MAIN,
      source: "main"
    };
  }

  const backupOk = await testStream(STREAM_BACKUP);

  if (backupOk) {
    return {
      url: STREAM_BACKUP,
      source: "backup"
    };
  }

  // Fallback trotzdem main
  return {
    url: STREAM_MAIN,
    source: "emergency_main"
  };
}

// ==============================
// STREAM PROXY
// ==============================

async function proxy(req, target, origin) {
  const headers = new Headers();

  const range = req.headers.get("Range");
  if (range) headers.set("Range", range);

  headers.set("Accept-Encoding", "identity");

  const res = await fetch(target, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers
  });

  const out = new Headers(res.headers);

  Object.entries(cors(origin)).forEach(([k, v]) => out.set(k, v));

  out.set("Content-Type", "audio/mpeg");
  out.set("X-Build", BUILD);
  out.set("X-Stream-Target", target);

  return new Response(res.body, {
    status: res.status,
    headers: out
  });
}

// ==============================
// METADATA
// ==============================

async function getMeta() {
  try {
    const res = await fetch(META_URL);
    const data = await res.json();

    return {
      song: data.song || data.title || "Unknown",
      listeners: Number(data.listeners || 0),
      bitrate: data.bitrate || "",
      dj: data.djusername || "AUTO",
      art: data.art || ""
    };
  } catch {
    return {
      song: "No Data",
      listeners: 0,
      bitrate: "",
      dj: "AUTO",
      art: ""
    };
  }
}

// ==============================
// MAIN
// ==============================

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (url.pathname === "/health") {
      return json({
        ok: true,
        build: BUILD
      }, origin);
    }

    if (url.pathname === "/debug") {
      const stream = await selectStream();

      return json({
        ok: true,
        build: BUILD,
        selected: stream
      }, origin);
    }

    if (url.pathname === "/metadata") {
      const meta = await getMeta();
      return json(meta, origin);
    }

    if (url.pathname === "/stream") {
      const best = await selectStream();
      return proxy(request, best.url, origin);
    }

    if (url.pathname === "/backup") {
      return proxy(request, STREAM_BACKUP, origin);
    }

    return new Response("OK", {
      headers: cors(origin)
    });
  }
};
