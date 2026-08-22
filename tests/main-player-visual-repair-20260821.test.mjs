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

test('shared bootstrap loads the visual-only repair with the current cache identity', () => {
  assert.match(bootstrap, /mainVisualRepairVersion = '2026-08-22-history-up-cyan-marquee-v3'/);
  assert.match(bootstrap, /main-player-visual-repair-20260821\.css\?v=\$\{mainVisualRepairVersion\}/);
});

test('History is moved onto the upper utility row so the static pink title keeps full width', () => {
  assert.match(css, /padding-right:0!important/);
  assert.match(css, /#historyToggle\{[\s\S]*?position:absolute!important;[\s\S]*?top:-48px!important;[\s\S]*?right:0!important/);
  assert.match(css, /\.s666-now-static-title\{[\s\S]*?max-width:100%!important;[\s\S]*?white-space:nowrap!important;[\s\S]*?text-overflow:ellipsis!important/);
});

test('cyan ticker spans the full content lane and runs as the marquee owner', () => {
  assert.match(css, /\.ticker-window\{[\s\S]*?grid-column:1 \/ -1!important;[\s\S]*?width:100%!important;[\s\S]*?justify-self:stretch!important;[\s\S]*?overflow:hidden!important/);
  assert.match(css, /\.s666-title-marquee\{[\s\S]*?display:inline-block!important;[\s\S]*?width:max-content!important;[\s\S]*?min-width:100%!important;[\s\S]*?animation-name:s666MainTickerTravel!important;[\s\S]*?animation-play-state:running!important/);
  assert.match(css, /@keyframes s666MainTickerTravel/);
  assert.match(css, /translate3d\(calc\(-100% - 34px\),0,0\)/);
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
