// PC EQ proportional headroom regression contract v1.2.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC EQ keeps logarithmic mapping with proportional visual headroom', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /canonical audio visualizer authority V14/);
  assert.match(eq, /const visualVolumeScale = Math\.pow\(volume, 0\.85\)/);
  assert.match(eq, /const visualGainCompensation = Math\.pow\(boostGain, -0\.55\)/);
  assert.doesNotMatch(eq, /visualVolumeScale = 0\.72|visualSignalScale = clamp\([^\n]*0\.62/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.24\) \* 0\.34/);
  assert.match(eq, /const spectral = Math\.pow\(absolute, 0\.74\) \* visualTilt/);
  assert.match(eq, /const localGate = clamp\(\(local - 6\) \/ 26/);
  assert.match(eq, /const adaptiveResponse = Math\.pow\(relative, 0\.82\) \* 0\.065 \* localGate/);
  assert.match(eq, /const transient = clamp\(\(localPeak - average\) \/ 255/);
  assert.match(eq, /clamp\(energy, 0\.012, peakHeadroom\)/);
  assert.match(eq, /visualCeiling: 'peak-dependent'/);
  assert.doesNotMatch(eq, /Math\.sin|useHybrid|const mirrored/);
});

test('balanced-headroom cache marker is mirrored', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-08-06-runtime-owner-v1/);
  assert.match(core, /equalizer\.js\?v=2026-08-06-runtime-owner-v1/);
});
