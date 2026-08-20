import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('css/player-stage-v2.css');
const publicCss = read('public/css/player-stage-v2.css');

test('root/public player stage CSS remain byte-identical', () => {
  assert.equal(publicCss, css);
});

test('short desktop breakpoint keeps the full cockpit inside low-height viewports', () => {
  assert.match(css, /@media\(min-width:761px\) and \(max-height:820px\)/);
  assert.match(css, /player-shell>\.hero\{flex-basis:112px!important;height:112px!important;min-height:112px!important;max-height:112px!important\}/);
  assert.match(css, /player-shell>\.visualizer\{flex-basis:120px!important;height:120px!important;min-height:120px!important/);
  assert.match(css, /player-shell>\.now-playing\{flex-basis:170px!important;height:170px!important;min-height:170px!important;max-height:170px!important/);
  assert.match(css, /#pcBottomSyncMeter\{flex-basis:23px!important;height:23px!important/);
  assert.match(css, /player-shell>\.pc-copyright-footer\{flex-basis:15px!important;height:15px!important\}/);
});

test('short desktop mode preserves controls, side meters and mobile isolation', () => {
  assert.match(css, /bottom-console \.icon-btn\{width:40px!important;height:40px!important;min-width:40px!important;max-width:40px!important\}/);
  assert.match(css, /\.side-meter\{top:150px!important;bottom:34px!important\}/);
  const shortDesktop = css.indexOf('@media(min-width:761px) and (max-height:820px)');
  const mobile = css.indexOf('@media(max-width:760px)');
  assert.ok(shortDesktop >= 0 && mobile > shortDesktop, 'short desktop safety must remain separate from mobile');
});
