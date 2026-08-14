import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const PLAYER_ENTRIES = [
  'index.html',
  'veluna/index.html',
  'VELUNA/index.html',
  'public/index.html',
  'public/veluna/index.html',
  'public/VELUNA/index.html',
  'worker.js',
  'workers/webradio-666soundsdesign-worker/worker.js'
];

test('one current central boot owner is loaded by every canonical radio player', async () => {
  const config = await read('config/veluna-assets.js');
  assert.equal(await read('public/config/veluna-assets.js'), config);
  assert.match(config, /2026-08-12-unified-lockscreen-boot-v3/);
  assert.match(config, /loadCurrentScript\(\s*`\/js\/central-boot-screen\.js\?v=\$\{bootVersion\}`/);

  for (const path of PLAYER_ENTRIES) {
    const source = await read(path);
    assert.match(source, /\/config\/veluna-assets\.js\?v=/, path);
  }
});

test('central boot is an early single owner and removes legacy splash surfaces', async () => {
  const boot = await read('js/central-boot-screen.js');
  const template = await read('components/boot-screen/boot-screen.html');
  const legacySplash = await read('js/veluna-splash.js');

  assert.equal(await read('public/js/central-boot-screen.js'), boot);
  assert.equal(await read('public/components/boot-screen/boot-screen.html'), template);
  assert.equal(await read('public/js/veluna-splash.js'), legacySplash);

  assert.match(boot, /Central Player Boot \+ Session Identity v2\.1\.0/);
  assert.match(boot, /primeBootShell\(\);/);
  assert.match(boot, /document\.documentElement\.classList\.add\('s666-central-boot-active'\)/);
  assert.match(boot, /#bootOverlay,\[data-veluna-central-splash=/);
  assert.match(boot, /pageClass\(\)==='internal'/);
  assert.match(boot, /legacyButton\.click\(\)/);
  assert.match(boot, /setTimeout\(\(\)=>hide\(reason\),180\)/);
  assert.doesNotMatch(boot, /awaiting-user|user-start|s666boot-start|START PLAYER/);
  assert.doesNotMatch(template, /s666boot-start|START PLAYER/);

  assert.match(legacySplash, /compatibility stub v2\.0\.0/);
  assert.match(legacySplash, /disabled-central-boot-owner/);
  assert.doesNotMatch(legacySplash, /createElement\('video'\)|video\.play\(|setTimeout\(finish/);
});

test('player identity owns route-specific manifests for hub iphone android veluna and internal', async () => {
  const boot = await read('js/central-boot-screen.js');
  assert.match(boot, /playerId:'hub'/);
  assert.match(boot, /playerId:'iphone'/);
  assert.match(boot, /playerId:'android'/);
  assert.match(boot, /playerId:'veluna'/);
  assert.match(boot, /playerId:'internal'/);
  assert.match(boot, /manifest:'\/site\.webmanifest'/);
  assert.match(boot, /manifest:'\/veluna\.webmanifest'/);
  assert.match(boot, /manifest:'\/internal\.webmanifest'/);
  assert.match(boot, /s666_active_player_owner_v2/);
  assert.match(boot, /audio\.addEventListener\('playing',\(\)=>markActive\('audio-playing'\)/);
  assert.doesNotMatch(boot, /psytrance-engine|xfraggelpower666x\.github\.io/i);
});

test('route manifests have stable ids and exact launch routes', async () => {
  const pairs = [
    ['site.webmanifest','public/site.webmanifest','/','/','/'],
    ['veluna.webmanifest','public/veluna.webmanifest','/veluna/','/veluna/','/veluna/'],
    ['internal.webmanifest','public/internal.webmanifest','/internal/','/internal/','/internal/']
  ];

  for (const [rootPath, mirrorPath, id, startUrl, scope] of pairs) {
    const rootText = await read(rootPath);
    assert.equal(await read(mirrorPath), rootText, `${rootPath} mirror`);
    const manifest = JSON.parse(rootText);
    assert.equal(manifest.id, id, `${rootPath} id`);
    assert.equal(manifest.start_url, startUrl, `${rootPath} start_url`);
    assert.equal(manifest.scope, scope, `${rootPath} scope`);
    assert.equal(manifest.display, 'standalone', `${rootPath} display`);
    assert.equal(manifest.launch_handler?.client_mode, 'navigate-existing', `${rootPath} launch handler`);
  }
});

test('main player high-response audio reactivity remains the verified PR122 runtime', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /const localGate = clamp\(\(local - 6\) \/ 26/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.24\) \* 0\.34/);
  assert.match(eq, /const attack = 0\.62 \+ position \* 0\.08/);
  assert.match(eq, /const release = 0\.13 \+ position \* 0\.02/);
  assert.match(eq, /energy/);
  assert.match(eq, /const transient = clamp\(\(localPeak - average\) \/ 255/);

  const player = await read('js/player-core.js');
  assert.match(player, /const visualizer = startVisualizer\(\{ audio, bars, leftMeters, rightMeters, bottomMeterSegments \}\)/);
  assert.match(player, /await visualizer\.start\?\.\(\)/);
});
