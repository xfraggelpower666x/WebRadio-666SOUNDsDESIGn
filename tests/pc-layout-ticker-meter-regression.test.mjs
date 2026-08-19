import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop ticker and history use canonical stage geometry without v157 absolute drift', async () => {
  const patches = await read('css/player-patches.css');
  const stage = await read('css/player-stage-v2.css');
  const html = await read('index.html');
  assert.equal(await read('public/css/player-patches.css'), patches);
  assert.equal(await read('public/css/player-stage-v2.css'), stage);
  assert.match(html, /id="nowPlayingTicker" class="ticker-text"/);
  assert.doesNotMatch(patches, /now-playing \.ticker-window\{\s*position:absolute!important;[\s\S]*bottom:96px/);
  assert.doesNotMatch(patches, /now-playing #historyToggle\{\s*position:absolute!important;[\s\S]*bottom:58px/);
  assert.match(stage, /now-playing \.ticker-window\{position:relative!important;inset:auto!important;grid-column:2!important;grid-row:2!important/);
  assert.match(stage, /now-playing #historyToggle\{position:relative!important;inset:auto!important/);
  assert.match(stage, /animation:s666TitleMarquee 14s linear infinite!important/);
});

test('desktop side meters stay fully visible above overlapping DNA side rails', async () => {
  const stage = await read('css/player-stage-v2.css');
  const overlay = await read('css/eq-overlay.css');
  assert.equal(await read('public/css/eq-overlay.css'), overlay);
  assert.match(stage, /\.side-meter\{top:clamp\(210px,24vh,275px\)!important;bottom:clamp\(48px,6vh,72px\)!important;height:auto!important/);
  assert.match(stage, /\.frame-stage \.pc-side-addon\{[^}]*z-index:7!important/);
  assert.match(overlay, /\.frame-stage > \.side-meter\{\s*z-index:10!important;/);
});

test('PC layout controller no longer activates late fixed canvas and restores independent FX toggles', async () => {
  const controller = await read('js/pc-fixed-canvas.js');
  assert.equal(await read('public/js/pc-fixed-canvas.js'), controller);
  assert.doesNotMatch(controller, /classList\.add\(['"]pc-fixed-canvas['"]\)/);
  assert.doesNotMatch(controller, /CANVAS_WIDTH|CANVAS_HEIGHT|MAX_SCALE/);
  assert.match(controller, /classList\.remove\(['"]pc-fixed-canvas['"]\)/);
  assert.match(controller, /s666_pc_addon_fx_v128/);
  assert.match(controller, /pcLeftFxToggle/);
  assert.match(controller, /pcRightFxToggle/);
  assert.match(controller, /pc-\$\{side\}-addon-off/);
  assert.match(controller, /applyResponsivePlayerExpansion/);
  assert.match(controller, /style\.setProperty\('width',[\s\S]*'important'\)/);
  assert.match(controller, /style\.setProperty\('transform',[\s\S]*'important'\)/);
});
