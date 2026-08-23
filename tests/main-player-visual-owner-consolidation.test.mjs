import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('css/main-player-visual-repair-20260821.css');
const publicCss = read('public/css/main-player-visual-repair-20260821.css');
const stageCss = read('css/player-stage-v2.css');
const stageJs = read('js/player-stage-v2.js');
const equalizer = read('js/equalizer.js');

test('visual repair root/public mirrors remain byte-identical after owner consolidation', () => {
  assert.equal(publicCss, css);
});

test('visual repair neutralizes legacy desktop wrapper reactivity without changing audio owners', () => {
  assert.match(css, /VISUAL OWNER CONSOLIDATION BRIDGE/);
  assert.match(css, /\.frame-stage::before\{[\s\S]*?transition:none!important/);
  assert.match(css, /\.now-cover-wrap\{[\s\S]*?filter:none!important;[\s\S]*?transition:none!important/);
  assert.match(css, /\.pc-header-logo-cell::before,[\s\S]*?transform:none!important/);
  assert.match(css, /#playBtn[\s\S]*?transition:none!important/);
  assert.match(stageJs, /window\.__MeterBus/);
  assert.match(stageJs, /function driveReactiveVisuals/);
  assert.match(equalizer, /window\.__MeterBus\s*=\s*\{/);
});

test('canonical ticker animation is restored from player-stage without changing ticker geometry', () => {
  assert.match(css, /animation:s666TitleMarquee 14s linear infinite!important/);
  assert.match(css, /animation-play-state:running!important/);
  assert.match(css, /padding-left:0!important/);
  assert.match(stageCss, /@keyframes s666TitleMarquee/);
  assert.doesNotMatch(css, /grid-column:[^;]*ticker/i);
});

test('repair layer does not introduce protected runtime behavior', () => {
  for (const forbidden of [
    '/api/discord', 'S666DiscordPlayerAddonV3', 'S666Messenger', 'S666SkipControl',
    'AudioContext', '__MeterBus', 'fetch(', '/api/admin/skip'
  ]) assert.equal(css.includes(forbidden), false, forbidden);
});
