import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('css/phase10-stability-iphone-panel-hud.css','utf8');
const cssPublic=fs.readFileSync('public/css/phase10-stability-iphone-panel-hud.css','utf8');
const phase10=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const phase10Public=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const htmlPublic=fs.readFileSync('public/index.html','utf8');

test('top panel ownership survives Phase10 boot',()=>{
  assert.equal(cssPublic,css);
  assert.equal(phase10Public,phase10);
  assert.equal(htmlPublic,html);
  assert.ok(!css.includes('.systempanel-left #statusStream,.systempanel-left #statusMeter,.systempanel-left #statusSource{display:none!important}'));
  for(const id of ['statusStream','statusSource','statusMeter']) assert.ok(html.includes('id="'+id+'"'));
  assert.ok(!phase10.includes('mainBtn.classList.add("is-active")'));
  assert.ok(!phase10.includes('fbBtn.classList.remove("is-active")'));
  assert.ok(html.includes('phase10-stability-iphone-panel-hud.css?v=2026-09-03-top-panel-owner-v1'));
  assert.ok(html.includes('phase10-stability-iphone-panel-hud.js?v=2026-09-03-top-panel-owner-v1'));
});
