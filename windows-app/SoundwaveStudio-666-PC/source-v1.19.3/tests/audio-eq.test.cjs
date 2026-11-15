'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { create } = require('../src/audio-eq.js');

function graph() {
  const nodes = [];
  function param() {
    return { value: 0, calls: [], cancelScheduledValues(time) { this.calls.push(['cancel', time]); },
      setTargetAtTime(value, time, constant) { this.value = value; this.calls.push(['target', value, time, constant]); } };
  }
  function node(kind) {
    const result = { kind, connections: [], gain: param(), frequency: param(), Q: param(), connect(other) { this.connections.push(other); } };
    nodes.push(result); return result;
  }
  const context = {
    state: 'suspended', currentTime: 2,
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'),
    createChannelSplitter: () => node('splitter'), createChannelMerger: () => node('merger')
  };
  return { context, nodes, eq: create(context) };
}

test('flat EQ, three independent bounded controls, bypass and reset', () => {
  const { context, nodes, eq } = graph();
  const [bass, mid, treble] = nodes.filter(node => node.kind === 'filter');
  const [input, output, dry, wet, mix, direct, stereo, stereoInput, leftLeft, leftRight, rightLeft, rightRight] = nodes.filter(node => node.kind === 'gain');
  assert.deepEqual([bass.type, mid.type, treble.type], ['lowshelf', 'peaking', 'highshelf']);
  assert.deepEqual([bass.frequency.value, mid.frequency.value, treble.frequency.value], [200, 1000, 4000]);
  assert.deepEqual([bass.gain.value, mid.gain.value, treble.gain.value, dry.gain.value, wet.gain.value], [0, 0, 0, 0, 1]);
  assert.deepEqual(input.connections, [dry, bass]);
  assert.deepEqual(bass.connections, [mid]);
  assert.deepEqual(mid.connections, [treble]);
  assert.deepEqual(treble.connections, [wet]);
  assert.deepEqual(dry.connections, [mix]);
  assert.deepEqual(wet.connections, [mix]);
  assert.deepEqual(mix.connections, [direct, stereoInput]);
  assert.deepEqual(direct.connections, [output]);
  assert.deepEqual(stereo.connections, [output]);
  assert.deepEqual([direct.gain.value, stereo.gain.value], [1, 0]);
  eq.set({ bass: 99, mid: -9, treble: -99, bypass: true });
  assert.deepEqual([bass.gain.value, mid.gain.value, treble.gain.value, dry.gain.value, wet.gain.value], [12, -9, -12, 1, 0]);
  eq.set({ width: 0 });
  assert.deepEqual([leftLeft.gain.value, leftRight.gain.value, rightLeft.gain.value, rightRight.gain.value], [0.5, 0.5, 0.5, 0.5]);
  assert.deepEqual([direct.gain.value, stereo.gain.value], [0, 1]);
  eq.set({ width: 200 });
  assert.deepEqual([leftLeft.gain.value, leftRight.gain.value, rightLeft.gain.value, rightRight.gain.value], [0.75, -0.25, -0.25, 0.75]);
  context.state = 'running';
  eq.set();
  assert.deepEqual([bass.gain.value, mid.gain.value, treble.gain.value, dry.gain.value, wet.gain.value], [0, 0, 0, 0, 1]);
  for (const control of [bass.gain, mid.gain, treble.gain, dry.gain, wet.gain])
    assert.deepEqual(control.calls.slice(-2), [['cancel', 2], ['target', control.value, 2, 0.015]]);
});

test('EQ controls restore state without starting playback and reset all bands and bypass', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const start = app.indexOf('function setupAudioFx()');
  const end = app.indexOf('function setupAudioDevices()', start);
  assert.ok(start >= 0 && end > start);
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '0', checked: false, handlers: {}, textContent: '',
      addEventListener(type, fn) { this.handlers[type] = fn; },
      dispatchEvent(event) { this.handlers[event.type]?.(event); }
    });
    return elements.get(id);
  }
  element('audio-fx-bass').value = '6';
  element('audio-fx-width').value = '150';
  element('audio-fx-bypass').checked = true;
  const context = {
    document: { getElementById: element }, Event: class { constructor(type) { this.type = type; } },
    audioEq: null, audioEqSettings: { bass: 0, mid: 0, treble: 0, bypass: false, width: 100 }
  };
  runInNewContext(app.slice(start, end), context);
  context.setupAudioFx();
  assert.equal(context.audioEqSettings.bass, 6);
  assert.equal(context.audioEqSettings.bypass, true);
  assert.equal(context.audioEqSettings.width, 150);
  assert.equal(element('audio-fx-bass-value').textContent, '+6 dB');
  const applied = [];
  context.audioEq = { set(value) { applied.push({ ...value }); } };
  element('audio-fx-reset').handlers.click();
  assert.deepEqual(applied.at(-1), { bass: 0, mid: 0, treble: 0, bypass: false, width: 100 });
});

test('Chromium OfflineAudioContext renders synthetic stereo and band responses', () => {
  const project = path.join(__dirname, '..');
  const electron = require('electron');
  const scratch = path.join(__dirname, 'audio-eq-offline-' + process.pid);
  fs.mkdirSync(scratch);
  try {
    const env = { ...process.env, TEMP: scratch, TMP: scratch, AUDIO_EQ_TEST_DATA: scratch };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(electron, [path.join(__dirname, 'audio-eq-offline.cjs')], {
      cwd: project, env, encoding: 'utf8', timeout: 60000, windowsHide: true
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /OFFLINE_EQ_PASS/);
  } finally { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});
