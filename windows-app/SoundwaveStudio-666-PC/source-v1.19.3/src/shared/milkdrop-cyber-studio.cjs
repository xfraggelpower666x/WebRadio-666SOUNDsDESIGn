'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function createCyberStudioLauncher({ studioRoot, dataRoot, spawnProcess = spawn, platform = process.platform, timeoutMs = 45000 }) {
  let child;
  let opening;
  let ready = false;
  async function start() {
    if (platform !== 'win32') throw new Error('windows_required');
    const exe = path.join(studioRoot, '666SD_Preset_Studio.exe');
    if (!fs.existsSync(exe)) throw new Error('studio_binary_missing');
    fs.mkdirSync(path.join(dataRoot, 'logs'), { recursive: true });
    const log = fs.openSync(path.join(dataRoot, 'logs', 'RADIO_WAVE_STUDIO_START.log'), 'a');
    let proc;
    try {
      fs.writeSync(log, `\n${new Date().toISOString()}\n`);
      const env = { ...process.env, RADIO_WAVE_CYBER_STUDIO_DATA: dataRoot };
      for (const key of Object.keys(env)) if (key.toUpperCase() === 'SD_ENABLE_ASIO') delete env[key];
      proc = spawnProcess(exe, [], {
        cwd: dataRoot, windowsHide: true,
        env,
        stdio: ['ignore', 'pipe', log]
      });
    } finally { fs.closeSync(log); }
    child = proc;
    ready = false;
    proc.once('close', () => { if (child === proc) { child = null; ready = false; } });
    return new Promise((resolve, reject) => {
      let output = '';
      let settled = false;
      const timer = setTimeout(() => finish(new Error('studio_start_timeout')), timeoutMs);
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error); else { ready = true; resolve(); }
      }
      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', chunk => {
        output = (output + chunk).slice(-4096);
        if (/(?:^|\n)RADIO_WAVE_CYBER_STUDIO_READY\r?\n/.test(output)) finish();
      });
      proc.once('error', error => { if (child === proc) child = null; finish(error); });
      proc.once('close', code => finish(new Error(`studio_exit_${code}`)));
    });
  }
  return async () => {
    if (opening) { await opening; return { alreadyOpen: true }; }
    if (child) {
      if (!ready) throw new Error('studio_start_timeout');
      return { alreadyOpen: true };
    }
    opening = start();
    try { await opening; return { alreadyOpen: false }; } finally { opening = null; }
  };
}
module.exports = { createCyberStudioLauncher };
