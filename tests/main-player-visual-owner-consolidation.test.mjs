import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('css/main-player-visual-repair-20260821.css');
const publicCss = read('public/css/main-player-visual-repair-20260821.css');
const stageCss = read('css/player-stage-v2.css');
const stageJs = read('js/player-stage-v2.js');
const equalizer = read('js/equalizer.js');

test('visual repair mirrors remain identical', () => {
  assert.equal(publicCss, css);
});

test('legacy wrapper reactivity is neutralized without audio mutation', () => {
  assert.match(css, /VISUAL OWNER CONSOLIDATION BRIDGE/);
  assert.match(css, /\.frame-stage::before\{[^}]*transition:none!important/);
  assert.match(css, /\.now-cover-wrap\{[^}]*filter:none!important;[^}]*transition:none!important/);
  assert.match(stageJs, /function driveReactiveVisuals/);
  assert.match(equalizer, /window\.__MeterBus\s*=\s*\{/);
});

test('visual repair owns no ticker selector but repairs the missing legacy keyframes', () => {
  assert.doesNotMatch(css, /\.ticker-window\{/);
  assert.doesNotMatch(css, /#nowPlayingTicker/);
  assert.match(css, /@keyframes v73TickerRun\{0%\{transform:translate3d\(100%,0,0\)\}100%\{transform:translate3d\(-100%,0,0\)\}\}/);
  assert.match(stageCss, /@keyframes s666TitleMarquee/);
  assert.match(stageCss, /\.now-playing :is\(#nowPlayingTicker,\.ticker-text\)\{[\s\S]*?animation:s666TitleMarquee 14s linear infinite!important/);
});

test('repair layer does not touch protected runtime', () => {
  for (const forbidden of [
    '/api/discord', 'S666DiscordPlayerAddonV3', 'S666Messenger', 'S666SkipControl',
    'AudioContext', '__MeterBus', 'fetch(', '/api/admin/skip'
  ]) assert.equal(css.includes(forbidden), false, forbidden);
});
