import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = fs.readFileSync('js/phase10-stability-iphone-panel-hud.js', 'utf8');
const mirror = fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js', 'utf8');

test('phase10 root and public remain byte-identical', () => {
  assert.equal(root, mirror);
});

test('PC side meter uses only real signal sources', () => {
  const start = root.indexOf('  function sideMeterReactV1AudioLevel(){');
  const end = root.indexOf('  function sideMeterReactV1Groups()', start);
  assert.ok(start >= 0 && end > start);
  const block = root.slice(start, end);

  assert.match(block, /window\.__MeterBus/);
  assert.match(block, /signalAvailable/);
  assert.match(block, /data-side-meter-signal/);
  assert.match(block, /real-unavailable/);
  assert.match(block, /meterbus-real/);
  assert.match(block, /legacy-real-level/);
  assert.match(block, /audio && !audio\.paused && signalAvailable/);

  assert.doesNotMatch(block, /Math\.sin/);
  assert.doesNotMatch(block, /sideMeterReactV1State\.phase\s*\+=/);
});

test('audio and mobile stream hardlocks remain intact', () => {
  assert.match(root, /centralAudioGuardV2Recover/);
  assert.match(root, /S666_AUDIO_HEALING_ORCHESTRA/);
  assert.match(root, /bindMobileStreamLedSwitch/);
  assert.match(root, /canonical:"mainBtn"/);
  assert.match(root, /canonical:"fallbackBtn"/);
});

test('side-meter repair does not create an audio graph', () => {
  const start = root.indexOf('  function sideMeterReactV1AudioLevel(){');
  const end = root.indexOf('  function sideMeterReactV1Groups()', start);
  const block = root.slice(start, end);
  assert.doesNotMatch(block, /AudioContext|createMediaElementSource|createAnalyser|createBiquadFilter/);
});
