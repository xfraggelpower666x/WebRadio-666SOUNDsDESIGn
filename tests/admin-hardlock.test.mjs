import test from "node:test";
import assert from "node:assert/strict";
import { handleRadioAdminConfigAddon, verifyPwIssuedToken } from "../worker-addons/radio-admin-config-addon.js";
import passwordWorker from "../external-workers/666-system-pw-worker/worker.js";
import authWorker from "../external-workers/666-system-auth-worker/worker.js";

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const AUDIENCE = "666SOUNDsDESIGn-WebRadio-Admin";

function request(path, init = {}) {
  return new Request(`https://radio.test${path}`, init);
}

async function withMockFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { return await fn(); }
  finally { globalThis.fetch = original; }
}

test("password-issued token hardlock validates issuer, scope and expiry separately", () => {
  assert.equal(verifyPwIssuedToken({ ok: true, expectedAudience: AUDIENCE, payload: { iss: "other", aud: AUDIENCE, scope: "admin", exp: FUTURE } }).error, "issuer_invalid");
  assert.equal(verifyPwIssuedToken({ ok: true, expectedAudience: AUDIENCE, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "reader", exp: FUTURE } }).error, "scope_invalid");
  assert.equal(verifyPwIssuedToken({ ok: true, expectedAudience: AUDIENCE, payload: { iss: "666-system-pw", aud: "wrong", scope: "admin", exp: FUTURE } }).error, "audience_invalid");
  assert.equal(verifyPwIssuedToken({ ok: true, expectedAudience: AUDIENCE, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "admin", exp: 1 } }).error, "token_expired");
  assert.equal(verifyPwIssuedToken({ ok: true, expectedAudience: AUDIENCE, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "admin", exp: FUTURE } }).ok, true);
});

test("admin config rejects a valid auth token with the wrong issuer before GitHub access", async () => {
  let calls = 0;
  await withMockFetch(async () => {
    calls += 1;
    return Response.json({ ok: true, valid: true, payload: { iss: "other", scope: "admin", exp: FUTURE } });
  }, async () => {
    const response = await handleRadioAdminConfigAddon(request("/api/admin/config/current", {
      headers: { authorization: "Bearer token" }
    }), {});
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, "issuer_invalid");
    assert.equal(calls, 1);
  });
});

test("state-changing admin routes require explicit same-origin evidence", async () => {
  const response = await handleRadioAdminConfigAddon(request("/api/admin/config/update", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify({})
  }), {});
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "origin_rejected");
});

test("login follows the PW/Auth contract and forwards hardlock service headers", async () => {
  const seen = [];
  await withMockFetch(async (url, init = {}) => {
    const headers = new Headers(init.headers || {});
    seen.push({ url: String(url), origin: headers.get("origin"), serviceToken: headers.get("x-admin-service-token") });
    if (String(url).includes("666-system-pw")) return Response.json({ ok: true, token: "abc.def", expiresAt: FUTURE });
    if (String(url).includes("666-system-auth")) return Response.json({ ok: true, valid: true, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "admin", exp: FUTURE } });
    throw new Error("unexpected_fetch");
  }, async () => {
    const response = await handleRadioAdminConfigAddon(request("/api/admin/login", {
      method: "POST",
      headers: { origin: "https://radio.test", "content-type": "application/json" },
      body: JSON.stringify({ password: "correct" })
    }), {
      ADMIN_SERVICE_ORIGIN: "https://radio.test/",
      ADMIN_SERVICE_TOKEN: "service-secret",
      AUTH_AUDIENCE: AUDIENCE
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.issuer, "666-system-pw");
    assert.equal(seen.length, 2);
    assert.deepEqual(seen.map(item => item.origin), ["https://radio.test", "https://radio.test"]);
    assert.deepEqual(seen.map(item => item.serviceToken), ["service-secret", "service-secret"]);
  });
});

test("PW/Auth workers implement one deployable contract", async () => {
  const common = {
    ALLOWED_ORIGIN: "https://radio.test",
    ADMIN_SERVICE_TOKEN: "service-secret",
    AUTH_SECRET: "shared-auth-secret",
    AUTH_AUDIENCE: AUDIENCE
  };
  const login = await passwordWorker.fetch(request("/login", {
    method: "POST",
    headers: {
      origin: "https://radio.test",
      "x-admin-service-token": "service-secret",
      "content-type": "application/json"
    },
    body: JSON.stringify({ password: "correct-password" })
  }), { ...common, ADMIN_PASSWORD: "correct-password" });
  assert.equal(login.status, 200);
  const loginData = await login.json();
  assert.equal(loginData.ok, true);
  assert.ok(loginData.token);

  const verify = await authWorker.fetch(request("/verify", {
    method: "POST",
    headers: {
      origin: "https://radio.test",
      "x-admin-service-token": "service-secret",
      authorization: `Bearer ${loginData.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ token: loginData.token })
  }), common);
  assert.equal(verify.status, 200);
  const verifyData = await verify.json();
  assert.equal(verifyData.ok, true);
  assert.equal(verifyData.valid, true);
  assert.equal(verifyData.payload.iss, "666-system-pw");
  assert.equal(verifyData.payload.scope, "admin");
  assert.equal(verifyData.payload.aud, AUDIENCE);
});

test("PW/Auth workers fail closed when the service token is configured but missing", async () => {
  const response = await passwordWorker.fetch(request("/login", {
    method: "POST",
    headers: { origin: "https://radio.test", "content-type": "application/json" },
    body: JSON.stringify({ password: "correct-password" })
  }), {
    ALLOWED_ORIGIN: "https://radio.test",
    ADMIN_SERVICE_TOKEN: "service-secret",
    AUTH_SECRET: "shared-auth-secret",
    ADMIN_PASSWORD: "correct-password",
    AUTH_AUDIENCE: AUDIENCE
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "service_auth_rejected");
});


test("PW/Auth hardening requires audience, service token and rate limiting source", () => {
  const pwSource = new URL("../external-workers/666-system-pw-worker/worker.js", import.meta.url);
  const authSource = new URL("../external-workers/666-system-auth-worker/worker.js", import.meta.url);
  return Promise.all([import("node:fs/promises").then(fs => fs.readFile(pwSource, "utf8")), import("node:fs/promises").then(fs => fs.readFile(authSource, "utf8"))]).then(([pw, auth]) => {
    assert.match(pw, /AUTH_AUDIENCE/);
    assert.match(pw, /login_rate_limited/);
    assert.match(pw, /ADMIN_SERVICE_TOKEN/);
    assert.match(auth, /audience_invalid/);
    assert.match(auth, /service_token_missing/);
  });
});
