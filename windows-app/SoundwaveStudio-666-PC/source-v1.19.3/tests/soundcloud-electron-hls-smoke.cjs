'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const work = path.join(root, `.soundcloud-hls-smoke-${randomUUID()}`);
  fs.mkdirSync(work);
  try {
    const profile = path.join(work, 'profile');
    fs.mkdirSync(profile);
    const systemRoot = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
    const env = {
      SystemRoot: systemRoot, WINDIR: systemRoot, SystemDrive: process.env.SystemDrive || 'C:',
      PATH: `${path.join(systemRoot, 'System32')};${systemRoot}`,
      APPDATA: profile, LOCALAPPDATA: profile, USERPROFILE: profile, HOME: profile, TEMP: profile, TMP: profile
    };
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=4',
      '-ac', '2', '-c:a', 'aac', '-b:a', '128k', '-f', 'hls', '-hls_time', '1',
      '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(work, 'segment-%03d.ts'),
      path.join(work, 'manifest.m3u8')];
    const generated = spawnSync(ffmpeg, args, { cwd: root, env: { ...env, PATH: process.env.PATH || env.PATH }, encoding: 'utf8', timeout: 30000, windowsHide: true });
    if (generated.error || generated.status !== 0) throw new Error(`ffmpeg failed: ${generated.error?.message || generated.stderr || generated.status}`);
    const run = spawnSync(require('electron'), [__filename, '--child', work], {
      cwd: root, env, encoding: 'utf8', timeout: 45000, windowsHide: true
    });
    process.stdout.write(run.stdout || '');
    process.stderr.write(run.stderr || '');
    if (run.error || run.status !== 0) throw new Error(`Electron smoke failed: ${run.error?.message || `exit ${run.status}`}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch (error) { console.error(`Could not remove smoke fixture ${work}: ${error.message}`); process.exitCode = 1; }
  }
} else {
  const { app, BrowserWindow, protocol, session, ipcMain } = require('electron');
  const { createSoundCloudStreamProxy } = require('../src/shared/soundcloud-stream.cjs');
  const work = process.argv[3];
  const profile = path.join(work, 'profile');
  const requests = [];
  let blocked = 0;
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
  app.commandLine.appendSwitch('disable-background-networking');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('dns-prefetch-disable');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  protocol.registerSchemesAsPrivileged([{
    scheme: 'swsc',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }]);

  const proxy = createSoundCloudStreamProxy({
    accessToken: async () => 'synthetic-offline-token',
    invalidateToken: () => { throw new Error('unexpected token invalidation'); },
    fetch: async (url, options) => {
      if (options.headers.authorization !== 'OAuth synthetic-offline-token') throw new Error('missing synthetic authorization');
      const base = 'https://api.soundcloud.com/tracks/offline/';
      if (!url.startsWith(base)) throw new Error('unexpected mock URL');
      const name = url.slice(base.length);
      if (name !== 'manifest.m3u8' && !/^segment-\d{3}\.ts$/.test(name)) throw new Error('unexpected mock file');
      requests.push(name);
      const bytes = fs.readFileSync(path.join(work, name));
      return new Response(bytes, { headers: { 'content-type': name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t' } });
    }
  });
  proxy.prepare({ hls_aac_160_url: 'https://api.soundcloud.com/tracks/offline/manifest.m3u8' }, 'playable', 1);
  app.whenReady().then(async () => {
    await session.defaultSession.setProxy({ mode: 'fixed_servers', proxyRules: 'http=127.0.0.1:9;https=127.0.0.1:9', proxyBypassRules: '<-loopback>' });
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const scheme = new URL(details.url).protocol;
      const allowed = ['file:', 'swsc:', 'blob:', 'data:'].includes(scheme);
      if (!allowed) blocked++;
      callback({ cancel: !allowed });
    });
    protocol.handle('swsc', request => proxy.handle(request));
    const ipcReplies = {
      'workspace:overlay-state': {}, 'workspace:overlay-sync': { ok: true }, 'app:version': 'offline-smoke',
      'display:list': [], 'display:status': {}, 'runtime:diagnostics': {},
      'visual:frame': { ok: true }, 'vj:sync': { ok: true },
      'local:queue-state': { items: [], count: 0 }, 'local:library-state': { tracks: [], playlists: [] },
      'player-alert:current': { ok: true, current: null }, 'source:sync': { ok: true },
      'milkdrop:personal-library': { items: [] },
      'runtime:remote-health': { admin: { ok: false }, skip: { ok: false }, messenger: { ok: false }, soundcloud: 'CONFIGURED' },
      'soundcloud:status': { configured: true, source: 'environment', stored: false, encryptionAvailable: true },
      'soundcloud:library': { playlists: [], tracks: [] }
    };
    for (const [channel, reply] of Object.entries(ipcReplies)) ipcMain.handle(channel, () => reply);
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(root, 'preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    window.webContents.setAudioMuted(true);
    try {
      await window.loadFile(path.join(root, 'src', 'index.html'));
      const result = await window.webContents.executeJavaScript(`(async () => {
        const rt = window.SoundwaveRuntime, audio = document.getElementById('audio-element');
        if (!rt || rt.audio !== audio || !window.Hls || !window.createSoundCloudPlayback)
          throw new Error('application audio runtime or HLS scripts unavailable');
        if (!window.Hls.isSupported()) throw new Error('Electron MediaSource/HLS unsupported');
        const failures = [];
        const player = window.createSoundCloudPlayback(audio, window.Hls, message => failures.push(message));
        rt.ensureAudioContext();
        await rt.getAudioContext().resume();
        player.load({ playbackKind: 'hls', mediaUrl: 'swsc://audio/current?v=1' });
        await Promise.race([
          audio.play(),
          new Promise((_, reject) => setTimeout(() => reject(new Error(failures[0] || 'HLS play timed out')), 12000))
        ]);
        const analyser = rt.getAnalyser(), samples = new Uint8Array(analyser.fftSize);
        const deadline = performance.now() + 12000;
        let peak = 0, rms = 0;
        while (performance.now() < deadline) {
          if (failures.length) throw new Error(failures.join('; '));
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) { const delta = sample - 128; peak = Math.max(peak, Math.abs(delta)); sum += delta * delta; }
          rms = Math.max(rms, Math.sqrt(sum / samples.length));
          if (audio.currentTime > 0.6 && peak > 2 && rms > 1) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        const result = { time: audio.currentTime, peak, rms, hls: window.Hls.version };
        player.stop(); audio.pause();
        if (result.time <= 0.6 || result.peak <= 2 || result.rms <= 1)
          throw new Error('Playback/analyser did not advance: ' + JSON.stringify(result));
        return result;
      })()`, true);
      if (!requests.includes('manifest.m3u8') || !requests.some(name => name.endsWith('.ts'))) throw new Error('Manifest or segment did not traverse the proxy');
      console.log(`PASS Electron ${process.versions.electron}, hls.js ${result.hls}, time=${result.time.toFixed(2)}s, analyser peak=${result.peak}, rms=${result.rms.toFixed(2)}, proxy requests=${requests.length}, blocked external requests=${blocked}`);
    } finally { window.destroy(); }
    app.exit(0);
  }).catch(error => {
    console.error(error.stack || error.message || error);
    app.exit(1);
  });
}
