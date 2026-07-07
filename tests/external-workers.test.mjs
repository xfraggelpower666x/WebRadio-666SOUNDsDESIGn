import test from "node:test";
import assert from "node:assert/strict";
import chaosWorker from "../external-workers/666-chaos-ai-track-system/worker.js";
import sunoWorker from "../external-workers/666-suno-system/worker.js";

const ctx = { waitUntil() {}, passThroughOnException() {} };

function req(path, init = {}) {
  return new Request(`https://worker.test${path}`, init);
}

test("Chaos worker health and hidden debug contract", async () => {
  const env = { ALLOWED_ORIGINS: "https://radio.test" };
  const health = await chaosWorker.fetch(req("/health"), env, ctx);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).version, "1.0.1");

  const debug = await chaosWorker.fetch(req("/debug"), env, ctx);
  assert.equal(debug.status, 404);
  assert.equal((await debug.json()).error, "not_found");
});

test("Chaos worker uses an explicit CORS allowlist", async () => {
  const env = { ALLOWED_ORIGINS: "https://radio.test" };
  const denied = await chaosWorker.fetch(req("/health", {
    method: "OPTIONS",
    headers: { origin: "https://evil.test" }
  }), env, ctx);
  assert.equal(denied.status, 403);

  const allowed = await chaosWorker.fetch(req("/health", {
    method: "OPTIONS",
    headers: { origin: "https://radio.test" }
  }), env, ctx);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://radio.test");
});

test("Suno worker reports provider state honestly", async () => {
  const env = { ALLOWED_ORIGINS: "https://radio.test" };
  const health = await sunoWorker.fetch(req("/health"), env, ctx);
  assert.equal(health.status, 200);
  const healthData = await health.json();
  assert.equal(healthData.configured, false);

  const adapter = await sunoWorker.fetch(req("/api/suno/adapter/status"), env, ctx);
  assert.equal(adapter.status, 200);
  const adapterData = await adapter.json();
  assert.equal(adapterData.mode, "generic-rest");
  assert.equal(adapterData.configured, false);
});

test("Suno create route is protected and no placeholder job is created", async () => {
  const env = { ALLOWED_ORIGINS: "https://radio.test" };
  const response = await sunoWorker.fetch(req("/api/suno/create", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://radio.test" },
    body: JSON.stringify({ title: "Test", style: "Dark Psytrance", lyrics: "Test" })
  }), env, ctx);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "unauthorized");
});
