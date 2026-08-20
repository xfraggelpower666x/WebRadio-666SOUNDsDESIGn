import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC real meter response keeps proportional volume headroom without an artificial visual floor', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /Math\.pow\(boostGain, -0\.55\)/);
  assert.match(eq, /const visualVolumeScale = Math\.pow\(volume, 1\.15\)/);
  assert.match(eq, /const visualSignalScale = visualGainCompensation \* visualVolumeScale/);
  assert.doesNotMatch(eq, /0\.72 \+ Math\.pow\(volume, 1\.15\) \* 0\.28/);
  assert.doesNotMatch(eq, /clamp\(visualGainCompensation \* visualVolumeScale, 0\.62, 1\)/);
});
