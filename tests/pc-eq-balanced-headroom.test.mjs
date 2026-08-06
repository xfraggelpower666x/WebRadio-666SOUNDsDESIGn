// PC EQ balanced-headroom regression contract v1.0.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC EQ keeps logarithmic mapping while restoring visual headroom', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /canonical audio visualizer authority V14/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.24\) \* 0\.34/);
  assert.match(eq, /const spectral = Math\.pow\(absolute, 0\.74\) \* visualTilt/);
  assert.match(eq, /const localGate = clamp\(\(local - 6\) \/ 26/);
  assert.match(eq, /const energy = spectralResponse \* 0\.68 \+ adaptiveResponse \+ transientResponse/);
  assert.match(eq, /const peakHeadroom = 0\.78 \+ clamp\(localPeak \/ 255, 0, 1\) \* 0\.22/);
  assert.match(eq, /visualCeiling: 'peak-dependent'/);
  assert.doesNotMatch(eq, /Math\.sin|useHybrid|const mirrored|spectralResponse \* 0\.92/);
});

test('balanced-headroom cache marker is mirrored', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-08-06-runtime-owner-v1/);
  assert.match(core, /equalizer\.js\?v=2026-08-06-runtime-owner-v1/);
});
