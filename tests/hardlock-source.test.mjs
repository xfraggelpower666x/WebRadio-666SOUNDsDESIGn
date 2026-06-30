import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy admin login paths and password headers are hardlocked out", async () => {
  const overlay = await read("js/player-admin-overlay.js");
  assert.match(overlay, /window\.S666AdminAuth/);
  assert.match(overlay, /client\.ensure/);
  assert.doesNotMatch(overlay, /AUTH_LOGIN_URL|x-admin-password|pwOkCache|function checkPw\(/);
});

test("all protected config routes use strict password-issued admin gate", async () => {
  const addon = await read("worker-addons/radio-admin-config-addon.js");
  assert.match(addon, /requireAdminGate\(request, env, \{ requireGithub: true \}\)/);
  assert.match(addon, /requireAdminGate\(request, env, \{ requireGithub: true, requireWriteOrigin: true \}\)/);
  assert.doesNotMatch(addon, /async function requireAdmin\(/);
  assert.match(addon, /issuer_invalid/);
  assert.match(addon, /scope_invalid/);
  assert.match(addon, /token_expired/);
});

test("meter hardlock removes synthetic and Boost-driven level animation", async () => {
  const phase = await read("js/phase10-stability-iphone-panel-hud.js");
  assert.doesNotMatch(phase, /improveMeterScaling|phase10-meter-boost-scale|Date\.now\(\)\/140|Date\.now\(\)\/95|boostPush|m\.boost/);
  assert.equal((phase.match(/function startIphoneAudioStabilityGuardV2/g) || []).length, 1);
  assert.doesNotMatch(phase, /installAudioRecovery/);
  assert.match(phase, /CentralAudioStabilityGuardV2 is the single automatic recovery authority/);
});

test("Player Alert hardlock does not bind rate limits to client senderId or expose rateKey", async () => {
  const worker = await read("worker.js");
  const identity = worker.match(/async function playerAlertRateIdentity[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(identity, /senderId/);
  assert.match(identity, /ip.*userAgent/s);
  assert.doesNotMatch(worker, /clientId:senderId,rateKey/);
  assert.match(worker, /playerAlertPublicPayload/);
});

test("authorized admin fetch is restricted to the WebRadio origin", async () => {
  const auth = await read("js/admin-auth-client.js");
  assert.match(auth, /cross_origin_authorized_fetch_rejected/);
  assert.match(auth, /credentials: 'same-origin'/);
  assert.match(auth, /ensure: ensure/);
});
