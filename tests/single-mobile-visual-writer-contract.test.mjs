import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile player has one visual writer and one installation', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /setInterval\(pcMobileEqTimerTick,110\)/);
  assert.doesNotMatch(html, /setTimeout\(install,150\)/);
  assert.doesNotMatch(html, /addEventListener\('resize',install/);
  assert.doesNotMatch(html, /addEventListener\('orientationchange',install/);
  assert.match(html, /__S666VisualizerRefreshTargets/);
  assert.match(html, /mffInstalledOnce=false/);
  assert.equal(await read('public/index.html'), html);
});

test('canonical equalizer rebinds to the existing mobile targets', async () => {
  const js = await read('js/equalizer.js');
  assert.match(js, /window\.__S666VisualizerRefreshTargets = refreshVisualizerTargets/);
  assert.match(js, /querySelectorAll\('#mffEqBars i'\)/);
  assert.match(js, /querySelectorAll\('#mffBottomBars i'\)/);
  assert.match(js, /bars\.splice\(0, bars\.length, \.\.\.mobileBars\)/);
  assert.equal(await read('public/js/equalizer.js'), js);
});
