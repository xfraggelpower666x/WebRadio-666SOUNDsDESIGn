'use strict';

const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.setPath('userData', process.env.AUDIO_EQ_TEST_DATA);
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, done) => done({ cancel: true }));
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, done) => done(false));
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  const eqSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'audio-eq.js'), 'utf8');
  const result = await win.webContents.executeJavaScript(eqSource + `
    (async () => {
      async function response(frequency, settings) {
        const sampleRate = 48000, length = sampleRate;
        const context = new OfflineAudioContext(2, length, sampleRate);
        const buffer = context.createBuffer(2, length, sampleRate);
        const left = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) left[i] = 0.05 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        const eq = RWAudioEq.create(context);
        eq.set(settings);
        source.connect(eq.input);
        eq.output.connect(context.destination);
        source.start();
        const rendered = await context.startRendering();
        const out = rendered.getChannelData(0), right = rendered.getChannelData(1);
        let inputPower = 0, outputPower = 0, rightPower = 0;
        for (let i = length / 2; i < length; i++) {
          inputPower += left[i] * left[i];
          outputPower += out[i] * out[i];
          rightPower += right[i] * right[i];
        }
        return { ratio: Math.sqrt(outputPower / inputPower), right: Math.sqrt(rightPower / (length / 2)) };
      }
      function expect(value, condition, message) { if (!condition(value)) throw new Error(message + ': ' + JSON.stringify(value)); }
      for (const frequency of [80, 1000, 10000]) {
        const flat = await response(frequency, {});
        expect(flat, x => Math.abs(x.ratio - 1) < 0.002 && x.right < 1e-8, 'flat stereo ' + frequency);
        const bypass = await response(frequency, { bass: 12, mid: -12, treble: 12, bypass: true });
        expect(bypass, x => Math.abs(x.ratio - 1) < 0.002 && x.right < 1e-8, 'bypass stereo ' + frequency);
      }
      for (const [band, centre, far] of [['bass', 80, 10000], ['mid', 1000, 80], ['treble', 10000, 80]]) {
        const boost = await response(centre, { [band]: 12 });
        const cut = await response(centre, { [band]: -12 });
        const distant = await response(far, { [band]: 12 });
        expect(boost.ratio, x => x > 2.5, band + ' boost');
        expect(cut.ratio, x => x < 0.4, band + ' cut');
        expect(distant.ratio, x => Math.abs(x - 1) < 0.2, band + ' distant response');
      }
      const mono = await response(1000, { width: 0 });
      expect(mono, x => Math.abs(x.ratio - 0.5) < 0.002 && Math.abs(x.right - 0.01768) < 0.0001, 'mono width');
      const wide = await response(1000, { width: 200, bypass: true });
      expect(wide, x => Math.abs(x.ratio - 0.75) < 0.002 && Math.abs(x.right - 0.00884) < 0.0001, 'wide bypass');
      const multichannel = new OfflineAudioContext(6, 4800, 48000);
      const channels = multichannel.createBuffer(6, 4800, 48000);
      for (let channel = 0; channel < 6; channel++) channels.getChannelData(channel).fill((channel + 1) / 20);
      const source = multichannel.createBufferSource(), unchanged = RWAudioEq.create(multichannel);
      source.buffer = channels; source.connect(unchanged.input); unchanged.output.connect(multichannel.destination); source.start();
      const result = await multichannel.startRendering();
      for (let channel = 0; channel < 6; channel++) {
        expect(result.getChannelData(channel)[4000], x => Math.abs(x - (channel + 1) / 20) < 0.001, 'unchanged channel ' + channel);
      }
      return 'OFFLINE_EQ_PASS';
    })()
  `);
  console.log(result);
  win.destroy();
  app.exit(0);
}).catch(error => {
  console.error(error?.stack || error);
  app.exit(1);
});
