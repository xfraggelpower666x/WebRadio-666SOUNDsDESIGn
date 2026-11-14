'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, '../src/diagnostics.js'), 'utf8');

async function runHostCheck(overrides = {}, engine = 'milkdrop') {
  const button = { addEventListener(_event, callback) { this.click = callback; } };
  const output = {};
  const status = {};
  const api = {
    displays: async () => [{}, {}],
    outputStatus: async () => ({
      detachedVisualizer: { visible: false, bounds: {} },
      active: [{ responsive: true }]
    }),
    remoteHealth: async () => ({ admin: { ok: true }, skip: { ok: true, configured: false } }),
    localQueueState: async () => ({ count: 3, index: 0 }),
    personalMilkdropLibrary: async () => ({ installed: true, milk: 2, milk2: 1 }),
    soundCloudStatus: async () => ({ configured: true }),
    runtimeDiagnostics: async () => ({}),
    ...overrides
  };
  const elements = {
    '#rw-diagnostics': { querySelectorAll: () => [] },
    '#rw-host-check': button,
    '#rw-host-check-state': output,
    '#rw-diag-state': status
  };
  const document = {
    querySelector: selector => elements[selector],
    getElementById: () => ({ value: engine })
  };
  runInNewContext(source, { document, window: { api }, setInterval() {} });
  await button.click();
  return { html: output.innerHTML, status: status.textContent };
}

test('Host Check kennzeichnet Befunde als Messwerte', async () => {
  const { html, status } = await runHostCheck();
  assert.match(html, /<strong>Detached Visualizer<\/strong><span>DETECTED<\/span>/);
  assert.match(html, /<strong>Secondary Outputs<\/strong><span>HEARTBEAT<\/span>/);
  assert.match(html, /<strong>Local Queue<\/strong><span>LOADED<\/span>/);
  assert.match(html, /<strong>Skip Bridge<\/strong><span>PENDING<\/span>/);
  assert.doesNotMatch(html, /<span>PASS<\/span>/);
  assert.match(status, /^HOST CHECK COMPLETE/);
});

test('Host Check zeigt Teilergebnisse trotz asynchroner und synchroner Abfragefehler', async () => {
  const { html, status } = await runHostCheck({
    soundCloudStatus: async () => { throw new Error('<offline>'); },
    remoteHealth: () => { throw new Error('IPC unavailable'); }
  }, 'unknown');
  assert.match(html, /<strong>SoundCloud API<\/strong><span>ERROR<\/span><small>&lt;offline&gt;/);
  assert.match(html, /<strong>Admin Session<\/strong><span>ERROR<\/span>/);
  assert.match(html, /<strong>Local Queue<\/strong><span>LOADED<\/span>/);
  assert.match(html, /<strong>Visualizer Engine<\/strong><span>PENDING<\/span>/);
  assert.match(status, /^HOST CHECK PARTIAL/);
});

test('Energieereignisse werden je Prozess nur einmal registriert', () => {
  const main = readFileSync(join(__dirname, '../main.js'), 'utf8');
  for (const event of ['suspend', 'resume', 'lock-screen', 'unlock-screen']) {
    assert.equal(main.split("powerMonitor.on('" + event + "'").length - 1, 1, event);
  }
});
