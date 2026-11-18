'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawnSync } = require('node:child_process');

function encoderPath() {
  let file;
  try {
    const root = path.dirname(require.resolve('ffmpeg-static/package.json'));
    file = path.join(root, process.platform==='win32' ? 'ffmpeg.exe' : 'ffmpeg');
  } catch {}
  if (typeof file !== 'string') throw new Error('FFmpeg fehlt. Die Windows-Startdatei erneut ausführen.');
  if (process.versions.electron) file = file.replace(/([/\\])app\.asar(?=[/\\])/, '$1app.asar.unpacked');
  if (!fs.existsSync(file)) throw new Error('FFmpeg fehlt. Die Windows-Startdatei erneut ausführen.');
  return file;
}

function checkEncoder(file = encoderPath()) {
  const test = spawnSync(file, ['-hide_banner', '-encoders'], {
    encoding: 'utf8', windowsHide: true, timeout: 10000
  });
  if (test.status !== 0 || !/\blibx264\b/.test(test.stdout) || !/\baac\b/.test(test.stdout)) {
    throw new Error('FFmpeg mit H.264 (libx264) und AAC ist nicht verfügbar.');
  }
  return file;
}

function writeMp4(source, destination, signal, file = encoderPath(), audioRate = 192000) {
  const bitrate = [96000, 128000, 192000, 256000].includes(audioRate) ? audioRate : 192000;
  const args = ['-nostdin','-hide_banner','-loglevel','error','-xerror','-n',
    '-protocol_whitelist','file','-f','matroska','-i',source,'-map','0:v:0','-map','0:a:0',
    '-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2',
    '-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a',String(bitrate),'-movflags','+faststart','-f','mp4',destination];
  return new Promise((resolve,reject) => {
    execFile(file,args,{windowsHide:true,signal,maxBuffer:256*1024},(error,_out,stderr)=>{
      if (error) reject(new Error(error.name==='AbortError' ? 'video_write_aborted' :
        'MP4-Konvertierung fehlgeschlagen: '+(stderr.trim().split(/\r?\n/).slice(-2).join(' ').slice(0,300) || error.code || 'unknown error')));
      else resolve();
    });
  });
}

module.exports = { encoderPath, checkEncoder, writeMp4 };
if (require.main === module) {
  try { checkEncoder(); console.log('PASS FFmpeg H.264 / AAC'); }
  catch (error) { console.error(error.message); process.exitCode=1; }
}
