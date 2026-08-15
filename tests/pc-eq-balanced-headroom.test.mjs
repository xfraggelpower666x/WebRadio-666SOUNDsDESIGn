// PC EQ high-response headroom regression contract v1.1.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC EQ keeps logarithmic mapping while restoring high-response visual headroom', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /canonical audio visualizer authority V14/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 1\.10/);
  assert.match(eq, /const spectral = Math\.pow\(absolute, 0\.52\) \* visualTilt/);
  assert.match(eq, /const localGate = clamp\(\(local - 2\) \/ 14/);
  assert.match(eq, /const adaptiveResponse = Math\.pow\(relative, 0\.70\) \* 0\.22 \* localGate/);
  assert.match(eq, /clamp\(spectralResponse \* 0\.92 \+ adaptiveResponse, 0\.012, 1\)/);
  assert.match(eq, /visualCeiling: 'peak-dependent'/);
  assert.doesNotMatch(eq, /Math\.sin|useHybrid|const mirrored|localPeak - average/);
});

test('balanced-headroom cache marker is mirrored', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-08-15-runtime-cache-identity-v1/);
  assert.match(core, /equalizer\.js\?v=2026-08-15-runtime-cache-identity-v1/);
});
