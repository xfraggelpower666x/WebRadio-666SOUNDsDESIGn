import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('shared asset config bootstraps the design-neutral overlay core once', async () => {
  const config = await read('config/veluna-assets.js');
  const mirror = await read('public/config/veluna-assets.js');
  assert.equal(mirror, config);
  assert.match(config, /Shared overlay bootstrap v179/);
  assert.match(config, /\/core\/overlay\/overlay-core\.css/);
  assert.match(config, /\/core\/overlay\/overlay-core\.js/);
  assert.match(config, /window\.SMFPOverlayCore\?\.scanOverlays/);
  assert.match(config, /document\.querySelector\('script\[src\*=/);
  assert.doesNotMatch(config, /style\.setProperty|style\.cssText|border-color:|box-shadow:/);
});

test('main, VELUNA and internal player all load the shared asset config', async () => {
  for (const path of [
    'index.html',
    'veluna/index.html',
    'VELUNA/index.html',
    'public/index.html',
    'public/veluna/index.html',
    'public/VELUNA/index.html',
    'worker.js',
    'workers/webradio-666soundsdesign-worker/worker.js'
  ]) {
    const source = await read(path);
    assert.match(source, /\/config\/veluna-assets\.js\?v=/, path);
  }
});
