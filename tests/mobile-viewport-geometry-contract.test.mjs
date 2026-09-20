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


test('main iPhone shell stays geometrically between the left and right side meters', async () => {
  const css = await read('css/mobile-patches.css');
  assert.match(css, /S666_IPHONE_LAYOUT_APPRETURN_V5 — final mobile geometry owner/);
  assert.match(css, /#mffApp \.mff-shell\{\s*transform:none!important;\s*width:calc\(100vw - 54px\)!important;/);
  assert.match(css, /@media \(max-width:380px\) and \(max-height:740px\)\{[\s\S]*?#mffApp \.mff-shell\{width:calc\(100vw - 46px\)!important;padding-top:5px!important;\}/);
  assert.doesNotMatch(css, /S666_IPHONE_LAYOUT_APPRETURN_V5[\s\S]*?width:calc\(100vw - 42px\)!important/);
  assert.doesNotMatch(css, /S666_IPHONE_LAYOUT_APPRETURN_V5[\s\S]*?width:calc\(100vw - 38px\)!important/);
  assert.match(css, /#mffApp \.mff-side,\s*\.mff-side\{[\s\S]*?width:16px!important/);
  assert.match(css, /#mffApp \.mff-left,\.mff-left\{left:5px!important;\}/);
  assert.match(css, /#mffApp \.mff-right,\.mff-right\{right:5px!important;\}/);
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
