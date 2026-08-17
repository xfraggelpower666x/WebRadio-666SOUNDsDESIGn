// AutoSkip dedicated-worker authority and all-player authentication-chain regression contract v1.4.0.
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

function dedicatedEnv(extra = {}) {
  return {
    ADMIN_AUTH_VERIFY_URL: "https://auth.test/verify",
    AUTH_AUDIENCE: AUDIENCE,
    S666_AUTODJ_SKIP_URL: "https://autodj.test/autodj/skip",
    S666_AUTODJ_SKIP_ACCESS_TOKEN: "autodj-secret",
    ...extra
  };
}

test("protected AutoSkip delegates to the dedicated worker with a server-side-only token", async () => {
  const seen = [];
  await withMockFetch(async (url, init = {}) => {
    const value = String(url);
    const headers = new Headers(init.headers || {});
    seen.push({ value, authorization: headers.get("authorization"), body: init.body || "" });
    if (value.includes("auth.test")) return validAuth();
    if (value.includes("autodj.test")) return Response.json({ ok: true, service: "666-autodj-skip", version: "1.2.0", action: "autodj_skip", verified: true });
    throw new Error(`unexpected_fetch:${value}`);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", {
      method: "POST",
      headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" },
      body: "{}"
    }), dedicatedEnv());
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.upstream, "666-autodj-skip");
    assert.equal(seen.length, 2);
    assert.equal(seen[1].authorization, "Bearer autodj-secret");
    assert.match(String(seen[1].body), /admin-player/);
    assert.doesNotMatch(seen.map(item => item.value).join(" "), /admin\.cgi|666myidjstreamadmin/);
  });
});

test("authenticated compatibility aliases stay behind the same Player Admin gate", async () => {
  for (const path of COMPATIBILITY_PATHS) {
    const seen = [];
    await withMockFetch(async (url, init = {}) => {
      const value = String(url);
      const headers = new Headers(init.headers || {});
      seen.push({ value, authorization: headers.get("authorization") });
      if (value.includes("auth.test")) return validAuth();
      if (value.includes("autodj.test")) return Response.json({ ok: true, service: "666-autodj-skip", action: "autodj_skip", verified: true });
      throw new Error(`unexpected_fetch:${value}`);
    }, async () => {
      const response = await handleRadioAdminConfigAddon(req(path, {
        method: "POST",
        headers: {
          origin: "https://radio.test",
          authorization: "Bearer player-token",
          "cf-connecting-ip": `198.51.100.${COMPATIBILITY_PATHS.indexOf(path) + 20}`,
          "content-type": "application/json"
        },
        body: "{}"
      }), dedicatedEnv());
      const data = await response.json();
      assert.equal(response.status, 200, path);
      assert.equal(data.ok, true, path);
      assert.equal(data.upstream, "666-autodj-skip", path);
      assert.equal(seen.length, 2, path);
      assert.equal(seen[1].authorization, "Bearer autodj-secret", path);
    });
  }
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
      }), { S666_AUTODJ_SKIP_ACCESS_TOKEN: "must-not-be-used" });
      const data = await response.json();
      assert.equal(response.status, 404, path);
      assert.equal(data.error, "protected_route_required", path);
      assert.equal(data.protectedWriteRoute, "/api/admin/skip", path);
    }
  });
  assert.equal(fetchCalls, 0);
});

test("missing dedicated worker token is a configuration error, not a Player Admin password error", async () => {
  await withMockFetch(async (url) => String(url).includes("auth.test") ? validAuth() : (() => { throw new Error("unexpected"); })(), async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", {
      method: "POST",
      headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" },
      body: "{}"
    }), dedicatedEnv({ S666_AUTODJ_SKIP_ACCESS_TOKEN: "" }));
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.error, "autodj_skip_access_token_missing");
    assert.notEqual(data.error, "password_rejected");
  });
});

test("dedicated worker token rejection remains distinct from Player Admin password rejection", async () => {
  await withMockFetch(async (url) => {
    const value = String(url);
    if (value.includes("auth.test")) return validAuth();
    if (value.includes("autodj.test")) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw new Error(`unexpected_fetch:${value}`);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(req("/api/admin/skip", {
      method: "POST",
      headers: { origin: "https://radio.test", authorization: "Bearer player-token", "content-type": "application/json" },
      body: "{}"
    }), dedicatedEnv({ S666_AUTODJ_SKIP_ACCESS_TOKEN: "wrong-token" }));
    const data = await response.json();
    assert.equal(response.status, 401);
    assert.equal(data.upstreamStatus, 401);
    assert.equal(data.error, "autodj_skip_access_token_rejected");
    assert.notEqual(data.error, "password_rejected");
  });
});

test("root and public skip controllers are byte-identical and have no obsolete MyIDJ fallback", async () => {
  const root = await readFile(new URL("../js/skip-control.js", import.meta.url), "utf8");
  const mirror = await readFile(new URL("../public/js/skip-control.js", import.meta.url), "utf8");
  assert.equal(root, mirror);
  assert.match(root, /S666AdminAuth\.fetch\('\/api\/admin\/skip'/);
  assert.doesNotMatch(root, /\/api\/radio\/skip|myidj/i);
});

test("Main desktop, Main iPhone, VELUNA and Internal all delegate SKIP to S666SkipControl", async () => {
  const mainHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const stage = await readFile(new URL("../js/player-stage-v2.js", import.meta.url), "utf8");
  const veluna = await readFile(new URL("../veluna/index.html", import.meta.url), "utf8");
  const velunaMirror = await readFile(new URL("../public/veluna/index.html", import.meta.url), "utf8");
  const worker = await readFile(new URL("../worker.js", import.meta.url), "utf8");

  assert.match(mainHtml, /\/js\/skip-control\.js/);
  assert.match(stage, /id,'s666StageSkip'|makeButton\('s666StageSkip'/);
  assert.match(stage, /makeButton\('s666StageMobileSkip'/);
  assert.match(stage, /S666SkipControl\.skip/);

  for (const [name, html] of [["VELUNA", veluna], ["VELUNA public mirror", velunaMirror]]) {
    assert.match(html, /id="skipBtn"/, name);
    assert.match(html, /\/js\/skip-control\.js/, name);
    assert.match(html, /S666SkipControl\.skip/, name);
  }

  assert.match(worker, /id="skipBtn"/);
  assert.match(worker, /\/js\/skip-control\.js/);
  assert.match(worker, /S666SkipControl\.skip/);
});

test("documented runtime config names the dedicated AutoDJ Worker route and secret", async () => {
  const envExample = await readFile(new URL("../config/admin-runtime.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^S666_AUTODJ_SKIP_URL=https:\/\/666-autodj-skip\.666soundsdesign-broadcaster\.com\/autodj\/skip$/m);
  assert.match(envExample, /^S666_AUTODJ_SKIP_ACCESS_TOKEN=put_matching_dedicated_autodj_skip_access_token_in_worker_secret_only$/m);
  assert.doesNotMatch(envExample, /^MYIDJ_WORKER_SKIP_URL=/m);
});
