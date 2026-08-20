import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('css/player-stage-v2.css');
const publicCss = read('public/css/player-stage-v2.css');

test('root/public stage CSS remain identical for lower desktop geometry', () => {
  assert.equal(publicCss, css);
});

test('desktop lower stack keeps canonical order without timeline ownership', () => {
  assert.match(css, /\.player-shell>\.s666-primary-action-dock\{order:5!important/);
  assert.match(css, /\.player-shell>\.bottom-console\{order:6!important/);
  assert.match(css, /#pcBottomSyncMeter\{order:7!important/);
  assert.match(css, /\.player-shell>\.now-playing\{order:8!important/);
  assert.match(css, /\.player-shell>\.pc-copyright-footer\{order:9!important/);
  assert.match(css, /\.bottom-console \.timeline-wrap\[hidden\]\{display:none!important\}/);
});

test('ticker is contained in existing now-playing lane and starts from the left edge', () => {
  assert.match(css, /\.now-playing \.ticker-window\{[^}]*overflow:hidden!important[^}]*z-index:2!important/s);
  assert.match(css, /\.now-playing :is\(#nowPlayingTicker,\.ticker-text\)\{[^}]*padding-left:0!important[^}]*animation:s666TitleMarquee 14s linear infinite!important/s);
  assert.match(css, /\.now-playing \.history-panel\{[^}]*z-index:90!important/s);
});
