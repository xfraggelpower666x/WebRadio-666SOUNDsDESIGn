import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('shared asset config bootstraps design-neutral overlay, audio policy and artwork once', async () => {
  const config = await read('config/veluna-assets.js');
  const mirror = await read('public/config/veluna-assets.js');
  assert.equal(mirror, config);
  assert.match(config, /Shared infrastructure bootstrap v181/);
  assert.match(config, /\/core\/overlay\/overlay-core\.css/);
  assert.match(config, /\/core\/overlay\/overlay-core\.js/);
  assert.match(config, /\/css\/audio-policy-core\.css/);
  assert.match(config, /\/js\/boost-core\.js/);
  assert.match(config, /\/js\/audio-policy-core\.js/);
  assert.match(config, /\/js\/artwork-core\.js/);
  assert.match(config, /window\.SMFPOverlayCore\?\.scanOverlays/);
  assert.match(config, /__SMFPAudioGraphBridge/);
  assert.match(config, /loadCurrentScript/);
  assert.doesNotMatch(config, /border-color:|box-shadow:|background:\s*(?:linear-gradient|#[0-9a-f])/i);
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
