'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createVjFiles } = require('../src/shared/vj-files.cjs');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'vj-studio.js'), 'utf8');

function renderer({ logger = console } = {}) {
  class Element {
    constructor(id) {
      this.id = id; this.value = ''; this.checked = false; this.children = []; this.events = {};
      this.classList = { add() {}, remove() {} };
      this.attributes = {}; this.paused = true; this.readyState = 2;
      this.videoWidth = 1920; this.videoHeight = 1080; this.duration = 10; this.currentTime = 0;
    }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    emit(type) { return Promise.all((this.events[type] || []).map(fn => fn({ target: this }))); }
    appendChild(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this[key]; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
  }
  const ids = ['audio-element', 'vj-studio', 'vj-selection', 'vj-status', 'vj-layout', 'vj-opacity', 'vj-loop',
    'vj-next', 'vj-toggle', 'vj-clear', 'vj-choose', 'vj-open', 'vj-close', 'vj-opacity-value'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  nodes['vj-layout'].value = '1'; nodes['vj-opacity'].value = '70'; nodes['vj-loop'].checked = true;
  const created = [];
  const document = { getElementById: id => nodes[id], createElement: tag => { const e = new Element(tag); if (tag === 'video') created.push(e); return e; } };
  const items = ['one', 'two', 'three'].map((name, i) => ({ id: String(i), name, url: `swvj://video/${i}` }));
  const toggles = [];
  const window = { api: { vjChooseVideos: async () => items, vjClearVideos: async () => true }, RWWorkspace: { toggle: key => toggles.push(key) } };
  let now = 100;
  vm.runInNewContext(source, { window, document, location: { search: '' }, URLSearchParams, console: logger, performance: { now: () => now } });
  return { window, nodes, created, items, toggles, setNow: value => { now = value; } };
}
const choose = async f => f.nodes['vj-choose'].emit('click');
const toggle = async f => f.nodes['vj-toggle'].emit('click');

test('VJ Studio button delegates to the workspace window', async () => {
  const f = renderer();
  await f.nodes['vj-open'].emit('click');
  assert.deepEqual(f.toggles, ['vjStudio']);
});

test('only picker-approved tokens resolve, ranges pass through, and clear revokes access', async () => {
  const calls = [];
  let current = 0;
  const fileSystem = {
    realpathSync: file => { if (file === 'gone.webm') throw new Error('missing'); return file; },
    statSync: file => ({ isFile: () => !file.endsWith('directory.mp4') })
  };
  const pool = createVjFiles({
    fileSystem, makeId: () => (++current).toString(16).padStart(32, '0'),
    fetchFile: async (url, opts) => { calls.push({ url, opts }); return new Response('video', { status: 206, headers: { 'content-range': 'bytes 0-4/5' } }); }
  });
  const list = pool.replace(['chosen.mp4', 'second.webm']);
  const get = (url, options) => pool.handle(new Request(url, options));
  const response = await get(list[0].url, { headers: { range: 'bytes=0-4', authorization: 'secret' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.equal(calls[0].opts.headers.get('range'), 'bytes=0-4');
  assert.equal(calls[0].opts.headers.get('authorization'), null);
  for (const url of [list[0].url + '?x=1', 'swvj://video/../../private', 'swvj://other/' + list[0].id, 'swvj://video/' + 'f'.repeat(32)]) {
    assert.equal((await get(url)).status, 404);
  }
  assert.equal((await get(list[0].url, { method: 'POST' })).status, 404);
  assert.equal((await get(list[0].url, { headers: { range: 'bytes=0-1,2-3' } })).status, 416);
  assert.throws(() => pool.replace(Array(101).fill('chosen.mp4')), /100/);
  assert.throws(() => pool.replace(['private.txt']), /MP4/);
  assert.throws(() => pool.replace(['gone.webm']), /missing/);
  assert.equal((await get(list[0].url)).status, 206);
  pool.clear();
  assert.equal((await get(list[0].url)).status, 404);
  assert.equal(calls.length, 2);
});

test('video picker IPC is main-window-only, serializes dialogs and never accepts renderer paths', async () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const roles = main.slice(main.indexOf('function senderRole('), main.indexOf('\n\nfunction radioUrl('));
  const vj = main.slice(main.indexOf("registerIpc('vj:choose-videos'"), main.indexOf("registerIpc('audio:permission-begin'"));
  const handlers = {}, received = [];
  let release;
  const picker = new Promise(resolve => { release = resolve; });
  const context = {
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    mainWindow: { isDestroyed: () => false, webContents: { id: 1 } }, introWindow: null,
    outputWindows: new Map([[2, { isDestroyed: () => false, webContents: { id: 2 } }]]),
    detachedVisualizerWindow: null, detachedOverlayWindows: new Map(),
    dialog: { showOpenDialog: async () => picker },
    vjPickerOpen: false, vjFiles: { replace: paths => { received.push(paths); return ['approved']; }, clear: () => {} },
    broadcastVjState: () => {}
  };
  vm.runInNewContext(roles + vj, context);
  const event = id => ({ sender: { id, isDestroyed: () => false } });
  await assert.rejects(handlers['vj:choose-videos'](event(2), ['bad.mp4']), /ipc_sender_blocked/);
  const pending = handlers['vj:choose-videos'](event(1), ['bad.mp4']);
  await assert.rejects(handlers['vj:choose-videos'](event(1)), /already open/);
  await assert.rejects(handlers['vj:clear-videos'](event(1)), /already open/);
  release({ canceled: false, filePaths: ['picker.webm'] });
  assert.deepEqual(await pending, ['approved']);
  assert.deepEqual(received, [['picker.webm']]);
});

test('pool selection and sequence follow shared playback, changes, errors, and loop mode', async () => {
  const f = renderer(), api = f.window.vjStudio, audio = f.nodes['audio-element'];
  await choose(f);
  assert.equal(api.getState().currentId, '0');
  assert.equal(api.select('not-in-pool'), false);
  assert.equal(api.getState().currentId, '0');
  await toggle(f);
  assert.equal(f.created[0].paused, true);
  await audio.emit('playing');
  assert.equal(f.created[0].paused, false);
  assert.equal(f.created[0].muted, true);
  await audio.emit('waiting'); assert.equal(f.created[0].paused, true);
  await audio.emit('playing'); assert.equal(f.created[0].paused, false);
  audio.currentTime = 12; await audio.emit('seeking'); assert.equal(f.created[0].currentTime, 2);
  await audio.emit('loadstart'); assert.equal(f.created[0].currentTime, 0); assert.equal(f.created[0].paused, true);
  await audio.emit('playing');
  await f.created[0].emit('ended'); assert.equal(api.getState().currentId, '1');
  f.nodes['vj-loop'].checked = false; await f.nodes['vj-loop'].emit('change');
  assert.equal(api.select('2'), true);
  await f.created.at(-1).emit('ended'); assert.equal(api.getState().enabled, false);
  assert.match(f.nodes['vj-status'].textContent, /finished/);
  await f.nodes['vj-clear'].emit('click'); assert.equal(api.getState().items.length, 0);
});

test('temporary sequence validates atomically, preserves the pool and resets', async () => {
  const f = renderer(), api = f.window.vjStudio;
  assert.equal(api.setSequence(null), true);
  await choose(f);
  assert.equal(api.setSequence(['2', '0']), true);
  assert.deepEqual(Array.from(api.getState().sequence), ['2', '0']);
  assert.equal(api.getState().items.length, 3);
  assert.equal(api.getState().currentId, '0');
  assert.equal(api.select('1'), false);
  assert.throws(() => api.setSequence(['2', '2']), /Invalid VJ sequence/);
  assert.throws(() => api.setSequence(['bogus']), /Invalid VJ sequence/);
  assert.throws(() => api.setSequence([]), /Invalid VJ sequence/);
  assert.deepEqual(Array.from(api.getState().sequence), ['2', '0']);
  assert.equal(api.next(), true);
  assert.equal(api.getState().currentId, '2');
  assert.equal(api.setSequence(null), true);
  assert.deepEqual(Array.from(api.getState().sequence), ['0', '1', '2']);
  assert.equal(api.getState().currentId, '2');
  assert.equal(api.select('1'), true);
});

test('subscriptions are removable and stale playback cancellations are not reported as codec errors', async () => {
  const f = renderer(), api = f.window.vjStudio;
  let updates = 0;
  const unsubscribe = api.subscribe(() => updates++);
  await choose(f);
  assert.equal(updates, 1);
  unsubscribe();
  await toggle(f);
  assert.equal(updates, 1);
  let rejectPlay;
  f.created[0].play = () => new Promise((_resolve, reject) => { rejectPlay = reject; });
  await f.nodes['audio-element'].emit('playing');
  await f.nodes['audio-element'].emit('pause');
  rejectPlay(Object.assign(new Error('interrupted'), { name: 'AbortError' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.doesNotMatch(f.nodes['vj-status'].textContent, /playback failed/);
});

test('multi-pane frames are composited with live and optional bounded envelope bands', async () => {
  const f = renderer(), api = f.window.vjStudio;
  await choose(f); await toggle(f); await f.nodes['audio-element'].emit('playing');
  f.nodes['vj-layout'].value = '3'; await f.nodes['vj-layout'].emit('change');
  const current = f.created.slice(-3);
  assert.deepEqual(current.map(v => v.src), f.items.map(item => item.url));
  assert.ok(current.every(v => v.muted && !v.paused));
  assert.deepEqual(current.map(v => v.loop), [false, true, true]);
  const draws = [], ctx = { save() {}, restore() {}, drawImage(...args) { draws.push(args); } };
  f.nodes['audio-element'].currentTime = 1.25;
  let input;
  api.setEnvelopeProvider(value => { input = value; return { bass: 2, snare: NaN, hihat: 0.5 }; });
  api.draw(ctx, 900, 600, { bass: 0.2, snare: 0.3, hihat: 0.4 });
  assert.equal(input.timeMs, 1250);
  assert.equal(input.bass, 0.2); assert.equal(input.snare, 0.3); assert.equal(input.hihat, 0.4);
  assert.equal(ctx.filter, 'brightness(1.216) saturate(1.125)');
  assert.equal(ctx.globalAlpha, 0.7);
  assert.equal(draws.length, 3);
  assert.deepEqual(draws.map(args => args.slice(5)), [[0, 0, 300, 600], [300, 0, 300, 600], [600, 0, 300, 600]]);
  assert.equal(api.getState().envelopeProviderActive, true);
  api.setEnvelopeProvider(() => { throw new Error('bad envelope'); });
  api.draw(ctx, 900, 600, { bass: 0, snare: 0, hihat: 0 });
  assert.equal(ctx.filter, 'brightness(1) saturate(1)');
  api.setEnvelopeProvider(null); assert.equal(api.getState().envelopeProviderActive, false);
  assert.throws(() => api.setEnvelopeProvider({}), /provider/);
});

test('changing layout preserves existing video elements, positions and playback state', async () => {
  const f = renderer(), audio = f.nodes['audio-element'];
  await choose(f); await toggle(f); await audio.emit('playing');
  const primary = f.created[0];
  primary.currentTime = 6;
  f.nodes['vj-layout'].value = '3'; await f.nodes['vj-layout'].emit('change');
  assert.equal(f.created.length, 3);
  assert.equal(primary.currentTime, 6);
  assert.equal(primary.paused, false);
  const second = f.created[1];
  second.currentTime = 3;
  await audio.emit('pause');
  f.nodes['vj-layout'].value = '2'; await f.nodes['vj-layout'].emit('change');
  assert.equal(primary.currentTime, 6);
  assert.equal(second.currentTime, 3);
  assert.equal(primary.paused, true);
  assert.equal(second.paused, true);
  await audio.emit('playing');
  assert.equal(primary.paused, false);
  assert.equal(second.paused, false);
  assert.equal(f.window.vjStudio.getState().currentId, '0');
});

test('invalid envelopes warn once and publish bounded effective bands to followers', async () => {
  const warnings = [], sent = [];
  const f = renderer({ logger: { warn: (...args) => warnings.push(args), error() {} } });
  f.window.api.vjSyncState = value => { sent.push(value); return Promise.resolve(); };
  await choose(f); await toggle(f); await f.nodes['audio-element'].emit('playing');
  const api = f.window.vjStudio;
  const ctx = { save() {}, restore() {}, drawImage() {} };
  api.setEnvelopeProvider(() => ({ bass: 9, snare: NaN, hihat: 0.6 }));
  api.draw(ctx, 100, 100, { bass: 0.1, snare: 0.2, hihat: 0.3 });
  api.draw(ctx, 100, 100, { bass: 0.1, snare: 0.2, hihat: 0.3 });
  await f.nodes['audio-element'].emit('waiting');
  assert.equal(warnings.length, 1);
  assert.equal(sent.at(-1).bands.bass, 1);
  assert.equal(sent.at(-1).bands.snare, 0.2);
  assert.equal(sent.at(-1).bands.hihat, 0.6);
  assert.equal('items' in sent.at(-1), false);
  api.setEnvelopeProvider(() => { throw new Error('bad data'); });
  api.draw(ctx, 100, 100, { bass: 0.1, snare: 0.2, hihat: 0.3 });
  api.draw(ctx, 100, 100, { bass: 0.1, snare: 0.2, hihat: 0.3 });
  assert.equal(warnings.length, 2);
  assert.match(f.nodes['vj-status'].textContent, /envelope error/i);
});

test('microphone-only recording drives muted video independently of the idle audio element', async () => {
  const f = renderer(); await choose(f); await toggle(f);
  const video = f.created[0];
  assert.equal(video.paused, true);
  f.window.vjStudio.setMicrophoneRecording(true);
  assert.equal(video.paused, false);
  let time;
  f.window.vjStudio.setEnvelopeProvider(frame => { time = frame.timeMs; return {}; });
  f.setNow(600);
  f.window.vjStudio.draw({ save() {}, restore() {}, drawImage() {} }, 100, 100);
  assert.equal(time, 500);
  f.window.vjStudio.setMicrophoneRecording(false);
  assert.equal(video.paused, true);
});

test('export and preview share the VJ composition before text overlays', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  assert.match(app, /canvas\.captureStream\(exportFps\)/);
  assert.match(app, /window\.vjStudio\?\.draw\(ctx, canvasWidth, canvasHeight, \{bass, snare:mid, hihat:treble\}\);[\s\S]*?drawTextOverlays\(bass\)/);
});
