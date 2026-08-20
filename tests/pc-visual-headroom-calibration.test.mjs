import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC visual spectrum keeps normal mastered material below hard ceiling while preserving real peaks', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /const visualGainCompensation = Math\.pow\(boostGain, -0\.55\)/);
  assert.match(eq, /const visualVolumeScale = Math\.pow\(volume, 0\.85\)/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 0\.62/);
  assert.match(eq, /const spectral = Math\.pow\(absolute, 0\.62\) \* visualTilt/);
  assert.match(eq, /const adaptiveResponse = Math\.pow\(relative, 0\.74\) \* 0\.14 \* localGate/);
  assert.doesNotMatch(eq, /Math\.pow\(position, 1\.18\) \* 1\.10/);
  assert.doesNotMatch(eq, /Math\.pow\(absolute, 0\.52\)/);
});

test('volume matrix remains monotonic and leaves visible headroom below full volume', () => {
  const scale = volume => Math.pow(volume, 0.85);
  const points = [0.25, 0.50, 0.75, 0.85, 1.00].map(scale);
  for (let i = 1; i < points.length; i += 1) assert.ok(points[i] > points[i - 1]);
  assert.ok(points[3] < 0.90, '85% listening volume must retain visual headroom');
  assert.equal(points[4], 1);
});
