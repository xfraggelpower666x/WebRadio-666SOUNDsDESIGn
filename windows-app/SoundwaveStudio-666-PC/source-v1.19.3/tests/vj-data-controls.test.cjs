'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RWVjData = require('../src/vj-data.js');

function setup() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', checked: false, disabled: false, textContent: '', handlers: {},
      addEventListener(event, callback) { this.handlers[event] = callback; },
      fire(event) { return this.handlers[event](); }
    });
    return elements.get(id);
  }
  element('vj-data-shots').value = '10000';
  element('vj-data-limit').value = '3';
  element('vj-data-inputs').value = '000000000000000000000000';
  element('vj-data-audio-enabled').checked = true;
  const queue = [], sequence = [];
  let provider = null;
  const studio = {
    getState: () => ({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }),
    setEnvelopeProvider(value) { provider = value; },
    setSequence(value) { sequence.push(value); }
  };
  const window = {
    vjStudio: studio, RWVjData,
    api: { openVjData: async () => queue.shift() }
  };
  const code = fs.readFileSync(path.join(__dirname, '../src/vj-data-controls.js'), 'utf8');
  vm.runInNewContext(code, {
    window, location: { search: '' }, document: { getElementById: element },
    URLSearchParams, AbortController
  });
  return { element, queue, sequence, provider: () => provider };
}

test('CSV sync is explicitly enabled, preserves missing live bands and can be cleared', async () => {
  const ui = setup();
  assert.equal(ui.element('vj-data-audio-enabled').checked, false);
  ui.element('vj-data-audio-enabled').checked = true;
  ui.element('vj-data-audio-enabled').fire('change');
  assert.equal(ui.element('vj-data-audio-enabled').checked, false);
  assert.match(ui.element('vj-data-audio-status').textContent, /Load an audio sync CSV first/);
  ui.queue.push([{ name: 'bass.csv', text: 'Time_ms,Bass_Amplitude\n100,0.8' }]);
  await ui.element('vj-data-bass').fire('click');
  ui.element('vj-data-audio-enabled').checked = true;
  ui.element('vj-data-audio-enabled').fire('change');
  const bands = ui.provider()({ timeMs: 100, bass: 0.1, snare: 0.3, hihat: 0.4 });
  assert.equal(bands.bass, 0.8);
  assert.equal(bands.snare, 0.3);
  assert.equal(bands.hihat, 0.4);
  assert.match(ui.element('vj-data-audio-status').textContent, /Live analysis: snare, hihat/);
  const audio = ui.element('audio-element');
  audio.src = 'first-track';
  audio.fire('loadstart');
  audio.src = 'second-track';
  audio.fire('loadstart');
  assert.equal(ui.provider(), null);
  assert.match(ui.element('vj-data-audio-status').textContent, /source changed/);
  ui.element('vj-data-clear-audio').fire('click');
  assert.equal(ui.provider(), null);
});

test('parity order uses the selected pool and cancellation preserves prior data', async () => {
  const ui = setup();
  ui.queue.push([{ name: 'selection.json', text: '[{"dst":"1"},{"dst":"111"},{"dst":"11"}]' }]);
  await ui.element('vj-data-parity').fire('click');
  const simulation = ui.element('vj-data-simulate').fire('click');
  assert.equal(ui.element('vj-data-parity').disabled, true);
  ui.element('vj-data-cancel').fire('click');
  await simulation;
  assert.match(ui.element('vj-data-status').textContent, /cancelled/i);
  ui.element('vj-data-select').fire('click');
  assert.equal(ui.sequence[0].length, 2);
  assert.ok(ui.sequence[0].every(id => ['a', 'b', 'c'].includes(id)));
  ui.element('vj-data-reset').fire('click');
  assert.equal(ui.sequence[1], null);
});
