import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

if (!globalThis.caches) {
  const memory = new Map();
  globalThis.caches = { default: {
    async match(request) { return memory.get(request.url) || null; },
    async put(request, response) { memory.set(request.url, response.clone()); }
  }};
}
const ctx = { waitUntil() {}, passThroughOnException() {} };
const env = { ENABLE_PUBLIC_DEBUG: "false", RELEASE_VERSION: "FULLVERSION_HARDLOCK_REPAIR_v1.2.0", PLAYER_ALERT_RATE_SALT: "test-rate-salt" };
const call = (path, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (!headers.has("origin")) headers.set("origin", "https://radio.test");
  return worker.fetch(new Request(`https://radio.test${path}`, { ...init, headers }), env, ctx);
};

test("Player Alert rejects the old text-only request contract", async () => {
  const response = await call("/api/player-alert/send", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "legacy", senderId: "test" })
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "empty_message");
});

test("Player Alert accepts message contract and returns a real storage source", async () => {
  const response = await call("/api/player-alert/send", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "node-test-a" },
    body: JSON.stringify({ message: "Audit repair test", senderId: "contract-a", username: "Broadcast", source: "test" })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.match(data.source, /cache-tertiary|kv-fallback|backend/);
});

test("Player Alert rate limit uses server-assisted identity", async () => {
  const status = await call("/api/player-alert/status");
  const data = await status.json();
  assert.equal(data.rateIdentity, "server-controlled-ip-ua-sha256");
  assert.equal(data.rateSaltConfigured, true);
});

test("cross-origin Player Alert writes are rejected", async () => {
  const response = await call("/api/player-alert/send", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://evil.test" },
    body: JSON.stringify({ message: "no", senderId: "evil" })
  });
  assert.equal(response.status, 401);
});


test("Player Alert changing senderId cannot bypass the server-controlled rate bucket", async () => {
  const headers = {
    "content-type": "application/json",
    "user-agent": "hardlock-rate-test",
    "cf-connecting-ip": "203.0.113.44"
  };
  const first = await call("/api/player-alert/send", {
    method: "POST", headers,
    body: JSON.stringify({ message: "first", senderId: "sender-a", username: "Broadcast" })
  });
  assert.equal(first.status, 200);
  const firstData = await first.json();
  assert.equal(Object.prototype.hasOwnProperty.call(firstData, "rateKey"), false);

  const second = await call("/api/player-alert/send", {
    method: "POST", headers,
    body: JSON.stringify({ message: "second", senderId: "sender-b", username: "Broadcast" })
  });
  assert.equal(second.status, 429);
  assert.equal((await second.json()).error, "rate_limited");
});
