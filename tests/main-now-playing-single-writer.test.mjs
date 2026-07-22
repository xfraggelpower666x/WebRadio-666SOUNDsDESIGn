// Main Now Playing single-writer regression contract v1.0.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main Now Playing has exactly one active artwork writer', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  const player = await read('js/player-core.js');
  const artwork = await read('js/artwork-core.js');
  const velunaUi = await read('js/veluna-ui.js');
  assert.doesNotMatch(addon, /installSharedVisualStyle|applyCoverToPlayers|syncSharedCoverLogic|TRACK_COVER_MS/);
  assert.match(addon, /sharedVisualBridge:\s*false/);
  assert.match(addon, /sharedStatusBridge:\s*true/);
  assert.match(player, /SMFPArtworkCore\?\.update\) window\.SMFPArtworkCore\.update\(raw\)/);
  assert.match(artwork, /TRACK_MS\s*=\s*18000/);
  assert.match(artwork, /track-18s-complete/);
  assert.match(velunaUi, /SMFPArtworkCore\?\.enforce/);
  assert.doesNotMatch(velunaUi, /requestAnimationFrame\(injectSplash\)/);
});

test('main HTML has pre-paint splash gate and no decorative fallback image duplicate', async () => {
  const root = await read('index.html');
  const mirror = await read('public/index.html');
  assert.equal(mirror, root);
  assert.match(root, /s666SplashPreflight/);
  assert.match(root, /data-s666-splash-pending/);
  assert.match(root, /discord-player-addon-v3\.js\?v=2026-07-22-single-writer-v53/);
  assert.match(root, /veluna-splash\.js\?v=2026-07-22-prepaint-v1219/);
  assert.equal((root.match(/id="nowCover"/g) || []).length, 1);
  assert.doesNotMatch(root, /<img aria-hidden="true" src="\/assets\/veluna\/covers\/veluna-stream-fallback\.webp"/);
});

test('single splash runtime reveals only after splash completion or session skip', async () => {
  const splash = await read('js/veluna-splash.js');
  assert.equal(await read('public/js/veluna-splash.js'), splash);
  assert.match(splash, /SESSION_KEY='s666_player_intro_seen_v1'/);
  assert.match(splash, /data-s666-splash-pending/);
  assert.match(splash, /splash\.remove\(\);reveal\(\)/);
  assert.match(splash, /VELUNA_CENTRAL_SPLASH_READY=true/);
});

test('all changed runtime mirrors are byte-identical', async () => {
  for (const path of [
    'js/addons/discord-player-addon-v3.js',
    'js/player-core.js',
    'js/veluna-ui.js',
    'js/veluna-splash.js'
  ]) assert.equal(await read(path), await read(`public/${path}`), path);
});
