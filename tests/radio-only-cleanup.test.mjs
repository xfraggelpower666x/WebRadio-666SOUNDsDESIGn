import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootUrl = new URL('../', import.meta.url);
const rootPath = fileURLToPath(rootUrl);

async function exists(path) {
  try { await access(new URL(path, rootUrl)); return true; } catch { return false; }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full)); else out.push(full);
  }
  return out;
}

test('radio-only release contains no Chaos or Suno worker payloads', async () => {
  for (const path of [
    'CHAOS_ENGINE/',
    'external-workers/666-chaos-ai-track-system/',
    'external-workers/666-suno-system/',
    'worker-addons/chaos-engine-api-addon.js',
    'chaos-matrix-control.html'
  ]) assert.equal(await exists(path), false, `${path} must be absent`);

  const files = await walk(rootPath);
  const production = files.filter(file => !file.includes('/docs/') && !file.includes('RELEASE-FILE-INVENTORY') && !file.includes('RELEASE-TREE-SHA256SUMS') && !file.endsWith('radio-only-cleanup.test.mjs') && !file.endsWith('/scripts/check-release.mjs'));
  const forbidden = /666-chaos-ai-track-system|666-suno-system|CHAOS_ENGINE|\/api\/suno|\/chaos-system/i;
  for (const file of production.filter(file => /\.(?:js|mjs|json|jsonc|html|css|md|txt)$/i.test(file))) {
    const text = await readFile(file, 'utf8').catch(() => '');
    assert.equal(forbidden.test(text), false, `obsolete system reference in ${file}`);
  }
});

test('asset mirrors contain only the referenced production set', async () => {
  const rootAssets = (await walk(join(rootPath, 'assets'))).sort();
  const publicAssets = (await walk(join(rootPath, 'public', 'assets'))).sort();
  assert.equal(rootAssets.length, 17);
  assert.equal(publicAssets.length, 17);
  const normalizedRoot = rootAssets.map(path => path.split('/assets/')[1]);
  const normalizedPublic = publicAssets.map(path => path.split('/public/assets/')[1]);
  assert.deepEqual(normalizedPublic, normalizedRoot);
});
