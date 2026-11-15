'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { spawnSync } = require('node:child_process');
const { create } = require('../src/audio-devices.js');
const { createAudioPermissionGate, forwardOverlayMicrophone } = require('../src/shared/audio-permissions.cjs');

function fixture() {
  const calls = [];
  const analyser = { name: 'analyser' };
  const destination = { name: 'speakers' };
  const exportNode = { name: 'export' };
  const streams = [];
  let rejectCapture = false;
  const context = {
    state: 'running', destination,
    createMediaStreamSource(stream) {
      return { connect(node) { calls.push(['mic-connect', node]); }, disconnect(node) { calls.push(['mic-disconnect', stream, node]); } };
    },
    async setSinkId(id) { calls.push(['sink', id]); }
  };
  const mediaDevices = {
    async enumerateDevices() { calls.push(['enumerate']); return [{ kind: 'audiooutput', deviceId: 'speaker' }]; },
    async getUserMedia(constraints) {
      calls.push(['getUserMedia', constraints]);
      if (rejectCapture) throw new Error('device denied');
      const track = { stopped: false, stop() { this.stopped = true; }, addEventListener(_type, fn) { this.ended = fn; } };
      const stream = { track, getTracks: () => [track], getAudioTracks: () => [track] };
      streams.push(stream);
      return stream;
    },
    async selectAudioOutput() { return { deviceId: 'chosen', label: 'Chosen' }; }
  };
  const controller = create({
    mediaDevices, begin: async kind => calls.push(['begin', kind]), end: async kind => calls.push(['end', kind]),
    graph: () => ({ context, analyser, exportNode })
  });
  return { calls, context, controller, streams, analyser, destination, exportNode, mediaDevices, reject() { rejectCapture = true; } };
}

test('capture is explicit, feeds only the shared analyser, switches safely and stops tracks', async () => {
  const f = fixture();
  assert.equal(f.calls.length, 0);
  await f.controller.enumerate();
  assert.equal(f.calls.some(c => c[0] === 'getUserMedia'), false);
  assert.equal(await f.controller.startInput('microphone-1'), true);
  assert.deepEqual(f.calls.find(c => c[0] === 'getUserMedia')[1], {
    audio: { deviceId: { exact: 'microphone-1' } }, video: false
  });
  assert.deepEqual(f.calls.filter(c => c[0] === 'mic-connect').map(c => c[1]), [f.analyser]);
  f.reject();
  await assert.rejects(f.controller.startInput('missing'), /device denied/);
  assert.equal(f.streams[0].track.stopped, false);
  f.controller.stopInput();
  assert.equal(f.streams[0].track.stopped, true);
  assert.equal(f.calls.filter(c => c[0] === 'end' && c[1] === 'microphone').length, 2);
});

test('microphone recording is opt-in and never monitors through speakers', async () => {
  const f = fixture();
  f.controller.setInputRecording(true);
  assert.equal(f.calls.some(c => c[0] === 'getUserMedia'), false);
  await f.controller.startInput('');
  assert.equal(f.controller.recordsInput(), true);
  assert.deepEqual(f.calls.filter(c => c[0] === 'mic-connect').map(c => c[1]), [f.analyser, f.exportNode]);
  assert.equal(f.calls.some(c => c[0] === 'mic-connect' && c[1] === f.destination), false);
  f.controller.setInputRecording(false);
  assert.equal(f.controller.recordsInput(), false);
  assert.equal(f.calls.at(-1)[2], f.exportNode);
  f.controller.stopInput();
});

test('stopping while permission is pending discards the eventual capture', async () => {
  const f = fixture();
  let resolve;
  f.mediaDevices.getUserMedia = () => new Promise(done => { resolve = done; });
  const pending = f.controller.startInput('');
  await Promise.resolve();
  const track = { stopped: false, stop() { this.stopped = true; } };
  f.controller.stopInput();
  resolve({ getTracks: () => [track], getAudioTracks: () => [track] });
  assert.equal(await pending, false);
  assert.equal(track.stopped, true);
  assert.equal(f.calls.some(c => c[0] === 'mic-connect'), false);
});

test('stopping while permission is being armed avoids opening a microphone', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requests = 0;
  let ended = 0;
  const controller = create({
    mediaDevices: { getUserMedia: async () => { requests++; } },
    begin: () => gate, end: async () => { ended++; },
    graph: () => ({ context: {}, analyser: {} })
  });
  const pending = controller.startInput('');
  controller.stopInput();
  release();
  assert.equal(await pending, false);
  assert.equal(requests, 0);
  assert.equal(ended, 1);
});

test('output routes the actual AudioContext sink; unsupported and failed changes are errors', async () => {
  const f = fixture();
  await f.controller.setOutput('speaker');
  await f.controller.chooseOutput();
  assert.deepEqual(f.calls.filter(c => c[0] === 'sink'), [['sink', 'speaker'], ['sink', 'chosen']]);
  f.context.setSinkId = async () => { throw new Error('device unavailable'); };
  await assert.rejects(f.controller.setOutput('missing'), /device unavailable/);
  delete f.context.setSinkId;
  await assert.rejects(f.controller.setOutput('speaker'), /not supported/);
});

test('overlapping output operations do not invalidate each other’s permission', async () => {
  const f = fixture();
  let release;
  f.mediaDevices.enumerateDevices = () => new Promise(resolve => { release = resolve; });
  const pending = f.controller.enumerate();
  await Promise.resolve();
  await assert.rejects(f.controller.setOutput('speaker'), /operation is in progress/);
  release([]);
  await pending;
  await f.controller.setOutput('speaker');
  assert.equal(f.calls.filter(call => call[0] === 'end' && call[1] === 'output').length, 2);
});

test('permission gate requires an explicit short-lived main-frame audio-only grant', () => {
  let time = 100;
  const frame = { url: 'file:///app/index.html' };
  const contents = { isDestroyed: () => false, getURL: () => frame.url, mainFrame: frame };
  const main = { isDestroyed: () => false, webContents: contents };
  const gate = createAudioPermissionGate({ getMainWindow: () => main, isTrustedUrl: url => url === frame.url, now: () => time });
  const event = { sender: contents, senderFrame: frame };
  const details = { isMainFrame: true, requestingUrl: frame.url, mediaType: 'audio', mediaTypes: ['audio'] };
  assert.equal(gate.request(contents, 'media', details), false);
  gate.arm(event, 'microphone');
  assert.equal(gate.check(contents, 'media', '', details), true);
  assert.equal(gate.request(contents, 'media', details), true);
  assert.equal(gate.request(contents, 'media', { ...details, mediaTypes: ['audio', 'video'] }), false);
  assert.equal(gate.check(contents, 'media', '', { ...details, mediaType: 'video' }), false);
  assert.equal(gate.request(contents, 'media', { ...details, isMainFrame: false }), false);
  assert.equal(gate.request(contents, 'media', { ...details, requestingUrl: 'https://untrusted.invalid/' }), false);
  assert.equal(gate.request({ ...contents }, 'media', details), false);
  assert.equal(gate.request(contents, 'display-capture', details), false);
  assert.equal(gate.request(contents, 'speaker-selection', details), false);
  gate.arm(event, 'output');
  assert.equal(gate.request(contents, 'speaker-selection', details), true);
  gate.revoke('output');
  assert.equal(gate.request(contents, 'speaker-selection', details), false);
  time += 30001;
  assert.equal(gate.request(contents, 'media', details), false);
  assert.throws(() => gate.arm({ sender: contents, senderFrame: { url: frame.url } }, 'microphone'), /blocked/);
});

test('preload arms microphone permission only after a genuine main-window enable click', async () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  const handlers = {};
  const calls = [];
  let api;
  runInNewContext(preload, {
    require: () => ({
      contextBridge: { exposeInMainWorld(_name, value) { api = value; } },
      ipcRenderer: { invoke(...args) { calls.push(args); return Promise.resolve({ ok: true }); }, on() {} },
      webUtils: {}
    }),
    window: { addEventListener(name, fn) { handlers[name] = fn; } }
  });
  const target = { closest: selector => selector === '#audio-input-start' };
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
  handlers.click({ isTrusted: false, target });
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
  handlers.click({ isTrusted: true, target });
  await api.audioPermissionBegin('microphone');
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
  assert.deepEqual(calls, [['audio:permission-begin', 'microphone']]);
});

test('only a genuine overlay click can send the dedicated microphone request', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'overlay-preload.js'), 'utf8');
  let click, api;
  const calls = [];
  runInNewContext(preload, {
    require: () => ({
      contextBridge: { exposeInMainWorld(_name, value) { api = value; } },
      ipcRenderer: { invoke(...args) { calls.push(args); return Promise.resolve(); }, on() {} }
    }),
    window: { addEventListener(name, fn) { if (name === 'click') click = fn; } }
  });
  const target = { closest: selector => selector === '#overlay-root #audio-input-start:not(:disabled)' };
  click({ isTrusted: false, target });
  click({ isTrusted: true, target: { closest: () => null } });
  assert.equal(calls.length, 0);
  click({ isTrusted: true, target });
  assert.deepEqual(calls, [['audio:overlay-microphone']]);
  assert.equal(api.audioOverlayMicrophone, undefined);
});

test('detached microphone forwarding errors are visible', async () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'overlay-preload.js'), 'utf8');
  let click;
  const status = {};
  runInNewContext(preload, {
    require: () => ({
      contextBridge: { exposeInMainWorld() {} },
      ipcRenderer: { invoke: () => Promise.reject(new Error('window unavailable')), on() {} }
    }),
    document: { getElementById: () => status },
    window: { addEventListener(_name, fn) { click = fn; } }
  });
  click({ isTrusted: true, target: { closest: () => true } });
  await Promise.resolve();
  assert.match(status.textContent, /window unavailable/);
});

test('overlay does not forward microphone through generic actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'overlay-window.js'), 'utf8');
  const handlers = {}, calls = [];
  let init;
  const root = { addEventListener(type, fn) { handlers[type] = fn; }, innerHTML: '' };
  const context = {
    document: { getElementById: () => root, title: '' },
    window: { addEventListener() {}, rwOverlay: {
      onInit(fn) { init = fn; }, onSync() {},
      ready() { return Promise.resolve(); },
      action(payload) { calls.push(payload); return Promise.resolve(); }
    } }
  };
  runInNewContext(source, context);
  init({ key: 'audioDevices', html: '' });
  handlers.click({ target: { closest: () => ({ id: 'audio-input-start', dataset: {} }) } });
  assert.equal(calls.length, 0);
  handlers.click({ target: { closest: () => ({ id: 'audio-input-stop', dataset: {} }) } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'audio-input-stop');
});

test('dedicated microphone forwarding rejects other overlays, frames, URLs and closed windows', () => {
  const sent = [];
  const frame = { url: 'file:///app/overlay.html?key=audioDevices' };
  const contents = { isDestroyed: () => false, getURL: () => frame.url, mainFrame: frame };
  const deviceWindow = { isDestroyed: () => false, webContents: contents };
  const main = { isDestroyed: () => false, webContents: { send: (...args) => sent.push(args) } };
  const options = { getMainWindow: () => main, getDevicesWindow: () => deviceWindow, isTrustedOverlayUrl: url => url === frame.url };
  const event = { sender: contents, senderFrame: frame };
  assert.deepEqual(forwardOverlayMicrophone(event, options), { ok: true });
  assert.deepEqual(sent, [['audio:overlay-microphone']]);
  assert.throws(() => forwardOverlayMicrophone({ ...event, sender: { ...contents } }, options), /blocked/);
  assert.throws(() => forwardOverlayMicrophone({ ...event, senderFrame: { url: frame.url } }, options), /blocked/);
  assert.throws(() => forwardOverlayMicrophone(event, { ...options, isTrustedOverlayUrl: () => false }), /blocked/);
  assert.throws(() => forwardOverlayMicrophone(event, { ...options, getDevicesWindow: () => ({ ...deviceWindow, isDestroyed: () => true }) }), /blocked/);
  assert.equal(sent.length, 1);
});

test('main preload consumes a forwarded microphone gesture once without exposing an arm method', async () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  const listeners = {};
  const calls = [];
  let api;
  runInNewContext(preload, {
    require: () => ({
      contextBridge: { exposeInMainWorld(_name, value) { api = value; } },
      ipcRenderer: {
        invoke(...args) { calls.push(args); return Promise.resolve({ ok: true }); },
        on(name, fn) { listeners[name] = fn; }
      }, webUtils: {}
    }),
    window: { addEventListener() {} }
  });
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
  api.onDetachedMicrophoneRequest(() => { api.audioPermissionBegin('microphone'); });
  listeners['audio:overlay-microphone']();
  assert.deepEqual(calls, [['audio:permission-begin', 'microphone']]);
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
  api.onDetachedMicrophoneRequest(() => {});
  listeners['audio:overlay-microphone']();
  await assert.rejects(api.audioPermissionBegin('microphone'), /main window/);
});

test('microphone denial and synthetic detached clicks are shown without starting capture', async () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const start = app.indexOf('function setupAudioDevices()');
  const end = app.indexOf('function setupLocalLibrary()', start);
  assert.ok(start >= 0 && end > start);
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', handlers: {}, textContent: '', options: [],
      addEventListener(type, fn) { this.handlers[type] = fn; }
    });
    return elements.get(id);
  }
  let requests = 0;
  let detached;
  const context = {
    document: { getElementById: element },
    navigator: { mediaDevices: { async getUserMedia() { requests++; throw new Error('Permission denied'); } } },
    window: { RWAudioDevices: { create }, api: { audioPermissionBegin: async () => {}, audioPermissionEnd: async () => {}, onDetachedMicrophoneRequest: fn => { detached = fn; } }, addEventListener() {} },
    ensureAudioContext() {}, audioContext: {}, analyserNode: {}, audioDestinationNode: null,
    audioDeviceController: null, audioInputRecord: element('audio-input-record'),
    btnExport: { disabled: true }, audioElement: { currentSrc: '', getAttribute: () => null }, exportSession: null
  };
  runInNewContext(app.slice(start, end), context);
  context.setupAudioDevices();
  await element('audio-input-start').handlers.click({ isTrusted: false });
  assert.equal(requests, 0);
  assert.match(element('audio-input-status').textContent, /directly/);
  await element('audio-input-start').handlers.click({ isTrusted: true });
  assert.equal(requests, 1);
  assert.match(element('audio-input-status').textContent, /Microphone error.*Permission denied/);
  await detached();
  assert.equal(requests, 2);
  assert.match(element('audio-input-status').textContent, /Microphone error.*Permission denied/);
});

test('disconnecting an opted-in microphone aborts the active recording', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const start = app.indexOf('function setupAudioDevices()');
  const end = app.indexOf('function setupLocalLibrary()', start);
  assert.ok(start >= 0 && end > start);
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { checked: false, value: '', textContent: '', addEventListener() {} });
    return elements.get(id);
  }
  let stopped, failure;
  const session = { includeMicrophone: true };
  const context = {
    document: { getElementById: element }, navigator: { mediaDevices: {} },
    window: {
      RWAudioDevices: { create: options => { stopped = options.onInputStopped; return { recordsInput: () => false, setInputRecording() {} }; } },
      api: { onDetachedMicrophoneRequest() {} }, addEventListener() {}
    },
    audioInputRecord: element('audio-input-record'), audioDeviceController: null, btnExport: {},
    audioElement: { currentSrc: '', getAttribute: () => null }, exportSession: session,
    recordingError: (active, error) => { assert.equal(active, session); failure = error.message; }
  };
  runInNewContext(app.slice(start, end), context);
  context.setupAudioDevices();
  stopped('Microphone disconnected');
  assert.equal(failure, 'Microphone disconnected');
  assert.match(element('audio-input-status').textContent, /disconnected/);
});

test('Electron enforces the microphone gate with a fake device', () => {
  const scratch = path.join(__dirname, 'audio-permission-offline-' + process.pid);
  fs.mkdirSync(scratch);
  try {
    const env = { ...process.env, TEMP: scratch, TMP: scratch, AUDIO_PERMISSION_TEST_DATA: scratch };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(require('electron'), [path.join(__dirname, 'audio-permission-electron.cjs')], {
      cwd: path.join(__dirname, '..'), env, encoding: 'utf8', timeout: 60000, windowsHide: true
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /ELECTRON_AUDIO_PERMISSION_PASS/);
  } finally { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});

test('playback and recording bypass the microphone analyser path', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const start = app.indexOf('function ensureAudioContext()');
  const end = app.indexOf('async function togglePlayback()', start);
  assert.ok(start >= 0 && end > start);
  const edges = [];
  const node = name => ({ name, gain: {}, connect(to) { edges.push([name, to.name]); } });
  const destination = node('speakers');
  let silent;
  class Context {
    constructor() { this.destination = destination; this.state = 'running'; }
    createAnalyser() { return Object.assign(node('analyser'), { frequencyBinCount: 512 }); }
    createMediaElementSource() { return node('playback'); }
    createGain() { silent = node('silent'); return silent; }
    createMediaStreamDestination() { return node('export'); }
  }
  const context = {
    window: { AudioContext: Context, RWAudioEq: { create: () => ({ input: node('eq-input'), output: node('eq-output'), set() {} }) } },
    audioElement: {}, audioContext: null, audioSource: null, analyserNode: null, audioDestinationNode: null,
    audioEq: null, audioEqSettings: {}
  };
  runInNewContext(app.slice(start, end), context);
  context.ensureAudioContext();
  assert.deepEqual(edges, [['playback', 'eq-input'], ['eq-output', 'analyser'], ['eq-output', 'speakers'], ['analyser', 'silent'], ['silent', 'speakers'], ['eq-output', 'export']]);
  assert.equal(silent.gain.value, 0);
});
