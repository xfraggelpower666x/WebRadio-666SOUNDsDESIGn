import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}

test("PW and Auth deploys update scripts without mutating dashboard-managed domains", async () => {
  for (const path of [
    "external-workers/666-system-pw-worker/wrangler.jsonc",
    "external-workers/666-system-auth-worker/wrangler.jsonc"
  ]) {
    const config = await readJson(path);
    assert.equal(config.workers_dev, false, path);
    assert.equal(Object.hasOwn(config, "route"), false, path);
    assert.equal(Object.hasOwn(config, "routes"), false, path);
    assert.equal(typeof config.name, "string", path);
    assert.equal(config.main, "worker.js", path);
  }
});

test("main deploy pins the canonical Player Admin Worker contract without committing secrets", async () => {
  const config = await readJson("wrangler.jsonc");
  assert.equal(config.vars.PW_LOGIN_URL, "https://666-system-pw.666soundsdesign-broadcaster.com/login");
  assert.equal(config.vars.ADMIN_AUTH_VERIFY_URL, "https://666-system-auth.666soundsdesign-broadcaster.com/verify");
  assert.equal(config.vars.AUTH_AUDIENCE, "666SOUNDsDESIGn-WebRadio-Admin");
  assert.deepEqual(Object.fromEntries(config.services.map(item => [item.binding, item.service])), {
    PW_ADMIN_WORKER: "666-system-pw-worker",
    AUTH_ADMIN_WORKER: "666-system-auth-worker"
  });
  assert.equal(Object.hasOwn(config, "compatibility_flags"), false);
  assert.equal(Object.hasOwn(config.vars, "ADMIN_SERVICE_TOKEN"), false);
});
