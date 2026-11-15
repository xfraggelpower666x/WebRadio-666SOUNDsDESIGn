'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'radio-wave-electron-test-'));
  try {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    for (const mode of ['save', 'verify']) {
      const result = spawnSync(require('electron'), [__filename, profile, mode], {
        cwd: root, env, encoding: 'utf8', timeout: 60000, windowsHide: true
      });
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      if (result.error) console.error(result.error.message);
      if (result.status !== 0) { process.exitCode = 1; break; }
    }
  } finally {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
} else {
  const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
  const assert = require('node:assert/strict');
  app.setPath('userData', process.argv[2]);
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
  app.on('window-all-closed', () => {});
  const page = path.join(process.argv[2], 'smoke.html');
  fs.writeFileSync(page, '<!doctype html><html><body></body></html>');
  app.whenReady().then(async () => {
    const { createSoundCloudCredentialStore } = require('../src/shared/soundcloud-credentials.cjs');
    const store = createSoundCloudCredentialStore(safeStorage, () => process.argv[2]);
    if (process.argv[3] === 'save') {
      await store.save({ clientId: 'smoke-client', clientSecret: 'smoke-secret' });
      console.log('PASS Electron secure credential save');
      app.quit();
      return;
    }
    assert.deepEqual(await store.read(), { clientId: 'smoke-client', clientSecret: 'smoke-secret' });
    assert.equal(fs.readFileSync(path.join(process.argv[2], 'soundcloud-credentials.enc')).includes(Buffer.from('smoke-secret')), false);
    store.clear();
    ipcMain.handle('display:list', () => [{ id: 1 }]);
    ipcMain.handle('app:version', () => app.getVersion());
    ipcMain.handle('intro:complete', () => ({ ok: true }));
    ipcMain.handle('workspace:overlay-ready', () => ({ ok: true }));
    async function check(preload, script) {
      const window = new BrowserWindow({
        show: false,
        webPreferences: { preload: path.join(root, preload), sandbox: true, contextIsolation: true, backgroundThrottling: false }
      });
      window.webContents.on('render-process-gone', (_event, details) => console.error('Renderer failed:', JSON.stringify(details)));
      window.webContents.on('preload-error', (_event, preloadPath, error) => console.error('Preload failed:', preloadPath, error));
      try {
        await window.loadFile(page);
        return await window.webContents.executeJavaScript(script);
      } finally {
        window.destroy();
      }
    }
    assert.equal(await check('preload.js', `(async () => {
      window.api.onDisplaysChanged(() => {});
      const version = await window.api.appVersion();
      return typeof version === 'string' && version.length > 0 && (await window.api.displays())[0].id;
    })()`), 1);
    assert.equal(await check('intro-preload.js', '(async () => (await window.introApi.complete()).ok)()'), true);
    assert.equal(await check('overlay-preload.js', `(async () => {
      window.rwOverlay.onInit(() => {});
      window.rwOverlay.onSync(() => {});
      return (await window.rwOverlay.ready()).ok;
    })()`), true);
    const overlayActions = [];
    ipcMain.handle('workspace:overlay-action', (_event, payload) => { overlayActions.push(payload); return { ok: true }; });
    const overlay = new BrowserWindow({
      show: false, webPreferences: { preload: path.join(root, 'overlay-preload.js'), sandbox: true, contextIsolation: true, backgroundThrottling: false }
    });
    try {
      await overlay.loadFile(path.join(root, 'src', 'overlay-window.html'));
      const markup = '<input id="radio-password" type="password"><textarea id="message"></textarea><p id="status">initial</p>'
        + '<button id="local-queue-play-0" data-index="0">Play</button><button id="local-queue-remove-0" data-remove-index="0">Remove</button>'
        + '<button id="soundcloud-item-track-0" data-sc-url="https://example.test/track">Track</button>'
        + '<input id="overlay-range" type="range" min="0" max="100" value="0" style="position:absolute;left:20px;top:200px;width:300px;height:20px">';
      overlay.webContents.send('workspace:overlay-init', { key: 'source', html: markup, controls: [] });
      await overlay.webContents.executeJavaScript(`(async () => {
        while (!document.getElementById('radio-password')) await new Promise(resolve => setTimeout(resolve, 10));
        const pw = document.getElementById('radio-password');
        pw.focus(); pw.value = 'abc'; pw.setSelectionRange(1, 2);
        pw.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      overlay.webContents.send('workspace:overlay-sync', {
        html: markup.replace('initial', 'updated'),
        controls: [{ id: 'radio-password', type: 'password', hasValue: true }, { id: 'message', value: '' }]
      });
      const secret = await overlay.webContents.executeJavaScript(`(async () => {
        while (document.getElementById('status').textContent !== 'updated') await new Promise(resolve => setTimeout(resolve, 10));
        const pw = document.getElementById('radio-password');
        return { value: pw.value, focused: document.activeElement === pw, start: pw.selectionStart, end: pw.selectionEnd };
      })()`);
      assert.deepEqual(secret, { value: 'abc', focused: true, start: 1, end: 2 });
      await overlay.webContents.executeJavaScript(`(() => {
        const text = document.getElementById('message');
        text.focus(); text.value = 'hello'; text.setSelectionRange(2, 4);
        text.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      overlay.webContents.send('workspace:overlay-sync', {
        html: markup.replace('initial', 'updated again'),
        controls: [{ id: 'radio-password', type: 'password', hasValue: false }, { id: 'message', value: 'stale' }]
      });
      const text = await overlay.webContents.executeJavaScript(`(async () => {
        while (document.getElementById('status').textContent !== 'updated again') await new Promise(resolve => setTimeout(resolve, 10));
        const input = document.getElementById('message');
        return { value: input.value, focused: document.activeElement === input, start: input.selectionStart, end: input.selectionEnd, secret: document.getElementById('radio-password').value };
      })()`);
      assert.deepEqual(text, { value: 'hello', focused: true, start: 2, end: 4, secret: '' });
      await overlay.webContents.executeJavaScript(`(() => {
        for (const id of ['local-queue-play-0', 'local-queue-remove-0', 'soundcloud-item-track-0']) document.getElementById(id).click();
      })()`);
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.deepEqual(overlayActions.filter(action => action.kind === 'click').map(action => action.id),
        ['local-queue-play-0', 'local-queue-remove-0', 'soundcloud-item-track-0']);
      overlay.webContents.sendInputEvent({ type: 'mouseDown', x: 40, y: 210, button: 'left', clickCount: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const beforeDrag = await overlay.webContents.executeJavaScript("Number(document.getElementById('overlay-range').value)");
      overlay.webContents.send('workspace:overlay-sync', {
        html: markup.replace('initial', 'dragging'),
        controls: [{ id: 'overlay-range', value: String(beforeDrag) }]
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(await overlay.webContents.executeJavaScript("document.getElementById('status').textContent"), 'updated again');
      overlay.webContents.sendInputEvent({ type: 'mouseMove', x: 280, y: 210, button: 'left' });
      await new Promise(resolve => setTimeout(resolve, 100));
      overlay.webContents.sendInputEvent({ type: 'mouseUp', x: 280, y: 210, button: 'left', clickCount: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const drag = await overlay.webContents.executeJavaScript("({ value: Number(document.getElementById('overlay-range').value), status: document.getElementById('status').textContent })");
      assert.equal(drag.status, 'dragging');
      assert.ok(drag.value > beforeDrag + 50, `Slider drag was interrupted: ${beforeDrag} -> ${drag.value}`);

      await overlay.webContents.executeJavaScript(`(() => {
        document.getElementById('overlay-range').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 99, button: 0 }));
      })()`);
      overlay.webContents.send('workspace:overlay-sync', { html: markup.replace('initial', 'cancelled'), controls: [] });
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(await overlay.webContents.executeJavaScript("document.getElementById('status').textContent"), 'dragging');
      await overlay.webContents.executeJavaScript(`(() => {
        document.getElementById('overlay-range').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, isPrimary: true, pointerId: 99 }));
      })()`);
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(await overlay.webContents.executeJavaScript("document.getElementById('status').textContent"), 'cancelled');
    } finally { overlay.destroy(); }
    console.log('PASS Electron detached overlay focus, secrets, dynamic buttons and slider gestures');
    const recorded = await check('preload.js', `(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = 54;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const output = audio.createMediaStreamDestination();
      oscillator.connect(output); oscillator.start(); await audio.resume();
      const stream = new MediaStream([...canvas.captureStream(10).getVideoTracks(), ...output.stream.getAudioTracks()]);
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x));
      if (!mimeType) throw new Error('WebM recorder unavailable');
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve; recorder.onerror = event => reject(event.error);
      });
      recorder.start();
      await new Promise(resolve => setTimeout(resolve, 750));
      recorder.stop(); await stopped;
      oscillator.stop(); stream.getTracks().forEach(track => track.stop()); await audio.close();
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
      return { size: bytes.length, signature: Array.from(bytes.slice(0, 4)) };
    })()`);
    assert.ok(recorded.size > 64);
    assert.deepEqual(recorded.signature, [0x1a, 0x45, 0xdf, 0xa3]);
    const devicesSource = fs.readFileSync(path.join(root, 'src', 'audio-devices.js'), 'utf8');
    const microphone = await check('preload.js', devicesSource + `(async () => {
      const context = new AudioContext(), analyser = context.createAnalyser();
      const exportNode = context.createMediaStreamDestination();
      const outputAnalyser = context.createAnalyser(), quiet = context.createGain();
      quiet.gain.value = 0;
      context.createMediaStreamSource(exportNode.stream).connect(outputAnalyser);
      outputAnalyser.connect(quiet); quiet.connect(context.destination);
      const device = RWAudioDevices.create({
        mediaDevices: navigator.mediaDevices, begin: async () => {}, end: async () => {},
        graph: () => ({ context, analyser, exportNode })
      });
      device.setInputRecording(true);
      if (!await device.startInput('')) throw new Error('Fake microphone did not start');
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
      const stream = new MediaStream([...canvas.captureStream(10).getVideoTracks(), ...exportNode.stream.getAudioTracks()]);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }), chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve; recorder.onerror = event => reject(event.error);
      });
      recorder.start();
      const samples = new Uint8Array(outputAnalyser.fftSize);
      let peak = 0;
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        outputAnalyser.getByteTimeDomainData(samples);
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
        if (peak > 2 && i >= 7) break;
      }
      recorder.stop(); await stopped;
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
      device.stopInput(); stream.getTracks().forEach(track => track.stop()); await context.close();
      return { peak, size: bytes.length };
    })()`);
    assert.ok(microphone.peak > 2, 'Fake microphone did not reach the recording destination');
    assert.ok(microphone.size > 64, 'Microphone video was not recorded');
    console.log('PASS Electron secure storage, sandboxed IPC and audio/video recording smoke');
    app.exit(0);
  }).catch(error => {
    console.error(error.stack || error.message || error);
    app.exit(1);
  });
}
