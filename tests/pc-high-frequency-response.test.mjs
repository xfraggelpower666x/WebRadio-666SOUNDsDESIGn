// PC high-frequency response regression contract v1.3.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC spectrum maps all bars logarithmically through the audible range', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /canonical audio visualizer authority V14/);
  assert.match(eq, /analyser\.fftSize = mobileLike\(\) \? 128 : 1024/);
  assert.match(eq, /const minFrequency = mobileLike\(\) \? 70 : 45/);
  assert.match(eq, /const maxFrequency = Math\.min\(mobileLike\(\) \? 15000 : 17000/);
  assert.match(eq, /Math\.pow\(frequencyRatio, index \/ bandCount\)/);
  assert.match(eq, /Math\.pow\(frequencyRatio, \(index \+ 1\) \/ bandCount\)/);
  assert.doesNotMatch(eq, /analysisWindow|normalizedStart|normalizedEnd/);
});

test('right-side bands use proportional real-signal compensation without synthetic motion', async () => {
  const eq = await read('js/equalizer.js');
  assert.match(eq, /let bandReference = \[\]/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.24\) \* 0\.34/);
  assert.match(eq, /const localGate = clamp\(\(local - 6\) \/ 26/);
  assert.match(eq, /const adaptiveResponse = Math\.pow\(relative, 0\.82\) \* 0\.065 \* localGate/);
  assert.match(eq, /const transient = clamp\(\(localPeak - average\) \/ 255/);
  assert.match(eq, /const transientResponse = Math\.pow\(transient, 0\.72\) \* 0\.14 \* localGate/);
  assert.match(eq, /const attack = 0\.62 \+ position \* 0\.08/);
  assert.match(eq, /const release = 0\.13 \+ position \* 0\.02/);
  assert.match(eq, /clamp\(energy, 0\.012, peakHeadroom\)/);
  assert.match(eq, /visualHeadroom: 'balanced'/);
  assert.match(eq, /frequencyScale: 'logarithmic'/);
  assert.match(eq, /highFrequencyCompensation: true/);
  assert.doesNotMatch(eq, /Math\.sin|useHybrid|fallbackValue|const mirrored/);
});

test('cache markers deliver the compensated analyzer', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-08-06-runtime-owner-v1/);
  assert.match(core, /equalizer\.js\?v=2026-08-06-runtime-owner-v1/);
});
