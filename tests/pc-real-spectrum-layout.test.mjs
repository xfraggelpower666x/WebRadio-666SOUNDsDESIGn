// PC real-spectrum and proportion regression contract v1.0.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC EQ renders every bar from its own real frequency range', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /canonical audio visualizer authority V14/);
  assert.match(eq, /const bandCount = Math.max\(1, bars.length\)/);
  assert.match(eq, /for \(let index = 0; index < bandCount; index \+= 1\)/);
  assert.match(eq, /const value = values\[index\]/);
  assert.match(eq, /publish\(level, peak, 'real'/);
  assert.doesNotMatch(eq, /const halfBars|const mirrored|useHybrid|fallbackValue|Math\.sin\(timestamp \/ 310\)/);
});

test('PC meters can fall near zero and retain fine resolution', async () => {
  const eq = await read('js/equalizer.js');
  assert.match(eq, /\* 100, 1\.5, 100/);
  assert.match(eq, /Math\.round\(value \* 10\) \/ 10/);
  assert.doesNotMatch(eq, /\* 100, 6, 100/);
});

test('PC header and Now Playing receive the recovered vertical space', async () => {
  const css = await read('css/player-stage-v2.css');
  assert.equal(await read('public/css/player-stage-v2.css'), css);
  assert.match(css, /Player Stage V12: real-spectrum geometry/);
  assert.match(css, /clamp\(142px,18vh,224px\)/);
  assert.match(css, /width:100%!important;height:auto!important/);
  assert.match(css, /clamp\(204px,23vh,252px\)/);
  assert.match(css, /clamp\(164px,12vw,198px\)/);
});

test('cache markers load the exact repaired runtime', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /2026-09-05-main-header-brand-v1/);
  assert.match(core, /equalizer\.js\?v=2026-09-05-main-header-brand-v1/);
});
