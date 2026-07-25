// AutoSkip authority and authentication-chain regression contract v1.1.0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleRadioAdminConfigAddon } from "../worker-addons/radio-admin-config-addon.js";
import { handleSkipApi } from "../worker-addons/skip-api-addon.js";

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const AUDIENCE = "666SOUNDsDESIGn-WebRadio-Admin";
const COMPATIBILITY_PATHS = ["/api/skip", "/api/radio/skip", "/radio/autodj/skip", "/admin/autodj/skip", "/skip"];
function req(path, init = {}) { return new Request(`https://radio.test${path}`, init); }
async function withMockFetch(mock, fn) { const original = globalThis.fetch; globalThis.fetch = mock; try { return await fn(); } finally { globalThis.fetch = original; } }
function validAuth() { return Response.json({ ok: true, valid: true, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "admin", exp: FUTURE } }); }

test("protected AutoSkip delegates to 666myidjstreamadmin with a server-side token", async () => {
  const seen = [];
  await withMockFetch(async (url, init = {}) => {
    const value = String(url); const headers = new Headers(init.headers || {}); seen.push({ value, authorization: headers.get("authorization"), adminToken: headers.get("x-admin-token") });
    if (value.includes("auth.test")) return validAuth();
    if (value.includes("myidj.test")) return Response.json({ ok: true, action: "skip", status: 200 });
    throw new Error(`unexpected_fetch:${value}`);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", { method: "POST", headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" }, body: "{}" }), {
      ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify", AUTH_AUDIENCE: AUDIENCE,
      MYIDJ_WORKER_SKIP_URL: "https://myidj.test/api/radio/skip", MYIDJ_WORKER_ADMIN_TOKEN: "myidj-secret"
    });
    const data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.ok, true); assert.equal(data.skipAuthority, "666myidjstreamadmin");
    assert.equal(seen.length, 2); assert.equal(seen[1].authorization, "Bearer myidj-secret"); assert.equal(seen[1].adminToken, "myidj-secret");
    assert.doesNotMatch(seen.map(item => item.value).join(" "), /admin\.cgi/);
  });
});

test("authenticated compatibility alias stays behind the Player Admin gate", async () => {
  const seen = [];
  await withMockFetch(async (url, init = {}) => {
    const value = String(url);
    const headers = new Headers(init.headers || {});
    seen.push({ value, authorization: headers.get("authorization"), adminToken: headers.get("x-admin-token") });
    if (value.includes("auth.test")) return validAuth();
    if (value.includes("myidj.test")) return Response.json({ ok: true, action: "skip", status: 200 });
    throw new Error(`unexpected_fetch:${value}`);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/radio/skip", {
      method: "POST",
      headers: {
        origin: "https://radio.test",
        authorization: "Bearer player-token",
        "cf-connecting-ip": "198.51.100.42",
        "content-type": "application/json"
      },
      body: "{}"
    }), {
      ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify",
      AUTH_AUDIENCE: AUDIENCE,
      MYIDJ_WORKER_SKIP_URL: "https://myidj.test/api/radio/skip",
      MYIDJ_WORKER_ADMIN_TOKEN: "myidj-secret"
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.skipAuthority, "666myidjstreamadmin");
    assert.equal(seen.length, 2);
    assert.equal(seen[1].authorization, "Bearer myidj-secret");
    assert.equal(seen[1].adminToken, "myidj-secret");
  });
});

test("all compatibility write aliases reject requests without Player Admin auth", async () => {
  let fetchCalls = 0;
  await withMockFetch(async () => {
    fetchCalls += 1;
    throw new Error("unauthenticated compatibility alias must not fetch");
  }, async () => {
    for (const path of COMPATIBILITY_PATHS) {
      const response = await handleRadioAdminConfigAddon(req(path, {
        method: "POST",
        headers: { origin: "https://radio.test", "content-type": "application/json" },
        body: "{}"
      }), {});
      const data = await response.json();
      assert.equal(response.status, 401, path);
      assert.equal(data.error, "auth_token_missing", path);
    }
  });
  assert.equal(fetchCalls, 0);
});

test("standalone compatibility handler cannot proxy a write around the admin gate", async () => {
  let fetchCalls = 0;
  await withMockFetch(async () => {
    fetchCalls += 1;
    throw new Error("fail-closed handler must not fetch");
  }, async () => {
    for (const path of COMPATIBILITY_PATHS) {
      const response = await handleSkipApi(req(path, {
        method: "POST",
        headers: { origin: "https://radio.test", "content-type": "application/json" },
        body: "{}"
      }), { MYIDJ_WORKER_ADMIN_TOKEN: "must-not-be-used" });
      const data = await response.json();
      assert.equal(response.status, 404, path);
      assert.equal(data.error, "protected_route_required", path);
      assert.equal(data.protectedWriteRoute, "/api/admin/skip", path);
    }
  });
  assert.equal(fetchCalls, 0);
});

test("missing MyIDJ worker token is reported as configuration error, not wrong password", async () => {
  await withMockFetch(async (url) => String(url).includes("auth.test") ? validAuth() : (() => { throw new Error("unexpected"); })(), async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", { method: "POST", headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" }, body: "{}" }), {
      ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify", AUTH_AUDIENCE: AUDIENCE, MYIDJ_WORKER_SKIP_URL: "https://myidj.test/api/radio/skip"
    });
    const data = await response.json();
    assert.equal(response.status, 503); assert.equal(data.error, "myidj_admin_token_missing"); assert.notEqual(data.error, "password_rejected");
  });
});

test("MyIDJ token rejection remains distinct from Player Admin password rejection", async () => {
  await withMockFetch(async (url) => {
    const value = String(url); if (value.includes("auth.test")) return validAuth();
    if (value.includes("myidj.test")) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    throw new Error(`unexpected_fetch:${value}`);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", { method: "POST", headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" }, body: "{}" }), {
      ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify", AUTH_AUDIENCE: AUDIENCE,
      MYIDJ_WORKER_SKIP_URL: "https://myidj.test/api/radio/skip", MYIDJ_WORKER_ADMIN_TOKEN: "wrong-token"
    });
    const data = await response.json();
    assert.equal(response.status, 502); assert.equal(data.upstreamStatus, 401);
    assert.equal(data.error, "myidj_admin_token_rejected"); assert.notEqual(data.error, "password_rejected");
  });
});

test("documented runtime config includes the canonical MyIDJ worker route and secret name", async () => {
  const envExample = await readFile(new URL("../config/admin-runtime.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^MYIDJ_WORKER_SKIP_URL=https:\/\/666myidjstreamadmin\.666soundsdesign-broadcaster\.com\/api\/radio\/skip$/m);
  assert.match(envExample, /^MYIDJ_WORKER_ADMIN_TOKEN=put_matching_myidj_worker_admin_token_in_worker_secret_only$/m);
});
