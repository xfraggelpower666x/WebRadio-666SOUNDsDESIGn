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
  assert.equal(data.version, "FULLVERSION_BRANCH_RECOVERY_v1.0.2");
});

test("runtime configuration is read from static assets", async () => {
  const response = await request("/api/runtime-config/status");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.source, "asset");
  assert.equal(data.version, 2);
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
