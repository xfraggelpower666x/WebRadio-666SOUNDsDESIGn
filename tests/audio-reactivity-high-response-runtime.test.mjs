import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');

test('canonical audio reactivity stays live with proportional volume headroom',async()=>{
  const eq=await read('js/equalizer.js');
  assert.match(eq,/const visualVolumeScale = Math\.pow\(volume, 0\.85\)/);
  assert.match(eq,/const visualGainCompensation = Math\.pow\(boostGain, -0\.55\)/);
  assert.match(eq,/\(local - 6\) \/ 26/);
  assert.match(eq,/attack = 0\.62/);
  assert.match(eq,/release = 0\.13/);
  assert.match(eq,/const transient = clamp\(\(localPeak - average\) \/ 255/);
  assert.match(eq,/const energy = spectralResponse \* 0\.68 \+ adaptiveResponse \+ transientResponse/);
  assert.match(eq,/clamp\(energy, 0\.012, peakHeadroom\)/);
  assert.match(eq,/visualSignalScale/);
  assert.doesNotMatch(eq,/visualVolumeScale = 0\.72|visualSignalScale = clamp\([^\n]*0\.62/);
  assert.equal(await read('public/js/equalizer.js'),eq);
});
