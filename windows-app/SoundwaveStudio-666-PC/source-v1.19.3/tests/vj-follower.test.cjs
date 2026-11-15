'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validateVjState } = require('../src/shared/vj-sync.cjs');

const ids = ['a'.repeat(32), 'b'.repeat(32), 'c'.repeat(32)];
const snapshot = () => ({
  sequence: ids.slice(), currentId: ids[0], enabled: true, layout: 2, opacity: 0.6,
  loop: true, playing: true, positions: [2, 4], bands: { bass: 0.2, snare: 0.3, hihat: 0.4 }
});

test('follower IPC validates approved IDs, bounds, types and strips unrelated data', () => {
  const allowed = id => ids.includes(id);
  const valid = { ...snapshot(), path: 'C:\\private', nested: { path: 'secret' } };
  assert.deepEqual(validateVjState(valid, allowed), snapshot());
  for (const bad of [
    { ...snapshot(), sequence: ['f'.repeat(32)] },
    { ...snapshot(), sequence: [ids[0], ids[0]] },
    { ...snapshot(), sequence: Array(101).fill(ids[0]) },
    { ...snapshot(), currentId: ids[2], sequence: [ids[0]] },
    { ...snapshot(), opacity: Infinity }, { ...snapshot(), opacity: -0.01 },
    { ...snapshot(), layout: 4 }, { ...snapshot(), playing: 'true' },
    { ...snapshot(), positions: [NaN, 0] }, { ...snapshot(), positions: [0] },
    { ...snapshot(), bands: { bass: 1, snare: 0, hihat: 2 } }
  ]) assert.throws(() => validateVjState(bad, allowed), /vj_state_invalid/);
});

test('only the main window can publish and only a follower can read VJ state', async () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const roles = main.slice(main.indexOf('function senderRole('), main.indexOf('\n\nfunction radioUrl('));
  const handlersSource = main.slice(main.indexOf("registerIpc('vj:sync'"), main.indexOf("registerIpc('display:heartbeat'"));
  const handlers = {}, sent = [];
  const context = {
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    mainWindow: { isDestroyed: () => false, webContents: { id: 1 } }, introWindow: null,
    outputWindows: new Map([[2, { isDestroyed: () => false, webContents: { id: 2 } }]]),
    detachedVisualizerWindow: null, detachedOverlayWindows: new Map(),
    validateVjState, vjFiles: { has: id => ids.includes(id) },
    broadcastVjState: state => sent.push(state), vjFollowerState: { state: snapshot() }
  };
  vm.runInNewContext(roles + handlersSource, context);
  const event = id => ({ sender: { id, isDestroyed: () => false } });
  await assert.rejects(handlers['vj:sync'](event(2), snapshot()), /ipc_sender_blocked/);
  await assert.rejects(handlers['vj:state'](event(1)), /ipc_sender_blocked/);
  await assert.rejects(handlers['vj:sync'](event(1), { ...snapshot(), sequence: ['f'.repeat(32)] }), /vj_state_invalid/);
  await handlers['vj:sync'](event(1), snapshot());
  assert.equal(sent.length, 1);
  assert.equal((await handlers['vj:state'](event(2))).state.currentId, ids[0]);
});

function follower() {
  let handler, initialResolve, timer, now = 10000;
  const created = [];
  class Element {
    constructor() {
      this.events = {}; this.paused = true; this.currentTime = 0; this.duration = 20;
      this.readyState = 2; this.videoWidth = 100; this.videoHeight = 100;
      this.classList = { add: () => { this.hidden = true; }, remove: () => { this.hidden = false; } };
    }
    addEventListener(type, fn) { this.events[type] = fn; }
    setAttribute() {}
    removeAttribute(key) { delete this[key]; }
    pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    load() {}
  }
  const document = { body: { appendChild() {} }, createElement(tag) { const e = new Element(); if (tag === 'video') created.push(e); return e; } };
  const api = {
    onVjFollowerState: fn => { handler = fn; },
    vjFollowerState: () => new Promise(resolve => { initialResolve = resolve; })
  };
  const window = { api };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'vj-follower.js'), 'utf8'), {
    window, document, location: { search: '?output=1' }, URLSearchParams, console,
    Date: { now: () => now }, setInterval: fn => { timer = fn; }
  });
  return { window, created, send: message => handler(message), initial: message => initialResolve(message),
    setNow: value => { now = value; }, tick: () => timer() };
}

test('followers render approved panes, correct drift, pause and ignore out-of-order state', async () => {
  const f = follower();
  f.send({ revision: 2, at: 10000, state: snapshot() });
  assert.equal(f.created.length, 2);
  assert.ok(f.created.every(v => v.muted && v.defaultMuted && !v.paused));
  assert.equal(f.created[0].src, `swvj://video/${ids[0]}`);
  assert.equal(f.created[0].currentTime, 2);
  assert.equal(f.created[1].currentTime, 4);
  f.initial({ revision: 1, at: 10000, state: { ...snapshot(), currentId: ids[1] } });
  await Promise.resolve();
  assert.equal(f.created.length, 2);
  f.setNow(11000);
  f.send({ revision: 3, at: 10500, state: { ...snapshot(), positions: [5, 6] } });
  assert.equal(f.created[0].currentTime, 5.5);
  assert.equal(f.created[1].currentTime, 6.5);
  const draws = [], ctx = { save() {}, restore() {}, drawImage(...args) { draws.push(args); } };
  f.window.vjStudio.draw(ctx, 200, 100);
  assert.equal(draws.length, 2);
  assert.equal(ctx.globalAlpha, 0.6);
  assert.equal(ctx.filter, 'brightness(1.072) saturate(1.1)');
  f.send({ revision: 4, at: 11000, state: { ...snapshot(), playing: false, positions: [8, 9] } });
  assert.ok(f.created.slice(0, 2).every(v => v.paused));
  assert.equal(f.created[0].currentTime, 8);
  f.send({ revision: 5, at: 11000, state: { ...snapshot(), sequence: [ids[2], ids[0]], currentId: ids[2] } });
  assert.equal(f.created[2].src, `swvj://video/${ids[2]}`);
  assert.equal(f.created[3].src, `swvj://video/${ids[0]}`);
  f.setNow(14000); f.tick();
  assert.ok(f.created.slice(2).every(v => v.paused), 'stale followers stop');
  f.send({ revision: 6, at: 14000, state: null });
  assert.ok(f.created.slice(2).every(v => v.paused && !v.src));
});

test('follower corrects after delayed metadata and handles ended/disabled states', () => {
  const f = follower();
  f.send({ revision: 1, at: 10000, state: { ...snapshot(), enabled: false, playing: false } });
  assert.ok(f.created.every(v => v.paused));
  f.created[0].currentTime = 0;
  f.created[0].events.loadedmetadata();
  assert.equal(f.created[0].currentTime, 2);
  let draws = 0;
  f.window.vjStudio.draw({ save() {}, restore() {}, drawImage() { draws++; } }, 100, 100);
  assert.equal(draws, 0);
});
