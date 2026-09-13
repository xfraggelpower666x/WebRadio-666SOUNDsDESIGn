import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('shared source labels are mirrored and canonically normalized to M/B without a mutation lock', async () => {
  const root = await read('js/shared-status.js');
  const mirror = await read('public/js/shared-status.js');
  assert.equal(mirror, root);
  assert.match(root, /mainBtn:\s*\{\s*code:\s*'M',\s*title:\s*'Main Stream'\s*\}/);
  assert.match(root, /fallbackBtn:\s*\{\s*code:\s*'B',\s*title:\s*'Backup Stream'\s*\}/);
  assert.match(root, /function enforceCanonicalSourceLabel\(el\)/);
  assert.doesNotMatch(root, /installCanonicalSourceLabelLock/);
  assert.doesNotMatch(root, /new MutationObserver\(\(\) => enforceCanonicalSourceLabel\(el\)\)/);
});

test('player-core source label owners are mirrored and no legacy H writer remains', async () => {
  const core = await read('js/player-core.js');
  const mirror = await read('public/js/player-core.js');
  assert.equal(mirror, core);
  assert.match(core, /function setMbChips\(\)/);
  assert.match(core, /code\.textContent\.trim\(\)!=='M'\)code\.textContent='M'/);
  assert.match(core, /main\.title='Main Stream'/);
  assert.match(core, /main\.setAttribute\('aria-label','Main Stream'\)/);
  assert.doesNotMatch(core, /code\.textContent='H'/);
  assert.doesNotMatch(core, /title='Hauptstream'/);
  assert.doesNotMatch(core, /aria-label','Hauptstream'/);
  assert.doesNotMatch(core, /aria-label','Mainstream'/);
});
