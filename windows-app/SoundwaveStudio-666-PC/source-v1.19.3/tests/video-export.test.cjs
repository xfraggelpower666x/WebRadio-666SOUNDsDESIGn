'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Writable } = require('node:stream');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { createSoundCloudPlayback } = require('../src/soundcloud-playback.js');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const slice = (source, start, end) => {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function renderer({ supported = ['video/mp4', 'video/webm'], write, close, play, microphone = false, noMedia = false } = {}) {
  const events = [];
  let recorder;
  const node = () => ({ textContent: '', disabled: false, style: {}, classList: { add() {}, remove() {} }, setAttribute(name, value) { this[name] = value; } });
  class Recorder {
    static isTypeSupported(type) { return supported.some(value => type === value || type.startsWith(value + ';')); }
    constructor(_stream, options) { this.mimeType = options.mimeType; this.options = options; this.state = 'inactive'; recorder = this; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      setImmediate(() => this.onstop());
    }
    chunk(data) { this.ondataavailable({ data }); }
  }
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {}, removeEventListener() {} };
  const audioTrack = { addEventListener() {}, removeEventListener() {} };
  const api = {
    getSavePath: async () => 'C:\\Videos\\music.mp4',
    startFileWrite: async () => ({ success: true }),
    writeFileChunk: write || (async data => { events.push(Buffer.from(data).toString()); return { success: true }; }),
    closeFile: close || (async () => { events.push('close'); return { success: true }; })
  };
  const ctx = {
    window: { api }, MediaRecorder: Recorder, MediaStream: class { addTrack() {} },
    canvas: { captureStream: () => ({ getVideoTracks: () => [track] }) },
    audioDestinationNode: { stream: { getAudioTracks: () => [audioTrack] } },
    audioElement: { src: noMedia ? '' : 'swmedia://audio/current', currentTime: 0, duration: 10, pause() {}, play: play || (async () => {}) },
    audioDeviceController: microphone ? { recordsInput: () => true } : null,
    audioInputRecord: node(), performance: { now: () => 4000 },
    ensureAudioContext() {}, setupProceduralParticles() {}, renderLoop() {}, drawFrame() {},
    setPlayerUiPlaying() {}, formatTime: value => String(value),
    setInterval: () => 1, clearInterval() {}, cancelAnimationFrame() {},
    animationFrameId: null, recordingInterval: null, exportFps: 60,
    mediaRecorder: null, isRecording: false, exportSavePath: null, exportBusy: false, exportSession: null,
    btnBrowseExport: node(), btnExport: node(), btnStopExport: node(),
    exportDestination: node(), exportModalPath: node(), exportModal: node(), exportResult: node(),
    exportModalTitle: node(), exportModalDescription: node(),
    exportProgressBar: node(), exportProgressContainer: node(), exportTimeLabel: node(), exportStatusLabel: node(),
    diagStatus: node(), diagStatusColor: node(), seekSlider: node(), currentTimeLabel: node(), seekProgressFill: node()
  };
  runInNewContext(slice(app, 'async function browseExportDestination()', '// Design style 9:'), ctx);
  return { ctx, api, track, events, get recorder() { return recorder; } };
}

function mainHandlers(fsImpl = fs) {
  const handlers = {};
  let destination;
  let dialogOptions;
  const ipcMain = { handle: (name, fn) => { handlers[name] = fn; } };
  const context = {
    fs: fsImpl, path, require, Buffer, console: { error() {} },
    fileWriteStream: null, approvedSavePath: '', videoWriteState: null,
    mainWindow: { isDestroyed: () => false, webContents: { id: 1 } }, introWindow: null,
    outputWindows: new Map(), detachedVisualizerWindow: null, detachedOverlayWindows: new Map(),
    app: { getPath: () => __dirname },
    dialog: { showSaveDialog: async (_window, options) => { dialogOptions = options; return destination ? { filePath: destination, canceled: false } : { canceled: true }; } },
    ipcMain
  };
  runInNewContext(slice(main, 'function senderRole(', '\n\nfunction radioUrl(')
    + main.slice(main.indexOf('function discardVideoWrite()')), context);
  return { handlers, context, choose(value) { destination = value; }, get dialogOptions() { return dialogOptions; } };
}

test('save dialog offers only supported recording formats and defaults to WebM when MP4 is unavailable', async () => {
  const f = renderer({ supported: ['video/webm'] });
  let offered;
  f.api.getSavePath = async formats => { offered = Array.from(formats); return 'C:\\Videos\\music.webm'; };
  await f.ctx.startRecordingPipeline();
  assert.deepEqual(offered, ['webm']);
  assert.match(f.recorder.mimeType, /^video\/webm/);
  const main = mainHandlers();
  const event = { sender: { id: 1, isDestroyed: () => false } };
  await main.handlers['dialog:getSavePath'](event, ['webm']);
  assert.match(main.dialogOptions.defaultPath, /\.webm$/);
  assert.equal(main.dialogOptions.filters.length, 1);
  assert.equal(main.dialogOptions.filters[0].extensions[0], 'webm');
  await assert.rejects(main.handlers['dialog:getSavePath'](event, ['webm', '../bad']), /video_formats_invalid/);
});

test('no supported format is reported before opening a save dialog', async () => {
  const f = renderer({ supported: [] });
  let opened = false;
  f.api.getSavePath = async () => { opened = true; };
  await f.ctx.startRecordingPipeline();
  assert.equal(opened, false);
  assert.match(f.ctx.exportResult.textContent, /No supported MP4 or WebM/);
});

test('selected audio bitrate is passed to the actual video recorder', async () => {
  const f = renderer();
  f.ctx.document = { getElementById: () => ({ value: '256000' }) };
  await f.ctx.startRecordingPipeline();
  assert.equal(f.recorder.options.audioBitsPerSecond, 256000);
  assert.equal(f.recorder.options.videoBitsPerSecond, 8000000);
});

test('microphone-only video records without trying to play a missing track', async () => {
  let played = false;
  const f = renderer({ microphone: true, noMedia: true, play: async () => { played = true; } });
  await f.ctx.startRecordingPipeline();
  assert.equal(played, false);
  assert.equal(f.ctx.audioInputRecord.disabled, true);
  f.ctx.performance.now = () => 7500;
  f.ctx.updateRecordingHUD();
  assert.equal(f.ctx.exportTimeLabel.textContent, '3.5');
  f.recorder.chunk({ size: 1, arrayBuffer: async () => Uint8Array.of(1).buffer });
  f.ctx.stopRecordingAndSave();
  await tick(); await tick();
  assert.match(f.ctx.exportResult.textContent, /^Saved video:/);
  assert.equal(f.ctx.audioInputRecord.disabled, false);
});

test('recording without a track or opted-in microphone is rejected', async () => {
  const f = renderer({ noMedia: true });
  await f.ctx.startRecordingPipeline();
  assert.match(f.ctx.exportResult.textContent, /Choose an audio track or enable microphone recording/);
  assert.equal(f.recorder, undefined);
});

test('a microphone lost while opening the file aborts the partial video', async () => {
  const writes = [];
  let release;
  const pendingOpen = new Promise(resolve => { release = resolve; });
  const f = renderer({
    microphone: true, noMedia: true,
    write: async data => { writes.push(data.byteLength); return { success: true }; },
    close: async () => ({ success: false, error: 'video_write_aborted' })
  });
  f.api.startFileWrite = () => pendingOpen;
  const pending = f.ctx.startRecordingPipeline();
  await tick();
  f.ctx.audioDeviceController.recordsInput = () => false;
  release({ success: true });
  await pending; await tick();
  assert.deepEqual(writes, [0]);
  assert.match(f.ctx.exportResult.textContent, /Microphone stopped before recording/);
  assert.equal(f.track.stopped, true);
});

test('fatal SoundCloud HLS errors abort exports, including while opening the file', async () => {
  const integration = fs.readFileSync(path.join(root, 'src', 'integration', '666-integration.js'), 'utf8');
  const line = integration.split(/\r?\n/).find(value => value.includes('const soundCloudPlayback=window.createSoundCloudPlayback'));
  assert.ok(line);
  class MockHls {
    static Events = { ERROR: 'error' };
    static isSupported() { return true; }
    on(_event, listener) { this.error = listener; MockHls.current = this; }
    loadSource() {}
    attachMedia() {}
    destroy() {}
  }
  for (const duringOpen of [false, true]) {
    let release;
    const writes = [], status = {};
    const f = renderer({
      write: async data => { writes.push(data.byteLength); return { success: true }; },
      close: async () => ({ success: false, error: 'video_write_aborted' })
    });
    if (duringOpen) f.api.startFileWrite = () => new Promise(resolve => { release = resolve; });
    const pending = f.ctx.startRecordingPipeline();
    await tick();
    const callback = {
      audio: f.ctx.audioElement, mode: 'soundcloud', q: () => status,
      window: { createSoundCloudPlayback, Hls: MockHls },
      rt: { reportPlaybackError: f.ctx.reportPlaybackError }
    };
    runInNewContext(line.replace('const soundCloudPlayback=', 'globalThis.soundCloudPlayback='), callback);
    callback.soundCloudPlayback.load({ playbackKind: 'hls', mediaUrl: 'swsc://audio/current?v=1' });
    MockHls.current.error('error', { fatal: true, details: 'manifestLoadError' });
    if (duringOpen) release({ success: true });
    await pending; await tick(); await tick();
    assert.match(status.textContent, /manifestLoadError/);
    assert.ok(writes.includes(0), 'partial file must be aborted');
    assert.match(f.ctx.exportResult.textContent, /Video not saved:.*manifestLoadError/);
    assert.equal(f.track.stopped, true);
  }
});

test('recorded chunks stay ordered and finalization waits for the last conversion and write', async () => {
  const f = renderer();
  await f.ctx.startRecordingPipeline();
  let release;
  const slow = new Promise(resolve => { release = resolve; });
  f.recorder.chunk({ size: 1, arrayBuffer: () => slow });
  f.recorder.chunk({ size: 1, arrayBuffer: async () => Uint8Array.of(66).buffer });
  f.ctx.stopRecordingAndSave();
  await tick();
  assert.deepEqual(f.events, []);
  release(Uint8Array.of(65).buffer);
  await tick(); await tick();
  assert.deepEqual(f.events, ['A', 'B', 'close']);
  assert.match(f.ctx.exportResult.textContent, /^Saved video:/);
  assert.equal(f.track.stopped, true);
});

test('unsupported extension is rejected without opening a file', async () => {
  const f = renderer({ supported: ['video/webm'] });
  let opens = 0;
  f.api.startFileWrite = async () => { opens++; return { success: true }; };
  await f.ctx.startRecordingPipeline();
  assert.equal(opens, 0);
  assert.match(f.ctx.exportResult.textContent, /Unsupported/);
  f.ctx.exportSavePath = 'C:\\Videos\\music.webm';
  await f.ctx.startRecordingPipeline();
  assert.match(f.recorder.mimeType, /^video\/webm/);
});

test('write and recorder failures abort, never report saved', async () => {
  for (const failure of ['write', 'recorder', 'play']) {
    const calls = [];
    const f = renderer({
      write: async data => {
        calls.push(data.byteLength);
        return data.byteLength && failure === 'write' ? { success: false, error: 'disk full' } : { success: true };
      },
      close: async () => ({ success: false, error: 'video_write_aborted' }),
      play: failure === 'play' ? async () => { throw new Error('play failed'); } : undefined
    });
    await f.ctx.startRecordingPipeline();
    if (failure === 'write') f.recorder.chunk({ size: 1, arrayBuffer: async () => Uint8Array.of(1).buffer });
    if (failure === 'recorder') f.recorder.onerror({ error: new Error('encoder failed') });
    await tick(); await tick();
    assert.ok(calls.includes(0), failure);
    assert.match(f.ctx.exportResult.textContent, /Video not saved:/);
    assert.doesNotMatch(f.ctx.exportResult.textContent, /^Saved video:/);
  }
});

test('close failure and unknown duration are displayed accurately', async () => {
  const f = renderer({ close: async () => ({ success: false, error: 'rename failed' }) });
  await f.ctx.startRecordingPipeline();
  f.ctx.audioElement.duration = Infinity;
  f.ctx.updateRecordingHUD();
  assert.match(f.ctx.exportStatusLabel.textContent, /duration unknown/);
  assert.equal(f.ctx.exportProgressContainer['aria-valuenow'], '0');
  f.recorder.chunk({ size: 1, arrayBuffer: async () => Uint8Array.of(1).buffer });
  f.ctx.stopRecordingAndSave();
  await tick(); await tick();
  assert.match(f.ctx.exportResult.textContent, /Video not saved: rename failed/);
});

test('final data event and oversized blobs are fully written before close', async () => {
  const sizes = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = renderer({
    write: async data => { sizes.push(data.byteLength); if (sizes.length === 2) await gate; return { success: true }; },
    close: async () => { sizes.push('close'); return { success: true }; }
  });
  await f.ctx.startRecordingPipeline();
  f.recorder.stop = function () {
    this.state = 'inactive';
    setImmediate(() => {
      this.chunk({ size: 8 * 1024 * 1024 + 1, arrayBuffer: async () => new ArrayBuffer(8 * 1024 * 1024 + 1) });
      this.onstop();
    });
  };
  f.ctx.stopRecordingAndSave();
  await tick(); await tick();
  assert.deepEqual(sizes, [8 * 1024 * 1024, 1]);
  release();
  await tick();
  assert.deepEqual(sizes, [8 * 1024 * 1024, 1, 'close']);
});

test('unexpected recorder stop does not claim a saved video', async () => {
  const f = renderer({ close: async () => ({ success: false, error: 'video_write_aborted' }) });
  await f.ctx.startRecordingPipeline();
  f.recorder.stop();
  await tick(); await tick();
  assert.match(f.ctx.exportResult.textContent, /stopped unexpectedly/);
});

test('empty recordings, failed conversion and mismatched chunk formats are discarded', async () => {
  for (const kind of ['empty', 'conversion', 'format']) {
    const calls = [];
    const f = renderer({
      write: async data => { calls.push(data.byteLength); return { success: true }; },
      close: async () => ({ success: false, error: 'video_write_aborted' })
    });
    await f.ctx.startRecordingPipeline();
    if (kind === 'conversion') f.recorder.chunk({ size: 1, arrayBuffer: async () => { throw new Error('conversion failed'); } });
    if (kind === 'format') f.recorder.chunk({ size: 1, type: 'video/webm', arrayBuffer: async () => Uint8Array.of(1).buffer });
    f.ctx.stopRecordingAndSave();
    await tick(); await tick();
    assert.deepEqual(calls, [0]);
    assert.match(f.ctx.exportResult.textContent, kind === 'empty' ? /No video data/ : kind === 'conversion' ? /conversion failed/ : /format does not match/);
    assert.equal(f.ctx.exportModalTitle.textContent, 'Video Export Failed');
  }
});

test('real IPC role and dialog approval gate writes; commit replaces only on success', async () => {
  const f = mainHandlers();
  const target = path.join(__dirname, `.video-export-${process.pid}-commit.mp4`);
  const event = { sender: { id: 1, isDestroyed: () => false } };
  const invoke = (name, ...args) => f.handlers[name](event, ...args);
  fs.writeFileSync(target, 'previous');
  try {
    await assert.rejects(f.handlers['dialog:getSavePath']({ sender: { id: 2, isDestroyed: () => false } }), /ipc_sender_blocked/);
    assert.equal((await invoke('file:startWrite', target)).error, 'save_path_not_approved');
    f.choose(target);
    assert.equal(await invoke('dialog:getSavePath'), target);
    assert.equal((await invoke('file:startWrite', target + '.other')).error, 'save_path_not_approved');
    assert.equal((await invoke('file:startWrite', target)).success, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'previous');
    assert.equal((await invoke('file:writeChunk', Buffer.from('new'))).success, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'previous');
    assert.equal((await invoke('file:close')).success, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'new');
    assert.equal((await invoke('file:startWrite', target)).error, 'save_path_not_approved');
  } finally { fs.rmSync(target, { force: true }); }
});

test('aborted, oversized, and failed commits preserve the previous file', async () => {
  const target = path.join(__dirname, `.video-export-${process.pid}-failure.mp4`);
  const event = { sender: { id: 1, isDestroyed: () => false } };
  fs.writeFileSync(target, 'previous');
  try {
    for (const failure of ['abort', 'oversize', 'rename']) {
      const fsImpl = failure === 'rename'
        ? { ...fs, promises: { ...fs.promises, rename: async () => { throw new Error('rename failed'); } } }
        : fs;
      const f = mainHandlers(fsImpl);
      const invoke = (name, ...args) => f.handlers[name](event, ...args);
      f.choose(target);
      await invoke('dialog:getSavePath');
      assert.equal((await invoke('file:startWrite', target)).success, true);
      if (failure === 'oversize') {
        assert.equal((await invoke('file:writeChunk', Buffer.alloc(8 * 1024 * 1024 + 1))).error, 'write_chunk_too_large');
      } else {
        assert.equal((await invoke('file:writeChunk', Buffer.from('partial'))).success, true);
      }
      if (failure === 'abort') await invoke('file:writeChunk', Buffer.alloc(0));
      const result = await invoke('file:close');
      assert.equal(result.success, false);
      assert.match(result.error, failure === 'abort' ? /aborted/ : failure === 'oversize' ? /too_large/ : /rename failed/);
      assert.equal(fs.readFileSync(target, 'utf8'), 'previous');
      assert.equal(fs.readdirSync(__dirname).some(name => name.startsWith(`.${path.basename(target)}.`)), false);
    }
  } finally { fs.rmSync(target, { force: true }); }
});

test('opening an unavailable destination returns an error instead of reporting success', async () => {
  const f = mainHandlers();
  const target = path.join(__dirname, 'missing-video-export-folder', 'video.mp4');
  const event = { sender: { id: 1, isDestroyed: () => false } };
  f.choose(target);
  await f.handlers['dialog:getSavePath'](event);
  assert.equal((await f.handlers['file:startWrite'](event, target)).success, false);
});

test('asynchronous stream write and finish errors propagate without hanging', async () => {
  for (const phase of ['write', 'finish']) {
    const streamFs = {
      ...fs,
      createWriteStream() {
        const stream = new Writable({
          write(_chunk, _encoding, callback) { callback(phase === 'write' ? new Error('disk write failed') : null); },
          final(callback) { callback(phase === 'finish' ? new Error('disk finish failed') : null); }
        });
        setImmediate(() => stream.emit('open', 1));
        return stream;
      }
    };
    const f = mainHandlers(streamFs);
    const event = { sender: { id: 1, isDestroyed: () => false } };
    const invoke = (name, ...args) => f.handlers[name](event, ...args);
    f.choose(path.join(__dirname, `fake-${phase}.mp4`));
    const selected = await invoke('dialog:getSavePath');
    assert.equal((await invoke('file:startWrite', selected)).success, true);
    const written = await invoke('file:writeChunk', Buffer.from('data'));
    assert.equal(written.success, phase !== 'write');
    const closed = await invoke('file:close');
    assert.equal(closed.success, false);
    assert.match(closed.error, /disk (write|finish) failed/);
  }
});
