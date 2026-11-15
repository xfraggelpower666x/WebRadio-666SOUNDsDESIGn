'use strict';

const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.setPath('userData', process.env.AUDIO_SURROUND_TEST_DATA);
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, done) => done({ cancel: true }));
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'audio-surround.js'), 'utf8');
  const result = await win.webContents.executeJavaScript(source + `
    (async () => {
      const sampleRate = 48000, length = 48000;
      function expect(value, expected, message, tolerance = 0.0001) {
        if (Math.abs(value - expected) > tolerance) throw new Error(message + ': ' + value + ' expected ' + expected);
      }
      async function render(channels, upmix) {
        const context = new OfflineAudioContext(8, length, sampleRate);
        const buffer = context.createBuffer(channels.length, length, sampleRate);
        channels.forEach((value, i) => {
          const data = buffer.getChannelData(i);
          for (let j = 0; j < length; j++) data[j] = typeof value === 'function' ? value(j) : value;
        });
        const source = context.createBufferSource();
        source.buffer = buffer;
        if (upmix) {
          const graph = RWAudioSurround.createUpmix(context);
          source.connect(graph.input); graph.output.connect(context.destination);
        } else {
          source.connect(context.destination);
          RWAudioSurround.create(context, source).disable();
        }
        source.start();
        return context.startRendering();
      }
      const bypass = await render([0.04, 0.08, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32], false);
      for (let i = 0; i < 8; i++) expect(bypass.getChannelData(i)[40000], (i + 1) * 0.04, 'bypass ' + i);
      for (const [left, right] of [[0.8, 0], [0, 0.4], [0.8, -0.4], [1, 1]]) {
        const rendered = await render([left, right], true);
        const expected = [0.5 * left, 0.5 * right, 0.25 * (left + right),
          0.125 * (left + right), 0.25 * left, 0.25 * right, 0.35 * left, 0.35 * right];
        expected.forEach((value, i) => expect(rendered.getChannelData(i)[40000], value, 'upmix channel ' + i));
      }
      async function lfeRms(frequency) {
        const rendered = await render([i => 0.5 * Math.sin(2 * Math.PI * frequency * i / sampleRate), 0], true);
        const data = rendered.getChannelData(3);
        let energy = 0;
        for (let i = length / 2; i < length; i++) energy += data[i] * data[i];
        return Math.sqrt(energy / (length / 2));
      }
      if ((await lfeRms(2000)) > (await lfeRms(40)) * 0.01) throw new Error('LFE lowpass is not attenuating high frequencies');
      return 'OFFLINE_SURROUND_PASS';
    })()
  `);
  console.log(result);
  win.destroy();
  app.exit(0);
}).catch(error => {
  console.error(error?.stack || error);
  app.exit(1);
});
