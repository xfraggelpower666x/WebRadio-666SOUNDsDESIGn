import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('css/main-player-visual-repair-20260821.css');
const publicCss = read('public/css/main-player-visual-repair-20260821.css');
const stageCss = read('css/player-stage-v2.css');
const publicStageCss = read('public/css/player-stage-v2.css');
const bootstrap = read('config/veluna-assets.js');
const publicBootstrap = read('public/config/veluna-assets.js');

test('visual repair root/public mirrors remain byte-identical', () => {
  assert.equal(publicCss, css);
  assert.equal(publicStageCss, stageCss);
  assert.equal(publicBootstrap, bootstrap);
});

test('shared bootstrap still loads the visual-only repair', () => {
  assert.match(bootstrap, /mainVisualRepairVersion = '2026-08-23-active-single-logo-owner-v7'/);
  assert.match(bootstrap, /main-player-visual-repair-20260821\.css\?v=\$\{mainVisualRepairVersion\}/);
});

test('History remains anchored to the accepted Now Playing position', () => {
  assert.match(css, /\.now-playing\{[\s\S]*?position:relative!important/);
  assert.match(css, /\.section-topline\{[\s\S]*?position:static!important/);
  assert.match(css, /#historyToggle\{[\s\S]*?position:absolute!important;[\s\S]*?top:18px!important;[\s\S]*?right:22px!important/);
  assert.match(css, /\.s666-now-static-title\{[\s\S]*?max-width:100%!important;[\s\S]*?white-space:nowrap!important;[\s\S]*?text-overflow:ellipsis!important/);
});

test('visual repair does not own ticker geometry or marquee animation anymore', () => {
  assert.doesNotMatch(css, /\.ticker-window\{/);
  assert.doesNotMatch(css, /#nowPlayingTicker/);
  assert.doesNotMatch(css, /s666MainTickerTravel/);
});

test('player-stage remains the single canonical desktop ticker owner', () => {
  assert.match(stageCss, /\.now-playing \.ticker-window\{[\s\S]*?grid-column:2!important;[\s\S]*?grid-row:2!important;[\s\S]*?width:100%!important;[\s\S]*?height:44px!important/);
  assert.match(stageCss, /\.now-playing :is\(#nowPlayingTicker,\.ticker-text\)\{[\s\S]*?animation:s666TitleMarquee 14s linear infinite!important/);
  assert.match(stageCss, /grid-template-columns:138px minmax\(0,1fr\)!important/);
  assert.match(stageCss, /\.now-playing \.ticker-window\{height:38px!important\}/);
});

test('DNA wave visual amplitude is capped without changing MeterBus or audio math', () => {
  assert.match(css, /#pcLeftFxAddon \.pc-addon-waveform i\{[\s\S]*?max-height:68%!important/);
  assert.doesNotMatch(css, /__MeterBus/);
  assert.doesNotMatch(css, /AudioContext/);
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
