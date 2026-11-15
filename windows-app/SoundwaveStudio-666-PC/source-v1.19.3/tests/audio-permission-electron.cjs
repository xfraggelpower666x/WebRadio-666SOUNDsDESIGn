'use strict';

const { app, BrowserWindow, session, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createAudioPermissionGate, forwardOverlayMicrophone } = require('../src/shared/audio-permissions.cjs');

const scratch = process.env.AUDIO_PERMISSION_TEST_DATA;
app.setPath('userData', scratch);
app.commandLine.appendSwitch('use-fake-device-for-media-stream');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const file = path.join(scratch, 'permission-test.html');
  fs.writeFileSync(file, '<!doctype html><title>Offline permission test</title>');
  const url = pathToFileURL(file).href;
  const options = { show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, '..', 'preload.js') } };
  const primary = new BrowserWindow(options);
  const other = new BrowserWindow(options);
  const gate = createAudioPermissionGate({
    getMainWindow: () => primary,
    isTrustedUrl: value => value === url
  });
  const ses = session.defaultSession;
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, done) => done({ cancel: true }));
  ses.setPermissionCheckHandler((wc, permission, origin, details) => gate.check(wc, permission, origin, details));
  ses.setPermissionRequestHandler((wc, permission, done, details) => done(gate.request(wc, permission, details)));
  await Promise.all([primary.loadFile(file), other.loadFile(file)]);
  async function capture(win, constraints) {
    return win.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia(${JSON.stringify(constraints)})
      .then(stream => { stream.getTracks().forEach(track => track.stop()); return 'allowed'; })
      .catch(error => error.name)`);
  }
  const denied = await capture(primary, { audio: true, video: false });
  if (denied !== 'NotAllowedError') throw new Error('Unarmed microphone: ' + denied);
  gate.arm({ sender: primary.webContents, senderFrame: primary.webContents.mainFrame }, 'microphone');
  const otherDenied = await capture(other, { audio: true, video: false });
  if (otherDenied !== 'NotAllowedError') throw new Error('Other window microphone: ' + otherDenied);
  const videoDenied = await capture(primary, { audio: true, video: true });
  if (videoDenied !== 'NotAllowedError') throw new Error('Camera permission: ' + videoDenied);
  const allowed = await capture(primary, { audio: true, video: false });
  if (allowed !== 'allowed') throw new Error('Armed microphone: ' + allowed);
  gate.revoke('microphone');
  const revoked = await capture(primary, { audio: true, video: false });
  if (revoked !== 'NotAllowedError') throw new Error('Revoked microphone: ' + revoked);
  const overlayFile = path.join(scratch, 'overlay-test.html');
  fs.writeFileSync(overlayFile, '<!doctype html><main id="overlay-root"><button id="audio-input-start">Enable microphone</button></main>');
  const overlayUrl = pathToFileURL(overlayFile).href;
  const overlayOptions = { show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, '..', 'overlay-preload.js') } };
  const devices = new BrowserWindow(overlayOptions);
  const unrelated = new BrowserWindow(overlayOptions);
  await Promise.all([devices.loadFile(overlayFile), unrelated.loadFile(overlayFile)]);
  let overlayCalls = 0, blockedCalls = 0;
  ipcMain.handle('audio:overlay-microphone', event => {
    overlayCalls++;
    try {
      return forwardOverlayMicrophone(event, {
        getMainWindow: () => primary, getDevicesWindow: () => devices, isTrustedOverlayUrl: value => value === overlayUrl
      });
    } catch (error) { blockedCalls++; throw error; }
  });
  ipcMain.handle('audio:permission-begin', (event, kind) => { gate.arm(event, kind); });
  ipcMain.handle('audio:permission-end', (_event, kind) => gate.revoke(kind));
  await primary.webContents.executeJavaScript(`
    document.title = 'waiting';
    window.api.onDetachedMicrophoneRequest(async () => {
      try {
        await window.api.audioPermissionBegin('microphone');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(track => track.stop());
        document.title = 'allowed';
      } catch (error) { document.title = 'error:' + error.message; }
      finally { await window.api.audioPermissionEnd('microphone'); }
    });
  `);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  await devices.webContents.executeJavaScript("document.querySelector('#audio-input-start').click()");
  await delay(80);
  if (overlayCalls !== 0 || await primary.webContents.executeJavaScript('document.title') !== 'waiting') throw new Error('Synthetic overlay click was accepted');
  async function nativeClick(win) {
    const position = await win.webContents.executeJavaScript(`(() => {
      const rect = document.querySelector('#audio-input-start').getBoundingClientRect();
      return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    })()`);
    win.webContents.sendInputEvent({ type: 'mouseMove', ...position });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...position });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...position });
  }
  await nativeClick(unrelated);
  await delay(80);
  if (overlayCalls !== 1 || blockedCalls !== 1 || await primary.webContents.executeJavaScript('document.title') !== 'waiting') throw new Error('Other overlay was not rejected');
  await nativeClick(devices);
  let title = 'waiting';
  for (let i = 0; i < 50 && title === 'waiting'; i++) {
    await delay(20);
    title = await primary.webContents.executeJavaScript('document.title');
  }
  if (title !== 'allowed' || overlayCalls !== 2 || blockedCalls !== 1) throw new Error('Trusted devices click: ' + title);
  console.log('ELECTRON_AUDIO_PERMISSION_PASS');
  devices.destroy(); unrelated.destroy(); primary.destroy(); other.destroy(); app.exit(0);
}).catch(error => { console.error(error?.stack || error); app.exit(1); });
