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

test('History has a reserved utility lane and cannot cover the title', () => {
  assert.match(css, /padding-right:108px!important/);
  assert.match(css, /#historyToggle\{[\s\S]*?position:absolute!important;[\s\S]*?top:-5px!important;[\s\S]*?right:0!important/);
  assert.match(css, /\.history-panel\{[\s\S]*?top:43px!important;[\s\S]*?bottom:58px!important/);
});

test('desktop ticker has an explicit running transform animation', () => {
  assert.match(css, /animation-name:s666MainTickerTravel!important/);
  assert.match(css, /animation-play-state:running!important/);
  assert.match(css, /@keyframes s666MainTickerTravel/);
  assert.match(css, /translate3d\(calc\(-100% - 34px\),0,0\)/);
  assert.doesNotMatch(css, /\.s666-title-marquee\{[^}]*transform:[^}]*!important/s);
});

test('closing either side panel no longer resizes or shifts the central player', () => {
  assert.match(css, /data-s666-left-fx="off"\]\[data-s666-right-fx="on"\]/);
  assert.match(css, /data-s666-left-fx="on"\]\[data-s666-right-fx="off"\]/);
  assert.match(css, /data-s666-left-fx="off"\]\[data-s666-right-fx="off"\]/);
  assert.match(css, /width:var\(--s666-main-player-width\)!important/);
  assert.match(css, /transform:none!important/);
});

test('side meters keep existing fill ownership and receive only segmented visual skin', () => {
  assert.match(css, /\.side-meter-fill\{/);
  assert.match(css, /mask:repeating-linear-gradient\(to top,#000 0 9px,transparent 9px 13px\)!important/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(12px,1fr\)\)!important/);
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
