import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main iPhone layout starts at the safe top and keeps artwork and EQ inside the viewport', async () => {
  const css = await read('css/mobile-patches.css');
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(css, /grid-template-columns:62px minmax\(0,1fr\) 58px/);
  assert.match(css, /mff-symbol\{width:62px!important;height:62px/);
  assert.match(css, /mff-eq\{height:138px!important/);
  assert.equal(await read('public/css/mobile-patches.css'), css);
});

test('VELUNA fixed viewport respects all iPhone safe areas and bounds its bottom brand', async () => {
  const css = await read('css/veluna-theme.css');
  assert.match(css, /top:max\(4px,env\(safe-area-inset-top\)\)!important/);
  assert.match(css, /bottom:max\(4px,env\(safe-area-inset-bottom\)\)!important/);
  assert.doesNotMatch(css, /player-card\{position:absolute!important;inset:4px!important/);
  assert.match(css, /max-height:clamp\(34px,7dvh,58px\)!important/);
  assert.equal(await read('public/css/veluna-theme.css'), css);
});
