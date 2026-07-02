import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../worker.js";

if (!globalThis.caches) {
  const memory = new Map();
  globalThis.caches = {
    default: {
      async match(request) { return memory.get(request.url) || null; },
      async put(request, response) { memory.set(request.url, response.clone()); }
    }
  };
}

const root = new URL("../public/", import.meta.url);
const mime = new Map([
  [".html", "text/html; charset=UTF-8"],
  [".css", "text/css; charset=UTF-8"],
  [".js", "application/javascript; charset=UTF-8"],
  [".json", "application/json; charset=UTF-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webmanifest", "application/manifest+json"]
]);

const ASSETS = {
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (path.includes("..")) return new Response("Not found", { status: 404 });
    try {
      const data = await readFile(new URL(path, root));
      const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
      return new Response(data, { status: 200, headers: { "content-type": mime.get(ext) || "application/octet-stream" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
};

const env = { ASSETS, ENABLE_PUBLIC_DEBUG: "false" };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function request(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("origin")) headers.set("origin", "https://radio.test");
  if (!headers.has("accept")) headers.set("accept", "application/json, text/html;q=0.9, */*;q=0.8");
  return worker.fetch(new Request(`https://radio.test${path}`, { ...init, headers }), env, ctx);
}

test("health is operational and does not crash", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.version, "FULLVERSION_AMARIS_ROUTE_IOS_LYVRA_DJ_REPAIR_v1.2.2");
});

test("runtime configuration is read from static assets", async () => {
  const response = await request("/api/runtime-config/status");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.source, "asset");
  assert.equal(data.version, 3);
});



test("metadata proxy maps AutoDJ to LYVRA DJ and preserves a real live DJ", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamPayload = { title: "Test Track", dj: "AutoDJ", listeners: 3, bitrate: 320 };
  globalThis.fetch = async () => new Response(JSON.stringify(upstreamPayload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const autoResponse = await request("/api/nowplaying");
    assert.equal(autoResponse.status, 200);
    const autoData = await autoResponse.json();
    assert.equal(autoData.dj, "LYVRA DJ");
    assert.equal(autoData.dj_display, "LYVRA DJ");
    assert.equal(autoData.dj_mode, "autodj");

    upstreamPayload = { title: "Live Track", dj: "FragglePower666", listeners: 5, bitrate: 320 };
    const liveResponse = await request("/api/nowplaying");
    assert.equal(liveResponse.status, 200);
    const liveData = await liveResponse.json();
    assert.equal(liveData.dj, "FragglePower666");
    assert.equal(liveData.dj_display, "FragglePower666");
    assert.equal(liveData.dj_mode, "live");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("debug endpoints are hidden without debug token", async () => {
  const response = await request("/debug");
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "not_found");
});

test("skip compatibility handler exists", async () => {
  const response = await request("/api/skip/status");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.protectedWriteRoute, "/api/admin/skip");
});

test("chaos API reaches the addon instead of HTML fallback", async () => {
  const response = await request("/api/chaos-engine/auth-status");
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
});

test("unknown API and missing assets return real 404 responses", async () => {
  const api = await request("/api/does-not-exist");
  assert.equal(api.status, 404);
  assert.match(api.headers.get("content-type") || "", /application\/json/);
  const asset = await request("/assets/missing.js", { headers: { accept: "application/javascript" } });
  assert.equal(asset.status, 404);
  assert.doesNotMatch(asset.headers.get("content-type") || "", /text\/html/);
});

test("dark dancer html alias is available", async () => {
  const response = await request("/The-Dark-Dancer.html", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
});

test("root and CSS are served from ASSETS", async () => {
  const rootResponse = await request("/", { headers: { accept: "text/html" } });
  assert.equal(rootResponse.status, 200);
  assert.match(rootResponse.headers.get("content-type") || "", /text\/html/);
  const cssResponse = await request("/css/base.css", { headers: { accept: "text/css" } });
  assert.equal(cssResponse.status, 200);
  assert.match(cssResponse.headers.get("content-type") || "", /text\/css/);
});


test("AMARIS aliases are hard-routed to the standalone worker-first player and keep all other players", async () => {
  for (const path of ["/amaris", "/amaris/", "/AMARIS", "/AMARIS/", "/amaris/index.html", "/AMARIS/index.html"]) {
    const amaris = await request(path, { headers: { accept: "text/html" } });
    assert.equal(amaris.status, 200, path);
    assert.match(amaris.headers.get("content-type") || "", /text\/html/, path);
    assert.equal(amaris.headers.get("x-player-mode"), "amaris-lyvra-minimal", path);
    assert.equal(amaris.headers.get("x-amaris-route-lock"), "standalone-only", path);
    const amarisHtml = await amaris.text();
    assert.match(amarisHtml, /A M A R I S - L Y V R A[\s\S]*MINIMAL WEBRADIO/, path);
    assert.match(amarisHtml, /WORKER MAIN SWITCH/, path);
    assert.match(amarisHtml, /\/api\/runtime-config\/status/, path);
    assert.match(amarisHtml, /LYVRA DJ/, path);
    assert.doesNotMatch(amarisHtml, /id="mffApp"|Starting Audio Systems/, path);
  }

  const amarisPost = await request("/amaris", { method: "POST", headers: { accept: "application/json" } });
  assert.equal(amarisPost.status, 405);

  const internal = await request("/internal", { headers: { accept: "text/html" } });
  assert.equal(internal.status, 200);
  const internalHtml = await internal.text();
  assert.match(internalHtml, /666SOUNDsDESIGn RADIO/);
  assert.match(internalHtml, /LYVRA DJ/);
  assert.match(internalHtml, /id="reconnectBtn"/);
  assert.match(internalHtml, /id="primaryBtn"/);
  assert.match(internalHtml, /id="backupBtn"/);

  const rootPlayer = await request("/", { headers: { accept: "text/html" } });
  const rootHtml = await rootPlayer.text();
  assert.match(rootHtml, /Root Main Player/);
  assert.doesNotMatch(rootHtml, /A M A R I S - L Y V R A[\s\S]*MINIMAL WEBRADIO/);
});
