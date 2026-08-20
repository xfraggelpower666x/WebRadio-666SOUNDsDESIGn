import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('css/player-stage-v2.css');
const publicCss = read('public/css/player-stage-v2.css');

test('root/public player stage CSS remain byte-identical', () => {
  assert.equal(publicCss, css);
});

test('desktop main player uses responsive viewport-bounded geometry', () => {
  assert.match(css, /--s666-main-player-width:min\(56vw,1080px\)/);
  assert.match(css, /height:calc\(100dvh - 12px\)!important/);
  assert.match(css, /max-height:calc\(100dvh - 12px\)!important/);
  assert.match(css, /gap:clamp\(3px,\.42vh,6px\)!important/);
  assert.doesNotMatch(css, /\.frame-stage \.player-shell\{[^}]*width:\s*1720px/i);
  assert.doesNotMatch(css, /\.frame-stage \.player-shell\{[^}]*height:\s*980px/i);
});

test('narrow desktop collapses side add-ons instead of deforming the player', () => {
  assert.match(css, /@media\(min-width:761px\) and \(max-width:1220px\)\{[^}]*--s666-main-player-width:calc\(100vw - 24px\)/s);
  assert.match(css, /@media\(min-width:761px\) and \(max-width:1220px\)[\s\S]*?\.pc-side-addon\{display:none!important\}/);
});

test('wide desktop releases each disabled FX side independently', () => {
  assert.match(css, /--s666-side-release:calc\(var\(--s666-side-panel-width\) \+ var\(--s666-side-panel-gap\)\)/);
  assert.match(css, /data-s666-left-fx=\\"off\\"\]\[data-s666-right-fx=\\"on\\"\][\s\S]*?translateX\(calc\(var\(--s666-side-release\) \* -\.5\)\)/);
  assert.match(css, /data-s666-left-fx=\\"on\\"\]\[data-s666-right-fx=\\"off\\"\][\s\S]*?translateX\(calc\(var\(--s666-side-release\) \* \.5\)\)/);
  assert.match(css, /data-s666-left-fx=\\"off\\"\]\[data-s666-right-fx=\\"off\\"\][\s\S]*?var\(--s666-side-release\) \* 2/);
  assert.match(css, /calc\(100vw - 24px\)/);
});

test('canonical side meter keeps three real tracks and no legacy i-bar replacement', () => {
  assert.match(css, /\.side-meter-stack\{display:grid!important;grid-template-columns:repeat\(3,minmax\(10px,1fr\)\)!important/);
  assert.match(css, /\.side-meter-track\{[^}]*height:100%!important[^}]*overflow:hidden!important/s);
  assert.match(css, /\.side-meter-fill\{[^}]*bottom:0!important[^}]*width:100%!important/s);
  assert.doesNotMatch(css, /side-meter-stack[^}]*<i>/i);
});

test('mobile boundary remains isolated from desktop side geometry', () => {
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /#mffApp\{[^}]*width:100dvw!important[^}]*height:100dvh!important/s);
  assert.match(css, /padding-bottom:max\(8px,env\(safe-area-inset-bottom\)\)!important/);
});
