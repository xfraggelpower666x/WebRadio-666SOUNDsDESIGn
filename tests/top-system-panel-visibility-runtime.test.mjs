import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/phase10-stability-iphone-panel-hud.css','utf8');
const cssPublic = fs.readFileSync('public/css/phase10-stability-iphone-panel-hud.css','utf8');
const html = fs.readFileSync('index.html','utf8');

test('top system panel keeps STR SRC and MTR visible after Phase10 boot',()=>{
  assert.equal(cssPublic, css);
  const forbidden = '.systempanel-left #statusStream,.systempanel-left #statusMeter,.systempanel-left #statusSource{display:none!important}';
  assert.doesNotMatch(css, new RegExp(forbidden.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')));
  for (const id of ['statusStream','statusSource','statusMeter']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});
