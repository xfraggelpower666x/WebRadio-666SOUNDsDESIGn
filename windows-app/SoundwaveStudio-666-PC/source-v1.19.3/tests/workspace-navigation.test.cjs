'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

test('dock toggles an inline overlay and closes a detached overlay', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/workspace.js'), 'utf8');
  const start = source.indexOf('  function openWindow(');
  const end = source.indexOf('  function controlsSnapshot(', start);
  assert.ok(start >= 0 && end > start);
  const classes = new Set(['rw-window-closed']);
  const win = { classList: {
    contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key)
  } };
  const detached = new Set();
  const closed = [];
  const context = {
    windows: new Map([['wave', win]]), detached,
    window: { api: { closeDetachedOverlay: async key => { closed.push(key); return { ok: true }; } } },
    bringToFront() {}, clampWindow() {}, saveWorkspace() {}, console
  };
  runInNewContext(source.slice(start, end), context);
  await context.toggleWindow('wave');
  assert.equal(classes.has('rw-window-closed'), false);
  await context.toggleWindow('wave');
  assert.equal(classes.has('rw-window-closed'), true);
  detached.add('wave');
  await context.toggleWindow('wave');
  assert.deepEqual(closed, ['wave']);
});

test('detached detail sections forward and retain their open state', async () => {
  const overlay = fs.readFileSync(path.join(__dirname, '../src/overlay-window.js'), 'utf8');
  const listeners = {}, actions = [];
  let init;
  const root = { addEventListener: (type, fn) => { listeners[type] = fn; }, innerHTML: '' };
  runInNewContext(overlay, {
    document: { getElementById: id => id === 'overlay-root' ? root : null },
    window: { addEventListener() {}, rwOverlay: {
      onInit: callback => { init = callback; }, onSync() {},
      action: async payload => { actions.push(payload); }, ready: async () => ({})
    } },
    console
  });
  init({ key: 'radioAdmin', html: '', controls: [] });
  listeners.toggle({ target: { id: 'rw-radio-discord', open: true, matches: selector => selector === 'details' } });
  assert.equal(actions[0].kind, 'toggle');
  assert.equal(actions[0].checked, true);

  const workspace = fs.readFileSync(path.join(__dirname, '../src/workspace.js'), 'utf8');
  const start = workspace.indexOf('  window.api?.onDetachedOverlayAction?.(');
  const end = workspace.indexOf('  window.api?.onDetachedOverlayClosed?.(', start);
  assert.ok(start >= 0 && end > start);
  let receive, writes = 0, isOpen = false;
  const details = {
    tagName: 'DETAILS', matches: selector => selector === 'details',
    get open() { return isOpen; },
    set open(value) { writes++; isOpen = value; }
  };
  runInNewContext(workspace.slice(start, end), {
    window: { api: { onDetachedOverlayAction: callback => { receive = callback; } } },
    windows: new Map([['radioAdmin', { contains: el => el === details }]]),
    document: { getElementById: () => details }
  });
  receive(actions[0]);
  receive(actions[0]);
  assert.equal(isOpen, true);
  assert.equal(writes, 1, 'replayed snapshots must not create toggle loops');
  assert.match(workspace, /attributeFilter:\[[^\]]*'open'/);

  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const routeStart = main.indexOf("registerIpc('workspace:overlay-action'");
  const routeEnd = main.indexOf("registerIpc('display:list'", routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const routes = {}, sent = [];
  runInNewContext(main.slice(routeStart, routeEnd), {
    registerIpc: (name, _role, handler) => { routes[name] = handler; },
    mainWindow: { isDestroyed: () => false, webContents: { send: (...args) => sent.push(args) } },
    DETACHED_OVERLAY_KEYS: new Set(['radioAdmin'])
  });
  routes['workspace:overlay-action']({}, actions[0]);
  assert.equal(sent[0][1].checked, true);
  assert.throws(() => routes['workspace:overlay-action']({}, { key: 'radioAdmin', kind: 'toggle', selector: '[data-source="x"]' }), /overlay_control_invalid/);
});

test('main process opens only explicitly approved websites', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const listStart = source.indexOf('const approvedWebsites =');
  const listEnd = source.indexOf('});', listStart) + 3;
  const routeStart = source.indexOf("registerIpc('app:open-site'");
  const routeEnd = source.indexOf("registerIpc('workspace:overlay-sync'", routeStart);
  assert.ok(listStart >= 0 && listEnd > listStart && routeStart >= 0 && routeEnd > routeStart);
  const opened = [], handlers = {};
  const context = {
    registerIpc: (name, _roles, handler) => { handlers[name] = handler; },
    shell: { openExternal: async url => opened.push(url) }
  };
  runInNewContext(source.slice(listStart, listEnd) + source.slice(routeStart, routeEnd), context);
  const expected = {
    radio: 'https://webradio.666soundsdesign-broadcaster.com/',
    lyvra: 'https://weblyvra.666soundsdesign-broadcaster.com/',
    neon: 'https://dashboard.666soundsdesign-broadcaster.com/',
    liveDashboard: 'https://webradio.666soundsdesign-broadcaster.com/dashboard',
    psyEngine: 'https://weblyvra.666soundsdesign-broadcaster.com/psy-engine/'
  };
  for (const [key, url] of Object.entries(expected)) {
    await handlers['app:open-site']({}, key);
    assert.equal(opened.at(-1), url);
  }
  await assert.rejects(handlers['app:open-site']({}, '__proto__'), /website_not_allowed/);
  await assert.rejects(handlers['app:open-site']({}, 'https://example.test/'), /website_not_allowed/);
  assert.equal(opened.length, 5);
});

test('restored detached windows fit on their current monitor', () => {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = source.indexOf('function overlayBoundsFor(');
  const end = source.indexOf('function saveDetachedOverlayWindow(', start);
  assert.ok(start >= 0 && end > start);
  const display = { workArea: { x: 1920, y: 0, width: 1280, height: 720 } };
  const context = {
    readOverlayState: () => ({ windows: { wave: { x: 3000, y: 650, width: 900, height: 700 } } }),
    screen: { getAllDisplays: () => [display], getDisplayMatching: () => display },
    mainWindow: null
  };
  runInNewContext(source.slice(start, end), context);
  const bounds = context.overlayBoundsFor('wave');
  assert.equal(bounds.width, 900);
  assert.equal(bounds.height, 700);
  assert.equal(bounds.x, 2300);
  assert.equal(bounds.y, 20);
});

test('disconnecting a monitor recovers detached windows without moving visible ones', () => {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = source.indexOf('function reconcileDetachedWindows()');
  const end = source.indexOf('function emitMainWindowMetrics(', start);
  assert.ok(start >= 0 && end > start);
  const moved = [];
  const makeWindow = (key, bounds) => ({
    isDestroyed: () => false, getBounds: () => bounds, setBounds: value => moved.push({ key, value })
  });
  const visible = makeWindow('wave', { x: 100, y: 100, width: 400, height: 300 });
  const lost = makeWindow('source', { x: 2000, y: 100, width: 400, height: 300 });
  const hiddenHeader = makeWindow('text', { x: 100, y: -500, width: 400, height: 600 });
  const visual = makeWindow('visualizer', { x: 2000, y: 100, width: 900, height: 600 });
  const context = {
    screen: { getAllDisplays: () => [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }] },
    detachedOverlayWindows: new Map([['wave', visible], ['source', lost], ['text', hiddenHeader]]),
    detachedVisualizerWindow: visual,
    overlayBoundsFor: key => ({ x: 10, y: 10, width: key === 'visualizerNative' ? 900 : 400, height: 300 })
  };
  runInNewContext(source.slice(start, end), context);
  context.reconcileDetachedWindows();
  assert.deepEqual(moved.map(x => x.key), ['source', 'text', 'visualizer']);
});
