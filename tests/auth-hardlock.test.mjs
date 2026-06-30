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

const AUDIENCE = "666SOUNDsDESIGn-WebRadio-Admin";
const SERVICE_TOKEN = "service-token";
const ORIGIN = "https://radio.test";
const FUTURE_EXP = Math.floor(Date.now() / 1000) + 28800;
const root = new URL("../public/", import.meta.url);

const ASSETS = {
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (path.includes("..")) return new Response("Not found", { status: 404 });
    try { return new Response(await readFile(new URL(path, root)), { status: 200 }); }
    catch { return new Response("Not found", { status: 404 }); }
  }
};
const ctx = { waitUntil() {}, passThroughOnException() {} };
const baseEnv = {
  ASSETS,
  ENABLE_PUBLIC_DEBUG: "false",
  ADMIN_AUTH_LOGIN_URL: "https://pw.test/login",
  ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify",
  ADMIN_SERVICE_ORIGIN: ORIGIN,
  ADMIN_SERVICE_TOKEN: SERVICE_TOKEN,
  AUTH_AUDIENCE: AUDIENCE,
  AUTH_MODE: "external_auth_worker"
};

function tokenPayload(token) {
  const base = { iss: "666-system-pw", scope: "admin", exp: FUTURE_EXP, aud: AUDIENCE };
  if (token === "valid-token") return base;
  if (token === "wrong-issuer") return { ...base, iss: "666-system-auth" };
  if (token === "wrong-scope") return { ...base, scope: "viewer" };
  if (token === "wrong-audience") return { ...base, aud: "other-audience" };
  if (token === "expired-token") return { ...base, exp: Math.floor(Date.now() / 1000) - 1 };
  return null;
}

function installAuthMock(extra = {}) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    if (url === "https://pw.test/login") {
      const headers = new Headers(init.headers || {});
      assert.equal(init.method, "POST");
      assert.equal(headers.get("x-service-token"), extra.expectedServiceToken || SERVICE_TOKEN);
      assert.equal(headers.get("x-auth-audience"), AUDIENCE);
      assert.equal(headers.get("origin"), ORIGIN);
      const body = JSON.parse(String(init.body || "{}"));
      assert.equal(body.audience, AUDIENCE);
      assert.equal(body.source, "webradio-admin-login");
      if (body.password === "correct-password") {
        return Response.json({ ok: true, token: "valid-token", expiresAt: FUTURE_EXP, scope: "admin", issuer: "666-system-pw" });
      }
      return Response.json({ ok: false, error: "password_rejected" }, { status: 401 });
    }
    if (url === "https://auth.test/verify") {
      const headers = new Headers(init.headers || {});
      if (headers.get("x-service-token") !== SERVICE_TOKEN) {
        return Response.json({ ok: false, valid: false, error: "service_auth_rejected" }, { status: 403 });
      }
      assert.equal(init.method, "POST");
      assert.equal(headers.get("x-auth-audience"), AUDIENCE);
      assert.equal(headers.get("origin"), ORIGIN);
      const auth = String(headers.get("authorization") || "");
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const body = JSON.parse(String(init.body || "{}"));
      assert.equal(body.audience, AUDIENCE);
      const payload = tokenPayload(token);
      if (!payload) return Response.json({ ok: false, valid: false, error: "token_invalid" }, { status: 401 });
      return Response.json({ ok: true, valid: true, payload });
    }
    if (url.startsWith("https://stream-admin.test/skip")) return new Response("OK", { status: 200 });
    if (url === "https://discord.test/webhook") return new Response(null, { status: 204 });
    return originalFetch(input, init);
  };
  return { calls, restore() { globalThis.fetch = originalFetch; } };
}

async function call(path, init = {}, env = baseEnv) {
  const headers = new Headers(init.headers || {});
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env, ctx);
}

function browserHeaders(token = "valid-token") {
  return { origin: ORIGIN, authorization: `Bearer ${token}`, "content-type": "application/json" };
}

test("same-origin login sends the password only to the Password Worker and verifies the returned token", async () => {
  const mock = installAuthMock();
  try {
    const response = await call("/api/admin/login", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ password: "correct-password" })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.token, "valid-token");
    assert.equal(data.issuer, "666-system-pw");
    assert.equal(data.scope, "admin");
    assert.equal(data.audience, AUDIENCE);
    assert.equal(data.expiresAt, FUTURE_EXP);
    assert.equal(mock.calls.filter(call => call.url === "https://pw.test/login").length, 1);
    assert.equal(mock.calls.filter(call => call.url === "https://auth.test/verify").length, 1);
  } finally { mock.restore(); }
});

test("wrong password is rejected without exposing it to a function route", async () => {
  const mock = installAuthMock();
  try {
    const response = await call("/api/admin/login", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" })
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: "password_rejected" });
  } finally { mock.restore(); }
});

test("login rejects wrong origin and requests without browser origin evidence", async () => {
  const mock = installAuthMock();
  try {
    const wrong = await call("/api/admin/login", {
      method: "POST",
      headers: { origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify({ password: "correct-password" })
    });
    assert.equal(wrong.status, 403);
    assert.equal((await wrong.json()).error, "origin_rejected");

    const missing = await call("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "correct-password" })
    });
    assert.equal(missing.status, 403);
    assert.equal((await missing.json()).error, "origin_rejected");
  } finally { mock.restore(); }
});

for (const [token, expectedError, expectedStatus] of [
  ["wrong-issuer", "issuer_rejected", 403],
  ["wrong-scope", "scope_rejected", 403],
  ["wrong-audience", "audience_rejected", 403],
  ["expired-token", "token_expired", 401],
  ["bad-token", "token_invalid", 401]
]) {
  test(`strict auth rejects ${expectedError}`, async () => {
    const mock = installAuthMock();
    try {
      const response = await call("/api/admin/auth-check", { headers: browserHeaders(token) });
      assert.equal(response.status, expectedStatus);
      assert.equal((await response.json()).error, expectedError);
    } finally { mock.restore(); }
  });
}

test("missing Bearer token is rejected and x-admin-password cannot authorize skip", async () => {
  const mock = installAuthMock();
  try {
    const response = await call("/api/admin/skip", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json", "x-admin-password": "correct-password" },
      body: JSON.stringify({ source: "legacy-test" })
    }, {
      ...baseEnv,
      SHOUTCAST_ADMIN_URL: "https://stream-admin.test/skip",
      SHOUTCAST_ADMIN_USER: "admin",
      SHOUTCAST_ADMIN_PASSWORD: "secret"
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "token_invalid");
    assert.equal(mock.calls.filter(call => call.url === "https://pw.test/login").length, 0);
  } finally { mock.restore(); }
});

test("browser write without Origin or Referer is rejected", async () => {
  const mock = installAuthMock();
  try {
    const response = await call("/api/admin/skip", {
      method: "POST",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ source: "missing-origin" })
    }, {
      ...baseEnv,
      SHOUTCAST_ADMIN_URL: "https://stream-admin.test/skip",
      SHOUTCAST_ADMIN_USER: "admin",
      SHOUTCAST_ADMIN_PASSWORD: "secret"
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, "origin_rejected");
  } finally { mock.restore(); }
});

test("service-to-service write without browser Origin requires the shared service token", async () => {
  const mock = installAuthMock();
  try {
    const commonEnv = {
      ...baseEnv,
      SHOUTCAST_ADMIN_URL: "https://stream-admin.test/skip",
      SHOUTCAST_ADMIN_USER: "admin",
      SHOUTCAST_ADMIN_PASSWORD: "secret"
    };
    const denied = await call("/api/admin/skip", {
      method: "POST",
      headers: { authorization: "Bearer valid-token", "x-service-token": "wrong", "content-type": "application/json" },
      body: JSON.stringify({ source: "service" })
    }, commonEnv);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error, "service_auth_rejected");

    const allowed = await call("/api/admin/skip", {
      method: "POST",
      headers: { authorization: "Bearer valid-token", "x-service-token": SERVICE_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ source: "service" })
    }, commonEnv);
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).ok, true);
  } finally { mock.restore(); }
});

test("health never acts as authentication", async () => {
  const health = await call("/health", { headers: { origin: ORIGIN } });
  assert.equal(health.status, 200);
  const denied = await call("/api/admin/auth-check", { headers: { origin: ORIGIN } });
  assert.equal(denied.status, 401);
});

test("Discord write/test/debug routes use the same strict admin gate", async () => {
  const mock = installAuthMock();
  try {
    const env = { ...baseEnv, DISCORD_WEBHOOK_URL: "https://discord.test/webhook" };
    const deniedWrite = await call("/api/discord/test", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ message: "test" })
    }, env);
    assert.equal(deniedWrite.status, 401);

    const allowedWrite = await call("/api/discord/test", {
      method: "POST",
      headers: browserHeaders(),
      body: JSON.stringify({ message: "test" })
    }, env);
    assert.equal(allowedWrite.status, 200);
    assert.equal((await allowedWrite.json()).ok, true);

    const deniedDebug = await call("/api/discord/debug", { headers: { origin: ORIGIN } }, env);
    assert.equal(deniedDebug.status, 401);
    const allowedDebug = await call("/api/discord/debug", { headers: browserHeaders() }, env);
    assert.equal(allowedDebug.status, 200);
  } finally { mock.restore(); }
});

test("runtime code contains one central browser auth client and no legacy password header flow", async () => {
  const files = [
    "../js/admin-auth.js",
    "../js/player-stage-v2.js",
    "../js/player-admin-overlay.js",
    "../js/addons/discord-player-addon-v3.js",
    "../worker-addons/radio-admin-config-addon.js",
    "../worker-addons/discord-notify-addon-v3.js",
    "../worker.js",
    "../Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py",
    "../Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/index.html",
    "../renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py",
    "../renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/src/index.html"
  ];
  const texts = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), "utf8")));
  const runtime = texts.join("\n");
  assert.equal((runtime.match(/window\.S666AdminAuth\s*=/g) || []).length, 1);
  assert.equal(runtime.includes("x-admin-password"), false);
  assert.equal(runtime.includes("FALLBACK_DISCORD_GATE_SHA256"), false);
  assert.equal(runtime.includes("666-system-auth.666soundsdesign-broadcaster.com/login"), false);
  assert.equal(runtime.includes("PW_VERIFY_URL"), false);
  assert.equal(runtime.includes("PW_AUTH_SECRET"), false);
  assert.equal(runtime.includes("MASTER_ADMIN_PASSWORD"), false);
});

test("renderer processing endpoint is service-to-service only", async () => {
  const server = await readFile(new URL("../Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py", import.meta.url), "utf8");
  const ui = await readFile(new URL("../Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/index.html", import.meta.url), "utf8");
  assert.equal(server.includes("@app.post(\"/process\")"), true);
  assert.equal(server.includes("check_player_alert_service(request)"), true);
  assert.equal(server.includes("check_admin(request)"), false);
  assert.equal(ui.includes("x-player-alert-service-token"), true);
  assert.equal(ui.includes("fetch(\"/process\"") || ui.includes("fetch('/process'"), false);
});
