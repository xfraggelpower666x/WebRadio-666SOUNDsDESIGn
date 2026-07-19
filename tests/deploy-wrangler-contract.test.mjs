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
