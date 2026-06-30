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
  assert.equal(data.version, "FULLVERSION_AUTH_HARDLOCK_REPAIR_v1.1.0");
});

test("runtime configuration is read from static assets", async () => {
  const response = await request("/api/runtime-config/status");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.source, "asset");
  assert.equal(data.version, 3);
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

test("admin skip accepts only a verified Password-Worker token", async () => {
  const originalFetch = globalThis.fetch;
  const audience = "666SOUNDsDESIGn-WebRadio-Admin";
  const exp = Math.floor(Date.now() / 1000) + 28800;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://auth.test/verify") {
      const headers = new Headers(init.headers || {});
      assert.equal(headers.get("authorization"), "Bearer admin-token");
      assert.equal(headers.get("x-service-token"), "service-token");
      assert.equal(headers.get("x-auth-audience"), audience);
      assert.equal(headers.get("origin"), "https://radio.test");
      const body = JSON.parse(String(init.body || "{}"));
      assert.equal(body.audience, audience);
      return Response.json({ ok: true, valid: true, payload: { iss: "666-system-pw", scope: "admin", exp, aud: audience } });
    }
    if (url.startsWith("https://stream-admin.test/skip")) return new Response("OK", { status: 200 });
    return originalFetch(input, init);
  };

  try {
    const envWithSkip = {
      ...env,
      ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify",
      ADMIN_AUTH_LOGIN_URL: "https://pw.test/login",
      ADMIN_SERVICE_ORIGIN: "https://radio.test",
      ADMIN_SERVICE_TOKEN: "service-token",
      AUTH_AUDIENCE: audience,
      SHOUTCAST_ADMIN_URL: "https://stream-admin.test/skip",
      SHOUTCAST_ADMIN_USER: "admin",
      SHOUTCAST_ADMIN_PASSWORD: "secret"
    };
    const response = await worker.fetch(new Request("https://radio.test/api/admin/skip", {
      method: "POST",
      headers: {
        origin: "https://radio.test",
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ source: "test" })
    }), envWithSkip, ctx);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("music generator routes are removed", async () => {
  const api = await request("/api/chaos-engine/auth-status");
  assert.equal(api.status, 404);
  assert.match(api.headers.get("content-type") || "", /application\/json/);
  const page = await request("/CHAOS_ENGINE/index.html", { headers: { accept: "text/html" } });
  assert.equal(page.status, 404);
});

test("discord shooter test route is wired", async () => {
  const response = await request("/api/discord/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "test" })
  });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
});

test("player alert messenger uses backend only", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    if (url === "https://backend.test/api/player-alert/send") {
      assert.equal(init.method, "POST");
      assert.equal(new Headers(init.headers).get("x-player-alert-service-token"), "service-token");
      const body = JSON.parse(String(init.body || "{}"));
      assert.equal(body.message, "hello backend");
      return Response.json({ ok: true, delivered: true, source: "render-backend" });
    }
    return originalFetch(input, init);
  };

  try {
    const response = await worker.fetch(new Request("https://radio.test/api/player-alert/send", {
      method: "POST",
      headers: {
        origin: "https://radio.test",
        "content-type": "application/json"
      },
      body: JSON.stringify({ text: "hello backend", senderId: "smoke" })
    }), {
      ...env,
      PLAYER_ALERT_BACKEND_URL: "https://backend.test",
      PLAYER_ALERT_SERVICE_TOKEN: "service-token"
    }, ctx);

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.source, "render-backend");
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("player alert backend failure does not fall back to KV or cache", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://backend.test/api/player-alert/current") {
      return Response.json({ ok: false, error: "down" }, { status: 503 });
    }
    return originalFetch(input);
  };

  try {
    const response = await worker.fetch(new Request("https://radio.test/api/player-alert/current", {
      headers: { origin: "https://radio.test" }
    }), {
      ...env,
      PLAYER_ALERT_BACKEND_URL: "https://backend.test",
      PLAYER_ALERT_KV: {
        async get() { throw new Error("KV fallback must not be used"); },
        async put() { throw new Error("KV fallback must not be used"); }
      }
    }, ctx);

    assert.equal(response.status, 502);
    const data = await response.json();
    assert.equal(data.ok, false);
    assert.equal(data.error, "backend_unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
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
