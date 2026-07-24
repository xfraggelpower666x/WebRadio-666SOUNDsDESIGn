// AutoSkip authority and authentication-chain regression contract v1.0.0.
import test from "node:test";
import assert from "node:assert/strict";
import { handleRadioAdminConfigAddon } from "../worker-addons/radio-admin-config-addon.js";

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const AUDIENCE = "666SOUNDsDESIGn-WebRadio-Admin";
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
    assert.equal(response.status, 401); assert.equal(data.error, "myidj_admin_token_rejected"); assert.notEqual(data.error, "password_rejected");
  });
});
