import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('shared source labels are mirrored and canonically locked to M/B', async () => {
  const root = await read('js/shared-status.js');
  const mirror = await read('public/js/shared-status.js');
  assert.equal(mirror, root);
  assert.match(root, /mainBtn:\s*\{\s*code:\s*'M',\s*title:\s*'Main Stream'\s*\}/);
  assert.match(root, /fallbackBtn:\s*\{\s*code:\s*'B',\s*title:\s*'Backup Stream'\s*\}/);
  assert.match(root, /function enforceCanonicalSourceLabel\(el\)/);
  assert.match(root, /new MutationObserver\(\(\) => enforceCanonicalSourceLabel\(el\)\)/);
});

test('legacy setMbChips H writer is detected and cannot own the visible label', async () => {
  const core = await read('js/player-core.js');
  const shared = await read('js/shared-status.js');
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(core, /function setMbChips\(\)/);
  assert.match(core, /code\.textContent='H'/);
  assert.match(shared, /CANONICAL_SOURCE_LABELS/);
  assert.match(shared, /code\.textContent = canonical\.code/);
  assert.match(shared, /installCanonicalSourceLabelLock/);
});
