import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const policySrc = fs.readFileSync(new URL('../public/js/audio-meter-policy.js', import.meta.url), 'utf8');
const measuredClock = { paused: false, ended: false, muted: false, volume: 0.75, readyState: 4 };
function policy(userAgent, platform = '', maxTouchPoints = 0) {
  const window = { navigator: { userAgent, platform, maxTouchPoints } };
  vm.runInNewContext(policySrc, { window });
  return window.S666AudioMeterPolicy;
}

test('nur iPhone und iPad verwenden bei laufendem Audio synthetische UI-Pegel', () => {
  for (const device of [policy('iPhone'), policy('iPad'), policy('Safari Mac', 'MacIntel', 5)]) {
    assert.equal(device.canSimulate(measuredClock, { hidden: false }), true);
    assert.equal(device.canSimulate({ ...measuredClock, readyState: 2 }, { hidden: false }), false);
    assert.equal(device.canSimulate({ ...measuredClock, muted: true }, { hidden: false }), false);
    assert.equal(device.canSimulate(measuredClock, { hidden: true }), false);
    assert.notEqual(device.visualBands(0).bass, device.visualBands(0.125).bass);
  }
  for (const device of [policy('Android Chrome'), policy('Windows Chrome'), policy('Safari', 'MacIntel')]) {
    assert.equal(device.canSimulate(measuredClock, { hidden: false }), false);
  }
});

test('Dashboard nutzt denselben GOV-Dialog und versieht simulierte Pegel mit eigener Herkunft', () => {
  const dashboard = fs.readFileSync(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');
  const main = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const neon = fs.readFileSync(new URL('../public/dashboard/audio-neon.js', import.meta.url), 'utf8');
  const dialog = html => html.match(/<dialog id="web-govee"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialog(main));
  assert.equal(dialog(dashboard), dialog(main));
  assert.match(dashboard, /govee-panel\.js\?v=signal-r1/);
  assert.doesNotMatch(dashboard, /govee-bridge-client|Lokale Licht-Bridge/);
  assert.match(neon, /data\?\.type === 'lyvra:audio:visual-fallback'.*isAppleMobile/);
  assert.match(neon, /event.origin !== origin \|\| !frame/);
  assert.match(neon, /mode: source/);
});
