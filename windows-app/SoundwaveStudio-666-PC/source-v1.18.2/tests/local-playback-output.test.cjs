'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const app = readFileSync(join(__dirname, '../src/app.js'), 'utf8');
const code = (start, end) => {
  const first = app.indexOf(start);
  const last = app.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first);
  return app.slice(first, last);
};

function player({ local = true } = {}) {
  const audio = new EventTarget();
  const empty = { count: 0 };
  const track = { count: 1, index: 0, current: 'Track', mediaUrl: 'swmedia://audio/current' };
  let playCalls = 0;
  let playing = false;
  let readiness;
  let timeout;
  let paused = 0;
  const waiting = new Promise(resolve => { readiness = resolve; });
  const listen = audio.addEventListener.bind(audio);
  audio.addEventListener = (name, listener, options) => {
    listen(name, listener, options);
    if (name === 'error') readiness();
  };
  Object.assign(audio, {
    src: local ? '' : 'https://example.test/radio',
    volume: 1,
    readyState: 0,
    load() {},
    pause() { paused++; },
    removeAttribute() { this.src = ''; },
    async play() { playCalls++; }
  });
  const context = {
    AbortController, audioElement: audio, localTransition: null, localTransitionGeneration: 0,
    localQueueClearing: false, localQueueSnapshot: track, isPlaying: false,
    volumeSlider: { value: 0.6 }, localSettings: { crossfade: 1 },
    diagStatus: {}, diagStatusColor: { style: {} },
    document: { body: { classList: { contains: () => local } } },
    localClear: { addEventListener(_name, fn) { this.click = fn; } },
    window: { api: { localQueueActivate: async () => track, localQueueClear: async () => empty } },
    setTimeout(fn) { timeout = fn; return 1; },
    clearTimeout() { timeout = undefined; },
    renderLocalQueue(state) { context.localQueueSnapshot = state; },
    enableLocalPlayer() {},
    ensureAudioContext() {},
    setPlayerUiPlaying(value) { playing = value; }
  };
  runInNewContext(
    code('function waitForLocalCanPlay(', 'function nextLocalIndex(')
      + code("  localClear?.addEventListener", '  localShuffleMode?.'),
    context
  );
  return { audio, context, waiting, get playCalls() { return playCalls; },
    get paused() { return paused; }, get playing() { return playing; }, timeout: () => timeout() };
}

for (const failure of ['error', 'timeout']) {
  test('B-01: ' + failure + ' beendet den Titelstart und meldet den Grund', async () => {
    const fixture = player();
    const pending = fixture.context.activateLocalQueueIndex(0, { fade: false });
    await fixture.waiting;
    if (failure === 'error') fixture.audio.dispatchEvent(new Event('error'));
    else fixture.timeout();
    await pending;
    assert.equal(fixture.playCalls, 0);
    assert.equal(fixture.playing, false);
    assert.equal(fixture.audio.volume, 0.6);
    assert.match(fixture.context.diagStatus.textContent, /Local Audio Error/);
  });
}

test('B-02: Queue leeren bricht wartende Wiedergabe ab', async () => {
  const fixture = player();
  const pending = fixture.context.activateLocalQueueIndex(0, { fade: false });
  await fixture.waiting;
  await fixture.context.localClear.click();
  fixture.audio.dispatchEvent(new Event('canplay'));
  await pending;
  assert.equal(fixture.audio.src, '');
  assert.equal(fixture.playCalls, 0);
  assert.equal(fixture.context.localQueueSnapshot.count, 0);
});

test('B-02: Quellenwechsel verwirft die wartende lokale Wiedergabe', async () => {
  const fixture = player();
  const pending = fixture.context.activateLocalQueueIndex(0, { fade: false });
  await fixture.waiting;
  fixture.context.cancelLocalTransition();
  fixture.audio.src = 'https://example.test/radio';
  fixture.audio.dispatchEvent(new Event('canplay'));
  await pending;
  assert.equal(fixture.audio.src, 'https://example.test/radio');
  assert.equal(fixture.playCalls, 0);
  assert.equal(fixture.playing, false);
});

test('B-02: lokale Queue leeren unterbricht Radio nicht', async () => {
  const fixture = player({ local: false });
  await fixture.context.localClear.click();
  assert.equal(fixture.audio.src, 'https://example.test/radio');
  assert.equal(fixture.paused, 0);
});

test('B-02: regulärer Titelstart wartet auf canplay', async () => {
  const fixture = player();
  const pending = fixture.context.activateLocalQueueIndex(0, { fade: false });
  await fixture.waiting;
  assert.equal(fixture.playCalls, 0);
  fixture.audio.dispatchEvent(new Event('canplay'));
  await pending;
  assert.equal(fixture.playCalls, 1);
  assert.equal(fixture.playing, true);
});

test('B-03: Zweitausgabe verwendet frische Frames und setzt LEDs bei Signalverlust zurück', () => {
  let now = 0;
  const levels = {};
  let renders = 0;
  const context = {
    EXTERNAL_FRAME_MAX_AGE_MS: 1000, externalAnalyserFrame: { receivedAt: 0 },
    performance: { now: () => now }, analyserNode: null,
    dataArray: new Uint8Array(128).fill(200), timeDataArray: new Uint8Array(256).fill(128),
    bufferLength: 128, isRecording: false,
    document: {
      getElementById: id => ({ style: { setProperty(_name, value) { levels[id] = value; } } }),
      querySelector: () => ({ style: {} }), body: { classList: { contains: () => true } }
    },
    diagBass: {}, diagBpm: {}, drawBackground() {}, canvasWidth: 1, canvasHeight: 1,
    posXOffset: 0, posYOffset: 0, scaleFactor: 1, activeStyle: 'test',
    ctx: { save() {}, restore() {}, translate() {}, scale() {} },
    window: {}, drawVisualizer() { renders++; }, drawTextOverlays() {},
    drawDummyWave() { assert.fail('synthetic signal on second output'); }
  };
  runInNewContext(code('function drawFrame()', '// Background Drawing'), context);
  context.drawFrame();
  assert.equal(renders, 1);
  assert.ok(Number(levels['rw-led-low']) > 0);
  now = 1001;
  context.drawFrame();
  assert.equal(renders, 1);
  assert.deepEqual(Object.values(levels), ['0', '0', '0']);
  context.externalAnalyserFrame = { receivedAt: now };
  context.drawFrame();
  assert.equal(renders, 2);
});
