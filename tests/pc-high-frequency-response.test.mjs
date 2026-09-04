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

test('right-side bands use real calibrated compensation without synthetic motion', async () => {
  const eq = await read('js/equalizer.js');
  assert.match(eq, /let bandReference = \[\]/);
  assert.match(eq, /const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 0\.62/);
  assert.match(eq, /const localGate = clamp\(\(local - 2\) \/ 14/);
  assert.match(eq, /const adaptiveResponse = Math\.pow\(relative, 0\.74\) \* 0\.14 \* localGate/);
  assert.match(eq, /const attack = 0\.76 \+ position \* 0\.12/);
  assert.match(eq, /const release = 0\.15 \+ position \* 0\.03/);
  assert.match(eq, /clamp\(spectralResponse \* 0\.92 \+ adaptiveResponse, 0\.012, 1\)/);
  assert.match(eq, /visualHeadroom: 'balanced'/);
  assert.match(eq, /frequencyScale: 'logarithmic'/);
  assert.match(eq, /highFrequencyCompensation: true/);
  assert.doesNotMatch(eq, /Math\.sin|useHybrid|fallbackValue|const mirrored|localPeak - average/);
});

test('cache markers deliver the compensated analyzer', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-09-04-panel-led-owner-v2/);
  assert.match(core, /equalizer\.js\?v=2026-09-04-panel-led-owner-v2/);
});
