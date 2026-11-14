import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const dash = readFileSync(new URL('../dashboard/index.html', import.meta.url), 'utf8');
const mirror = readFileSync(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

test('Dashboard and public mirror remain byte-identical', () => {
  assert.equal(dash, mirror);
});

test('HUD diagnostics only render HTTP information and never change functional LED health', () => {
  const start = dash.indexOf('<script id="dashboard-hud-endpoint-runtime">');
  const end = dash.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start);
  const diagnostics = dash.slice(start, end);
  assert.match(diagnostics, /const response=await fetch\(path/);
  assert.match(diagnostics, /httpStatus='HTTP '\+response\.status/);
  assert.match(diagnostics, /rawResponse=displayed/);
  assert.doesNotMatch(diagnostics, /button\.dataset\.health\s*=/);
  assert.doesNotMatch(diagnostics, /mark\('/);
});

test('SB LED only indicates genuine observed buffering; source and stream LEDs use active MiniPlayer', () => {
  assert.match(dash, /mark\('SB',state\.waiting\?'pending':'off'/);
  assert.doesNotMatch(dash, /mark\('SB',state\.waiting\?'pending':state\.playing\?'ok'/);
  assert.match(dash, /mark\('STR',state\.error\?'error':state\.waiting/);
  assert.match(dash, /state\.source === route && playing && state\.watchdogStatus === 'healthy'/);
});

test('MET diagnostic copy control and dialog remain present', () => {
  assert.match(dash, /id="hudCopy"/);
  assert.match(dash, /id="hudCopyStatus"/);
  assert.match(dash, /id="hudModal"/);
});

function bootStatusDashboard(fetch, player) {
  const script = dash.match(/<script id="dash-real-status-v4">([\s\S]*?)<\/script>/)[1];
  const fields = { stPeak: {}, stLimit: {}, goveeHudModal: { querySelector: () => ({}), querySelectorAll: () => [], addEventListener() {} }, goveeDevices: { addEventListener() {} } };
  const listeners = new Map();
  const timers = [];
  const hud = Object.fromEntries(['STR', 'MTR', 'WRK', 'MET', 'M', 'B'].map(label => [
    label, { lastElementChild: { textContent: label }, dataset: {} }
  ]));
  const controls = Object.fromEntries(['main','backup'].map(route => [route, {
    addEventListener(_event, handler) { this.click = handler; }
  }]));
  const frame = player && { contentWindow: { S666EmbedControl: player }, addEventListener() {} };
  runInNewContext(script, {
    document: {
      hidden: false,
      getElementById: id => id === 'dashboardMiniPlayer' ? frame : fields[id] ?? null,
      querySelector: selector => controls[selector.match(/data-hud-action="(main|backup)"/)?.[1]] ?? null,
      querySelectorAll: () => Object.values(hud),
      addEventListener: (event, handler) => listeners.set(event, handler)
    },
    fetch, AbortController, setTimeout, clearTimeout,
    setInterval(handler, delay) { timers.push({ handler, delay }); }
  });
  return { fields, hud, timers, controls, refresh: listeners.get('visibilitychange') };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function miniPlayerRuntime() {
  const mini = readFileSync(new URL('../public/embed/miniplayer.html', import.meta.url), 'utf8');
  const meter = mini.slice(mini.indexOf('let audioContext,analyser,'), mini.indexOf('function enableVisualizer'));
  const routeState = mini.slice(mini.indexOf('function mediaRouteIndex'), mini.indexOf('function label(message)'));
  const api = mini.slice(mini.indexOf('window.S666EmbedControl=Object.freeze('), mini.indexOf('// 666STREAM WEBRADIO metadata repair'));
  const window = {};
  const audio = {
    paused: true, muted: false, ended: false, readyState: 0, src: '', currentSrc: '',
    pause() { this.paused = true; },
    load() { this.currentSrc = ''; this.readyState = 0; }
  };
  let now = 100;
  const runtime = runInNewContext(`
    let wanted=false,audioWaiting=false,retrying=false,audioFault=false,sourceIndex=0;
    let watchdogStatus='idle',watchdogLastEventAt=0,watchdogProgressAt=0;
    const sources = ['/stream', '/fallback-stream', '/emergency'];
    const label = () => {}, state = () => {};
    const play = async () => { wanted = true; };
    ${meter}
    ${routeState}
    ${api}
    ({
      sample(peak) {
        audioContext = { state: 'running' };
        visualActive = true;
        frequencyData = new Uint8Array(1);
        analyser = { getByteFrequencyData(data) { data[0] = peak; } };
        visualizer();
      }
    })
  `, { window, audio, bars: [], document: { hidden: false },
    performance: { now: () => now }, requestAnimationFrame() {} });
  return { ...runtime, api: window.S666EmbedControl, audio, advance: ms => { now += ms; } };
}

const statusResponses = async path => Response.json(path === '/api/shoutcast/stats'
  ? { ok: true, peaklisteners: 125, maxlisteners: 500 }
  : { ok: true, title: 'Track' });

test('Dashboard cold start uses the real MiniPlayer state and loads the server stats', async () => {
  const mini = miniPlayerRuntime();
  const { fields, hud, timers } = bootStatusDashboard(statusResponses, mini.api);
  await settle();
  assert.equal(hud.STR.dataset.health, 'off');
  assert.equal(hud.WRK.dataset.health, 'ok');
  assert.equal(fields.stPeak.textContent, '125');
  assert.equal(fields.stLimit.textContent, '500');
  assert.deepEqual(timers.map(timer => timer.delay), [750, 20000]);
  assert.equal(mini.api.getState().lastGenuineMeterAt, 0);
});

test('A failing MiniPlayer snapshot leaves server status running and can recover on the next poll', async () => {
  const mini = miniPlayerRuntime();
  let fail = true;
  const player = { getState() {
    if (fail) throw new Error('Embedded player status failed');
    return mini.api.getState();
  } };
  const { fields, hud, timers } = bootStatusDashboard(statusResponses, player);
  await settle();
  assert.equal(hud.STR.dataset.health, 'error');
  assert.equal(hud.MET.dataset.health, 'ok');
  assert.equal(fields.stPeak.textContent, '125');
  fail = false;
  timers.find(timer => timer.delay === 750).handler();
  assert.equal(hud.STR.dataset.health, 'off');
});

test('MiniPlayer records only a genuine unmuted reading and expires its meter availability', () => {
  const mini = miniPlayerRuntime();
  Object.assign(mini.audio, { paused: false, readyState: 4 });
  mini.sample(0);
  assert.equal(mini.api.getState().lastGenuineMeterAt, 0);
  assert.equal(mini.api.getState().meterAvailable, false);
  mini.audio.muted = true;
  mini.sample(25);
  assert.equal(mini.api.getState().lastGenuineMeterAt, 0);
  mini.audio.muted = false;
  assert.equal(mini.api.getState().meterAvailable, false);
  mini.sample(25);
  assert.equal(mini.api.getState().lastGenuineMeterAt, 100);
  assert.equal(mini.api.getState().meterAvailable, true);
  mini.advance(2200);
  assert.equal(mini.api.getState().meterAvailable, false);
  mini.sample(0);
  assert.equal(mini.api.getState().lastGenuineMeterAt, 100);
});

test('Recovery changing the media route cannot leave the backup selection stuck', async () => {
  const mini = miniPlayerRuntime();
  assert.equal((await mini.api.switchStream('backup')).source, 'backup');
  assert.equal(mini.audio.paused, true);

  Object.assign(mini.audio, { src: '/stream', currentSrc: '/stream', paused: false, readyState: 4 });
  assert.equal(mini.api.getState().source, 'main');
  await mini.api.switchStream('backup');
  assert.equal(mini.audio.src, '/fallback-stream');
});

test('Playback reports an unknown route rather than inheriting the selected route', () => {
  const mini = miniPlayerRuntime();
  Object.assign(mini.audio, { src: '/other', currentSrc: '/other', paused: false, readyState: 4 });
  assert.equal(mini.api.getState().source, 'unknown');
});

test('Source buttons report selection, confirmed playback and a failed switch distinctly', async () => {
  const state = { source: 'main', wanted: false, playing: false, watchdogStatus: 'idle' };
  let rejectSwitch;
  const player = {
    getState: () => state,
    switchStream: () => new Promise((_resolve, reject) => { rejectSwitch = reject; })
  };
  const { hud, controls, timers } = bootStatusDashboard(statusResponses, player);
  assert.equal(hud.M.dataset.health, 'off');
  assert.match(hud.M.title, /gewählt/);
  const tick = timers.find(timer => timer.delay === 750).handler;
  Object.assign(state, { wanted: true, playing: true, watchdogStatus: 'buffering' });
  tick();
  assert.equal(hud.M.dataset.health, 'pending');
  state.watchdogStatus = 'healthy';
  tick();
  assert.equal(hud.M.dataset.health, 'ok');
  const switching = controls.backup.click();
  tick();
  assert.equal(hud.B.dataset.health, 'pending');
  assert.equal(controls.main.disabled, true);
  rejectSwitch(new Error('Play failed'));
  await switching;
  tick();
  assert.equal(hud.B.dataset.health, 'error');
  assert.equal(controls.main.disabled, false);
  state.source = 'backup';
  tick();
  assert.equal(hud.B.dataset.health, 'ok');
  assert.equal(hud.M.dataset.health, 'off');
});
