'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const surround = require('../src/audio-surround.js');

function fixture(max = 8) {
  const nodes = [];
  function node(kind) {
    const result = {
      kind, edges: [], gain: {}, frequency: {}, Q: {},
      connect(target, output = 0, input = 0) {
        if (!this.edges.some(edge => edge.target === target && edge.output === output && edge.input === input))
          this.edges.push({ target, output, input });
      },
      disconnect(target) { this.edges = target ? this.edges.filter(edge => edge.target !== target) : []; }
    };
    nodes.push(result); return result;
  }
  const destination = node('destination');
  Object.assign(destination, { maxChannelCount: max, channelCount: 2 });
  const source = node('source'), analyser = node('analyser'), recording = node('export');
  source.connect(analyser); source.connect(destination); source.connect(recording);
  const context = {
    destination, sinkId: '',
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'),
    createChannelSplitter: () => node('splitter'), createChannelMerger: () => node('merger')
  };
  return { nodes, source, analyser, recording, destination, context, controller: surround.create(context, source) };
}
const destinations = node => node.edges.map(edge => edge.target.kind);

test('default is a direct bypass; enabling and reset leave analyser and export untouched', () => {
  const f = fixture();
  assert.deepEqual(destinations(f.source), ['analyser', 'destination', 'export']);
  assert.equal(f.destination.channelCount, 2);
  f.controller.enable();
  assert.equal(f.controller.isActive(), true);
  assert.equal(f.destination.channelCount, 8);
  assert.deepEqual(destinations(f.source), ['analyser', 'export', 'gain']);
  f.controller.disable();
  assert.equal(f.controller.isActive(), false);
  assert.equal(f.destination.channelCount, 2);
  assert.deepEqual(destinations(f.source), ['analyser', 'export', 'destination']);
  f.controller.disable();
  assert.equal(f.source.edges.length, 3);
  f.destination.maxChannelCount = 2;
  assert.throws(() => f.controller.enable(), /8 channels/);
  assert.equal(f.destination.channelCount, 2);
});

test('unknown sink, insufficient capacity and setup errors never replace normal routing', () => {
  for (const maximum of [0, 2, 6, undefined, NaN]) {
    const f = fixture(maximum);
    if (maximum === undefined) f.destination.maxChannelCount = undefined;
    assert.throws(() => f.controller.enable(), /8 channels/);
    assert.deepEqual(destinations(f.source), ['analyser', 'destination', 'export']);
  }
  const f = fixture();
  delete f.context.sinkId;
  assert.throws(() => f.controller.enable(), /identity/);
  f.context.sinkId = { type: 'none' };
  assert.throws(() => f.controller.enable(), /identity/);
  f.context.sinkId = 'chosen';
  f.context.createChannelMerger = () => { throw new Error('node failure'); };
  assert.throws(() => f.controller.enable(), /node failure/);
  assert.deepEqual(destinations(f.source), ['analyser', 'destination', 'export']);
  assert.equal(f.destination.channelCount, 2);
  assert.equal(f.controller.isActive(), false);
});

test('a failed channel-count reset is reported and retried before another enable', () => {
  const f = fixture();
  f.controller.enable();
  let count = 8, refuse = true;
  Object.defineProperty(f.destination, 'channelCount', {
    get: () => count,
    set(value) { if (refuse) throw new Error('device lost'); count = value; }
  });
  assert.throws(() => f.controller.disable(), /could not be restored/);
  assert.equal(f.controller.isActive(), false);
  assert.deepEqual(destinations(f.source), ['analyser', 'export', 'destination']);
  assert.throws(() => f.controller.enable(), /could not be restored/);
  refuse = false;
  f.controller.disable();
  assert.equal(count, 2);
  f.controller.enable();
  assert.equal(count, 8);
});

test('a failed setup also reports and retries a failed channel-count rollback', () => {
  const f = fixture();
  let count = 2, failRestore = true;
  Object.defineProperty(f.destination, 'channelCount', {
    get: () => count,
    set(value) { if (value === 2 && failRestore) throw new Error('device lost'); count = value; }
  });
  const connect = f.source.connect;
  f.source.connect = function (target, ...args) {
    if (target.kind === 'gain') throw new Error('connection failed');
    return connect.call(this, target, ...args);
  };
  assert.throws(() => f.controller.enable(), /connection failed.*could not be restored/);
  assert.deepEqual(destinations(f.source), ['analyser', 'destination', 'export']);
  failRestore = false;
  f.controller.disable();
  assert.equal(count, 2);
});

test('changing output or losing a device disables 7.1, including during pending selection', async () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const start = app.indexOf('function setupAudioDevices()');
  const end = app.indexOf('function setupLocalLibrary()', start);
  const elements = new Map(), events = {}, contextEvents = {};
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', checked: false, textContent: '', handlers: {}, options: [],
      addEventListener(type, fn) { this.handlers[type] = fn; }
    });
    return elements.get(id);
  }
  let release, enabled = false, resets = 0, enableError = null;
  const ctx = {
    document: { getElementById: element },
    navigator: { mediaDevices: { addEventListener(type, fn) { events[type] = fn; } } },
    window: {
      RWAudioDevices: { create: () => ({
        setOutput: () => new Promise(resolve => { release = resolve; }), stopInput() {},
        chooseOutput: async () => { throw new Error('device unavailable'); },
        recordsInput: () => false, setInputRecording() {}
      }) },
      RWAudioSurround: { create: () => ({
        enable() { if (enableError) throw new Error(enableError); enabled = true; },
        disable() { if (enabled) resets++; enabled = false; }
      }) },
      api: { onDetachedMicrophoneRequest() {} }, addEventListener() {}
    },
    audioInputRecord: element('audio-input-record'), audioDeviceController: null,
    btnExport: {}, audioElement: { currentSrc: '', getAttribute: () => null },
    ensureAudioContext() {}, audioEq: { output: {} },
    audioContext: { addEventListener(type, fn) { contextEvents[type] = fn; } }, analyserNode: {}
  };
  runInNewContext(app.slice(start, end), ctx);
  ctx.setupAudioDevices();
  const toggle = element('audio-surround-enable'), status = element('audio-surround-status');
  const enable = () => { toggle.checked = true; toggle.handlers.change(); };
  enable(); assert.equal(enabled, true);
  events.devicechange();
  assert.equal(enabled, false); assert.equal(toggle.checked, false);
  assert.match(status.textContent, /Devices changed/);
  enable(); contextEvents.sinkchange();
  assert.equal(enabled, false); assert.match(status.textContent, /Output changed/);
  enable();
  const pending = element('audio-output-apply').handlers.click();
  assert.equal(enabled, false);
  enable(); assert.equal(enabled, false); assert.match(status.textContent, /while the output is changing/);
  release(); await pending;
  enable(); assert.equal(enabled, true);
  toggle.checked = false; toggle.handlers.change();
  assert.equal(enabled, false); assert.equal(resets, 4);
  enableError = 'not enough channels';
  enable(); assert.equal(toggle.checked, false); assert.match(status.textContent, /unavailable.*not enough channels/);
  enableError = null;
  enable();
  await element('audio-output-choose').handlers.click();
  assert.equal(enabled, false); assert.match(element('audio-output-status').textContent, /device unavailable/);
});

test('Electron OfflineAudioContext renders 8-channel bypass and exact stereo upmix', () => {
  const project = path.join(__dirname, '..');
  const scratch = path.join(__dirname, 'audio-surround-offline-' + process.pid);
  fs.mkdirSync(scratch);
  try {
    const env = { ...process.env, TEMP: scratch, TMP: scratch, AUDIO_SURROUND_TEST_DATA: scratch };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(require('electron'), [path.join(__dirname, 'audio-surround-offline.cjs')], {
      cwd: project, env, encoding: 'utf8', timeout: 60000, windowsHide: true
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /OFFLINE_SURROUND_PASS/);
  } finally { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});
