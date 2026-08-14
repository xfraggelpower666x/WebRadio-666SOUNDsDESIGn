import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC real meter response follows listening volume proportionally without Boost-driven growth', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /Math\.pow\(boostGain, -0\.55\)/);
  assert.match(eq, /const visualVolumeScale = Math\.pow\(volume, 0\.85\)/);
  assert.match(eq, /const visualSignalScale = visualGainCompensation \* visualVolumeScale/);
  assert.doesNotMatch(eq, /Math\.pow\(boostGain, -0\.18\)/);
  assert.doesNotMatch(eq, /0\.72 \+ Math\.pow\(volume, 0\.85\) \* 0\.28/);
  assert.doesNotMatch(eq, /clamp\(visualGainCompensation \* visualVolumeScale, 0\.62, 1\)/);
});
