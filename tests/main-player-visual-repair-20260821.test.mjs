import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('css/main-player-visual-repair-20260821.css');
const publicCss = read('public/css/main-player-visual-repair-20260821.css');
const bootstrap = read('config/veluna-assets.js');
const publicBootstrap = read('public/config/veluna-assets.js');

test('visual repair root/public mirrors remain byte-identical', () => {
  assert.equal(publicCss, css);
  assert.equal(publicBootstrap, bootstrap);
});

test('shared bootstrap loads the visual-only repair with a cache identity', () => {
  assert.match(bootstrap, /mainVisualRepairVersion = '2026-08-21-history-ticker-side-meter-v1'/);
  assert.match(bootstrap, /main-player-visual-repair-20260821\.css\?v=\$\{mainVisualRepairVersion\}/);
});

test('History sits higher and remains in its reserved utility lane', () => {
  assert.match(css, /padding-right:108px!important/);
  assert.match(css, /#historyToggle\{[\s\S]*?position:absolute!important;[\s\S]*?top:-14px!important;[\s\S]*?right:0!important/);
  assert.match(css, /\.history-panel\{[\s\S]*?top:36px!important;[\s\S]*?bottom:58px!important/);
});

test('desktop ticker is static and no longer uses marquee motion', () => {
  assert.match(css, /\.ticker-window\{[\s\S]*?overflow:hidden!important/);
  assert.match(css, /\.s666-title-marquee\{[\s\S]*?display:block!important;[\s\S]*?width:100%!important;[\s\S]*?text-overflow:ellipsis!important;[\s\S]*?animation:none!important;[\s\S]*?transform:none!important/);
  assert.doesNotMatch(css, /animation-name:s666MainTickerTravel!important/);
  assert.doesNotMatch(css, /@keyframes s666MainTickerTravel/);
});

test('closing either side panel no longer resizes or shifts the central player', () => {
  assert.match(css, /data-s666-left-fx="off"\]\[data-s666-right-fx="on"\]/);
  assert.match(css, /data-s666-left-fx="on"\]\[data-s666-right-fx="off"\]/);
  assert.match(css, /data-s666-left-fx="off"\]\[data-s666-right-fx="off"\]/);
  assert.match(css, /width:var\(--s666-main-player-width\)!important/);
  assert.match(css, /transform:none!important/);
});

test('left and right side meters use exact identical three-track geometry', () => {
  assert.match(css, /\.side-meter\.left,[\s\S]*?\.side-meter\.right\{[\s\S]*?width:76px!important;[\s\S]*?min-width:76px!important;[\s\S]*?max-width:76px!important;[\s\S]*?direction:ltr!important;[\s\S]*?transform:none!important/);
  assert.match(css, /grid-template-columns:repeat\(3,14px\)!important/);
  assert.match(css, /grid-auto-columns:14px!important/);
  assert.match(css, /grid-auto-flow:column!important/);
  assert.match(css, /gap:8px!important/);
  assert.match(css, /padding:4px!important/);
  assert.match(css, /justify-content:center!important/);
  assert.match(css, /\.side-meter \.side-meter-track\{[\s\S]*?order:initial!important;[\s\S]*?width:14px!important;[\s\S]*?min-width:14px!important;[\s\S]*?max-width:14px!important;[\s\S]*?transform:none!important/);
});

test('side meters keep existing fill ownership and use stronger segmented neon skin', () => {
  assert.match(css, /\.side-meter \.side-meter-fill\{/);
  assert.match(css, /mask:repeating-linear-gradient\(to top,#000 0 9px,transparent 9px 13px\)!important/);
  assert.match(css, /brightness\(1\.48\) saturate\(1\.38\) contrast\(1\.06\)/);
  assert.match(css, /0 0 26px rgba\(22,255,243,\.74\)!important/);
  assert.match(css, /opacity:1!important/);
});

test('visual repair cannot mutate protected Discord Messenger Skip audio or Worker behavior', () => {
  for (const forbidden of [
    '/api/discord',
    'S666DiscordPlayerAddonV3',
    'S666Messenger',
    'S666SkipControl',
    'AudioContext',
    '__MeterBus',
    'fetch(',
    '/api/admin/skip'
  ]) assert.equal(css.includes(forbidden), false, forbidden);
});
