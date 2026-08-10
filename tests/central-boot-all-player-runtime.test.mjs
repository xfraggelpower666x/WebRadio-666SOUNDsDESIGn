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

test('one repaired central boot owner is loaded by every canonical radio player', async () => {
  const config = await read('config/veluna-assets.js');
  assert.equal(await read('public/config/veluna-assets.js'), config);
  assert.match(config, /2026-08-10-central-radio-boot-v2/);
  assert.match(config, /\/js\/central-boot-screen\.js\?v=\$\{bootVersion\}/);

  for (const path of PLAYER_ENTRIES) {
    const source = await read(path);
    assert.match(source, /\/config\/veluna-assets\.js\?v=/, path);
  }
});

test('central boot physically removes legacy boot DOM and never creates a confirmation gate', async () => {
  const boot = await read('js/central-boot-screen.js');
  const template = await read('components/boot-screen/boot-screen.html');
  assert.equal(await read('public/js/central-boot-screen.js'), boot);
  assert.equal(await read('public/components/boot-screen/boot-screen.html'), template);

  assert.match(boot, /legacy\.remove\(\)/);
  assert.match(boot, /page==='internal'/);
  assert.match(boot, /legacyButton\.click\(\)/);
  assert.match(boot, /setTimeout\(\(\)=>hide\(reason\),180\)/);
  assert.doesNotMatch(boot, /display','none|awaiting-user|user-start|s666boot-start/);
  assert.doesNotMatch(template, /s666boot-start|START PLAYER/);
});

test('main player high-response audio reactivity remains the verified PR122 runtime', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /const localGate = clamp\(\(local - 2\) \/ 14/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 1\.10/);
  assert.match(eq, /const attack = 0\.76 \+ position \* 0\.12/);
  assert.match(eq, /const release = 0\.15 \+ position \* 0\.03/);
  assert.match(eq, /spectralResponse \* 0\.92 \+ adaptiveResponse/);
  assert.doesNotMatch(eq, /localPeak - average/);

  const player = await read('js/player-core.js');
  assert.match(player, /const visualizer = startVisualizer\(\{ audio, bars, leftMeters, rightMeters, bottomMeterSegments \}\)/);
  assert.match(player, /await visualizer\.start\?\.\(\)/);
});
