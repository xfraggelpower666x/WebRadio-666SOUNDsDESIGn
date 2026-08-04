import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/phase10-stability-iphone-panel-hud.js', 'utf8');
const jsMirror = fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js', 'utf8');
const css = fs.readFileSync('css/phase10-stability-iphone-panel-hud.css', 'utf8');
const cssMirror = fs.readFileSync('public/css/phase10-stability-iphone-panel-hud.css', 'utf8');

test('mobile bottom-meter mirrors remain byte-identical', () => {
  assert.equal(js, jsMirror);
  assert.equal(css, cssMirror);
});

test('mobile bottom meter uses only fresh real MeterBus data', () => {
  const start = js.indexOf('  var mobileBottomMeterState');
  const end = js.indexOf('  function bindEqTriggers()', start);
  assert.ok(start >= 0 && end > start);
  const block = js.slice(start, end);
  assert.ok(block.includes('window.__MeterBus'));
  assert.ok(block.includes('bus.source === "real"'));
  assert.ok(block.includes('Date.now() - Number(bus.ts || 0) < 700'));
  assert.ok(block.includes('audio && !audio.paused'));
  assert.ok(block.includes('scaleX('));
  assert.ok(block.includes('real-unavailable'));
  for (const forbidden of ['Math.sin', 'pseudo', 'synthetic', 'AudioContext', 'createMediaElementSource', 'createAnalyser']) {
    assert.ok(!block.includes(forbidden), forbidden);
  }
});

test('mobile bottom meter has a physical safe-edge floor', () => {
  assert.ok(css.includes('bottom:max(var(--s666-safe-bottom),6px)!important'));
  assert.ok(css.includes('bottom:max(env(safe-area-inset-bottom,0px),6px)!important'));
  assert.ok(css.includes('width:100%;'));
  assert.ok(css.includes('transform:scaleX(0);'));
  assert.ok(!css.includes('width:35%;'));
});

test('audio recovery and H-B hardlocks remain intact', () => {
  for (const required of ['S666_AUDIO_HEALING_ORCHESTRA', 'centralAudioGuardV2Recover', 'bindMobileStreamLedSwitch', 'canonical:"mainBtn"', 'canonical:"fallbackBtn"']) {
    assert.ok(js.includes(required), required);
  }
});
