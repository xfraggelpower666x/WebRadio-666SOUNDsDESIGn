'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const { randomUUID } = require('node:crypto');
  const work = path.join(root, `.vj-offline-smoke-${randomUUID()}`);
  fs.mkdirSync(work);
  try {
    const clip = path.join(work, 'synthetic.webm');
    const generated = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'color=c=red:s=96x54:r=15:d=4',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=4',
      '-c:v', 'libvpx', '-deadline', 'realtime', '-c:a', 'libopus', '-shortest', clip
    ], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    if (generated.error || generated.status !== 0) throw new Error(`Synthetic video generation failed: ${generated.error?.message || generated.stderr}`);
    const mp4 = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'color=c=lime:s=96x54:r=15:d=4',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(work, 'synthetic.mp4')
    ], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    if (mp4.error || mp4.status !== 0) throw new Error(`Synthetic MP4 generation failed: ${mp4.error?.message || mp4.stderr}`);
    const profile = path.join(work, 'profile');
    fs.mkdirSync(profile);
    const systemRoot = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
    const env = {
      SystemRoot: systemRoot, WINDIR: systemRoot, SystemDrive: process.env.SystemDrive || 'C:',
      PATH: `${path.join(systemRoot, 'System32')};${systemRoot}`,
      APPDATA: profile, LOCALAPPDATA: profile, USERPROFILE: profile, HOME: profile, TEMP: profile, TMP: profile
    };
    const run = spawnSync(require('electron'), [__filename, '--child', work], {
      cwd: root, env, encoding: 'utf8', timeout: 90000, windowsHide: true
    });
    process.stdout.write(run.stdout || ''); process.stderr.write(run.stderr || '');
    if (run.error || run.status !== 0) throw new Error(`Electron smoke failed: ${run.error?.message || `exit ${run.status}`}`);
    const decoded = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', path.join(work, 'export.webm'),
      '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'
    ], { cwd: root, timeout: 30000, windowsHide: true });
    if (decoded.error || decoded.status !== 0 || decoded.stdout.length < 3) throw new Error(`Export decode failed: ${decoded.error?.message || String(decoded.stderr)}`);
    const [r, g, b] = decoded.stdout;
    if (r < 120 || r < g * 2 || r < b * 2) throw new Error(`Recorded frame is not synthetic red: ${r},${g},${b}`);
    console.log(`PASS offline exported WebM decoded: average RGB ${r},${g},${b}`);
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch (error) { console.error(`Could not clean smoke files: ${error.message}`); process.exitCode = 1; }
  }
} else {
  const { app, BrowserWindow, protocol, session, ipcMain, net } = require('electron');
  const { pathToFileURL } = require('node:url');
  const { createVjFiles } = require('../src/shared/vj-files.cjs');
  const { validateVjState } = require('../src/shared/vj-sync.cjs');
  const work = process.argv[3], profile = path.join(work, 'profile'), clip = path.join(work, 'synthetic.webm');
  app.setPath('userData', profile); app.setPath('sessionData', profile);
  for (const flag of ['disable-background-networking', 'disable-component-update', 'disable-sync', 'dns-prefetch-disable']) app.commandLine.appendSwitch(flag);
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  protocol.registerSchemesAsPrivileged([
    { scheme: 'swvj', privileges: { standard: true, secure: true, corsEnabled: true, stream: true } },
    { scheme: 'swmedia', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
  ]);
  app.whenReady().then(async () => {
    await session.defaultSession.setProxy({ mode: 'fixed_servers', proxyRules: 'http=127.0.0.1:9;https=127.0.0.1:9', proxyBypassRules: '<-loopback>' });
    let blocked = 0, served = 0;
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const allowed = ['file:', 'swvj:', 'swmedia:', 'blob:', 'data:'].includes(new URL(details.url).protocol);
      if (!allowed) blocked++;
      callback({ cancel: !allowed });
    });
    const pool = createVjFiles({ fetchFile: (url, opts) => net.fetch(url, opts) });
    const approved = pool.replace([clip, path.join(work, 'synthetic.mp4')]);
    protocol.handle('swvj', request => { served++; return pool.handle(request); });
    protocol.handle('swmedia', request => net.fetch(pathToFileURL(clip).href, { headers: request.headers }));
    const replies = {
      'workspace:overlay-state': {}, 'app:version': 'offline-smoke',
      'display:list': [], 'display:status': {}, 'runtime:diagnostics': {}, 'visual:frame': { ok: true },
      'local:queue-state': { items: [], count: 0 }, 'local:library-state': { pool: [], playlists: [], errors: [] },
      'player-alert:current': { ok: true, current: null }, 'source:sync': { ok: true },
      'milkdrop:personal-library': { items: [] }, 'vj:choose-videos': approved,
      'runtime:remote-health': {}, 'soundcloud:status': {}, 'soundcloud:library': { playlists: [], tracks: [] },
      'display:heartbeat': { ok: true }
    };
    for (const [channel, reply] of Object.entries(replies)) ipcMain.handle(channel, () => reply);
    const chunks = [];
    ipcMain.handle('dialog:getSavePath', () => path.join(work, 'export.webm'));
    ipcMain.handle('file:startWrite', () => ({ success: true }));
    ipcMain.handle('file:writeChunk', (_event, data) => { chunks.push(Buffer.from(data)); return { success: true }; });
    ipcMain.handle('file:close', () => { fs.writeFileSync(path.join(work, 'export.webm'), Buffer.concat(chunks)); return { success: true }; });
    ipcMain.handle('dialog:openVjData', (_event, kind) => kind === 'sync'
      ? [{ name: 'synthetic.csv', text: 'Time_ms,Bass_Amplitude\n0,0.8\n1000,0.8\n' }]
      : [{ name: 'synthetic.json', text: '[{"dst":"1"}]' }]);
    const window = new BrowserWindow({
      show: false, webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
    });
    const follower = new BrowserWindow({
      show: false, webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
    });
    let overlay;
    ipcMain.handle('workspace:overlay-ready', () => ({ ok: true }));
    ipcMain.handle('workspace:overlay-open', async (event, payload) => {
      if (event.sender.id !== window.webContents.id || payload.key !== 'vjStudio') throw new Error('overlay_not_approved');
      overlay = new BrowserWindow({
        show: false, webPreferences: { preload: path.join(root, 'overlay-preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
      });
      await overlay.loadFile(path.join(root, 'src', 'overlay-window.html'), { query: { key: payload.key } });
      overlay.webContents.send('workspace:overlay-init', payload);
      return { ok: true };
    });
    ipcMain.handle('workspace:overlay-sync', (_event, key, payload) => {
      if (key === 'vjStudio' && overlay && !overlay.isDestroyed()) overlay.webContents.send('workspace:overlay-sync', payload);
      return { ok: true };
    });
    ipcMain.handle('workspace:overlay-action', (event, payload) => {
      if (!overlay || event.sender.id !== overlay.webContents.id || payload.key !== 'vjStudio') throw new Error('overlay_not_approved');
      window.webContents.send('workspace:overlay-action', payload);
      return { ok: true };
    });
    let revision = 0, lastState = null;
    const states = [], startupErrors = [];
    ipcMain.handle('vj:sync', (event, state) => {
      if (event.sender.id !== window.webContents.id) throw new Error('ipc_sender_blocked');
      lastState = { revision: ++revision, at: Date.now(), state: validateVjState(state, id => pool.has(id)) };
      states.push(lastState);
      if (!follower.isDestroyed()) follower.webContents.send('vj:state', lastState);
      return { ok: true };
    });
    ipcMain.handle('vj:state', event => {
      if (event.sender.id !== follower.webContents.id) throw new Error('ipc_sender_blocked');
      return lastState;
    });
    for (const w of [window, follower]) w.webContents.on('console-message', event => {
      if (event.level !== 'error') return;
      console.error('Renderer:', event.message);
      if (/Executing inline script violates the following Content Security Policy|Cannot access 'syncVisual' before initialization/.test(event.message)) startupErrors.push(event.message);
    });
    window.webContents.on('preload-error', (_event, preload, error) => console.error('Preload:', preload, error));
    window.webContents.setAudioMuted(true);
    try {
      await window.loadFile(path.join(root, 'src', 'index.html'));
      await follower.loadFile(path.join(root, 'src', 'index.html'), { query: { output: '1' } });
      if (!await follower.webContents.executeJavaScript("typeof window.SV?.hexToRgb01 === 'function'")) throw new Error('Follower color helper missing');
      const workspace = await window.webContents.executeJavaScript(`(async () => {
        const node = document.getElementById('vj-studio').closest('.rw-floating-window');
        if (!node || !window.RWWorkspace) throw new Error('VJ workspace window missing');
        window.RWWorkspace.close('vjStudio');
        document.getElementById('vj-open').click();
        const opened = !node.classList.contains('rw-window-closed');
        document.getElementById('vj-open').click();
        const closed = node.classList.contains('rw-window-closed');
        document.getElementById('vj-open').click();
        return { opened, closed, detached: await window.RWWorkspace.detach('vjStudio') };
      })()`, true);
      if (!workspace.opened || !workspace.closed || !workspace.detached || !overlay) throw new Error('VJ workspace toggle/detach failed');
      const result = await window.webContents.executeJavaScript(`(async () => { try {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const until = async (condition, message, timeout = 12000) => {
          const end = performance.now() + timeout;
          while (performance.now() < end) { if (condition()) return; await wait(100); }
          throw new Error(message);
        };
        const audio = document.getElementById('audio-element'), canvas = document.getElementById('visualizer-canvas');
        if (!window.vjStudio || !window.SoundwaveRuntime || !canvas.captureStream) throw new Error('VJ/export runtime unavailable');
        if (typeof window.SV?.hexToRgb01 !== 'function') throw new Error('Primary color helper missing');
        document.getElementById('vj-choose').click();
        await until(() => window.vjStudio.getState().items.length === 2, 'Picker failed: ' + document.getElementById('vj-status').textContent);
        const opacity = document.getElementById('vj-opacity'); opacity.value = '100'; opacity.dispatchEvent(new Event('input'));
        document.getElementById('vj-toggle').click();
        audio.src = ${JSON.stringify(approved[0].url)}; audio.load();
        window.SoundwaveRuntime.ensureAudioContext();
        await window.SoundwaveRuntime.getAudioContext().resume();
        await audio.play();
        document.getElementById('vj-data-bass').click();
        await until(() => /keyframes loaded/.test(document.getElementById('vj-data-audio-status').textContent), 'CSV load failed: ' + document.getElementById('vj-data-audio-status').textContent);
        const sync = document.getElementById('vj-data-audio-enabled'); sync.checked = true; sync.dispatchEvent(new Event('change'));
        if (!window.vjStudio.getState().envelopeProviderActive) throw new Error('CSV envelope was not enabled');
        document.getElementById('vj-data-parity').click();
        await until(() => /parity records loaded/.test(document.getElementById('vj-data-status').textContent), 'Parity load failed: ' + document.getElementById('vj-data-status').textContent);
        document.getElementById('vj-data-select').click();
        if (window.vjStudio.getState().sequence.length !== 1 || window.vjStudio.getState().items.length !== 2) throw new Error('Parity subset failed: ' + document.getElementById('vj-data-status').textContent);
        await wait(600);
        document.getElementById('vj-data-reset').click();
        if (window.vjStudio.getState().sequence.length !== 2 || window.vjStudio.getState().items.length !== 2) throw new Error('Pool restore failed');
        window.vjStudio.select(window.vjStudio.getState().items[0].id);
        let pixel;
        await until(() => {
          pixel = Array.from(canvas.getContext('2d').getImageData(20, 20, 1, 1).data);
          return pixel[0] > 120 && pixel[0] > pixel[1] * 2 && pixel[0] > pixel[2] * 2;
        }, 'Synthetic video did not render to the export canvas: ' + document.getElementById('vj-status').textContent);
        const redPixel = pixel;
        window.vjStudio.select(window.vjStudio.getState().items[1].id);
        await until(() => {
          pixel = Array.from(canvas.getContext('2d').getImageData(20, 20, 1, 1).data);
          return pixel[1] > 120 && pixel[1] > pixel[0] * 2 && pixel[1] > pixel[2] * 2;
        }, 'Synthetic MP4 did not render: ' + document.getElementById('vj-status').textContent);
        const greenPixel = pixel;
        window.vjStudio.select(window.vjStudio.getState().items[0].id);
        await until(() => {
          pixel = Array.from(canvas.getContext('2d').getImageData(20, 20, 1, 1).data);
          return pixel[0] > 120 && pixel[0] > pixel[1] * 2 && pixel[0] > pixel[2] * 2;
        }, 'Returning to WebM failed: ' + document.getElementById('vj-status').textContent);
        document.getElementById('select-fps').value = '30';
        await window.startRecordingPipeline();
        await wait(1300);
        document.getElementById('btn-stop-export').click();
        await until(() => document.getElementById('export-result').textContent.startsWith('Saved video:'), 'Export did not finish: ' + document.getElementById('export-result').textContent);
        return { redPixel, greenPixel, state: window.vjStudio.getState() };
      } catch (error) { return { error: String(error?.stack || error?.message || error) }; }
      })()`, true);
      if (result.error) throw new Error(result.error);
      if (!served) throw new Error('VJ protocol not used');
      await new Promise(resolve => setTimeout(resolve, 600));
      const beforeLayout = states.at(-1)?.state;
      if (!beforeLayout || beforeLayout.playing || beforeLayout.positions[0] < 0.1) throw new Error('VJ layout test needs a paused nonzero position');
      await window.webContents.executeJavaScript(`(() => {
        const layout = document.getElementById('vj-layout');
        layout.value = '2'; layout.dispatchEvent(new Event('change'));
      })()`);
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterLayout = states.at(-1)?.state;
      if (afterLayout?.layout !== 2 || Math.abs(afterLayout.positions[0] - beforeLayout.positions[0]) > 0.05)
        throw new Error('VJ layout change restarted the primary video');
      await window.webContents.executeJavaScript(`(() => {
        const layout = document.getElementById('vj-layout');
        layout.value = '1'; layout.dispatchEvent(new Event('change'));
      })()`);
      if (!states.some(update => update.state.sequence.length === 1) || !states.some(update => update.state.sequence.length === 2)) throw new Error('Follower did not receive subset and restored order');
      if (!states.some(update => update.state.bands.bass === 0.8)) throw new Error('CSV envelope did not reach followers');
      const readFollowerPixel = async () => follower.webContents.executeJavaScript(`(() => {
        const p = document.getElementById('visualizer-canvas').getContext('2d').getImageData(20, 20, 1, 1).data;
        const audio = document.getElementById('audio-element');
        return { pixel: Array.from(p), silent: audio.paused && !audio.getAttribute('src') };
      })()`);
      async function waitFollower(color) {
        const end = Date.now() + 12000;
        while (Date.now() < end) {
          const value = await readFollowerPixel(), p = value.pixel;
          if (value.silent && p[color] > 120 && p[color] > p[(color + 1) % 3] * 2 && p[color] > p[(color + 2) % 3] * 2) return value;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Follower did not display selected VJ video silently');
      }
      await window.webContents.executeJavaScript(`window.vjStudio.select(window.vjStudio.getState().items[1].id)`);
      const greenFollower = await waitFollower(1);
      await overlay.webContents.executeJavaScript(`(() => {
        const input = document.getElementById('vj-opacity');
        if (!input) throw new Error('Detached VJ controls missing');
        input.value = '37'; input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`, true);
      const untilOverlay = Date.now() + 5000;
      while (Date.now() < untilOverlay && !states.some(update => update.state.opacity === 0.37)) await new Promise(resolve => setTimeout(resolve, 50));
      const primaryOpacity = await window.webContents.executeJavaScript('window.vjStudio.getState().opacity');
      if (primaryOpacity !== 0.37 || !states.some(update => update.state.opacity === 0.37)) throw new Error('Detached VJ control forwarding failed');
      if (startupErrors.length) throw new Error('Renderer startup errors: ' + startupErrors.join('; '));
      console.log(`PASS workspace open/toggle/detach and detached control forwarding; follower canvas green=${greenFollower.pixel}, no follower audio; CSV envelope and parity order synchronized`);
      console.log(`PASS Electron ${process.versions.electron}: approved WebM and MP4 decoded on actual export canvas; pixels=${result.redPixel}/${result.greenPixel}; protocol requests=${served}; blocked external requests=${blocked}`);
    } finally { window.destroy(); follower.destroy(); if (overlay && !overlay.isDestroyed()) overlay.destroy(); }
    app.exit(0);
  }).catch(error => { console.error(error?.stack || error?.message || String(error), JSON.stringify(error)); app.exit(1); });
}
