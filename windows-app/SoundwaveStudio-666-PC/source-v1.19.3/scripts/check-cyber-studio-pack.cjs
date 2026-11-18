'use strict';
const { ensure } = require('./build-cyber-studio.cjs');
const { checkEncoder } = require('../src/shared/video-transcode.cjs');

module.exports = async function (context) {
  if (context.electronPlatformName === 'win32' && process.platform !== 'win32') {
    throw new Error('Build Windows packages on Windows so the bundled FFmpeg is ffmpeg.exe.');
  }
  checkEncoder();
  await ensure();
};
