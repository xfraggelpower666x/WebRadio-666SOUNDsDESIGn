'use strict';

const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');

const probe = promisify(execFile);
const readyLine = 'RADIO_WAVE_CYBER_STUDIO_READY';

async function findPython() {
  const check = 'import sys, tkinter; assert sys.version_info >= (3, 10); print(sys.executable)';
  const candidates = [];
  if (process.env.LOCALAPPDATA) {
    for (const version of ['313', '314', '312', '311', '310']) {
      const exe = path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python' + version, 'python.exe');
      if (fs.existsSync(exe)) candidates.push([exe]);
    }
  }
  candidates.push(['py.exe', '-3'], ['python.exe'], ['python3.exe']);
  for (const [command, ...args] of candidates) {
    try {
      const { stdout } = await probe(command, [...args, '-E', '-c', check], {
        windowsHide: true,
        timeout: 4000
      });
      const executable = stdout.trim();
      if (path.isAbsolute(executable) && fs.existsSync(executable)) return executable;
    } catch {
      // Der nächste Interpreter kann Tcl/Tk mitbringen.
    }
  }
  throw new Error('python_tkinter_missing');
}

function createCyberStudioLauncher({ studioRoot, dataRoot }) {
  let child;
  let opening;

  async function start() {
    if (process.platform !== 'win32') throw new Error('windows_required');
    const entry = path.join(studioRoot, 'src', 'gui.py');
    if (!fs.existsSync(entry)) throw new Error('studio_files_missing');
    const python = await findPython();

    const logDir = path.join(dataRoot, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const fd = fs.openSync(path.join(logDir, 'RADIO_WAVE_STUDIO_START.log'), 'a');
    let processHandle;
    try {
      fs.writeSync(fd, '\n' + new Date().toISOString() + '\n');
      processHandle = spawn(python, ['-B', '-E', '-u', entry], {
        cwd: dataRoot,
        env: { ...process.env, RADIO_WAVE_CYBER_STUDIO_DATA: dataRoot },
        stdio: ['ignore', 'pipe', fd],
        windowsHide: true
      });
    } finally {
      fs.closeSync(fd);
    }
    child = processHandle;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('studio_start_timeout'));
        processHandle.kill();
      }, 15000);
      let output = '';
      processHandle.stdout.setEncoding('utf8');
      function onData(chunk) {
        output += chunk;
        if (!output.includes(readyLine + '\n') && !output.includes(readyLine + '\r\n')) {
          output = output.slice(-256);
          return;
        }
        processHandle.stdout.off('data', onData);
        processHandle.stdout.resume();
        clearTimeout(timeout);
        resolve();
      }
      processHandle.stdout.on('data', onData);
      processHandle.once('error', fail);
      processHandle.once('close', (code) => fail(new Error('studio_exit_' + code)));

      function fail(error) {
        clearTimeout(timeout);
        if (child === processHandle) child = null;
        reject(error);
      }
    });
  }

  return async () => {
    if (opening) {
      await opening;
      return { alreadyOpen: true };
    }
    if (child) return { alreadyOpen: true };
    opening = start();
    try {
      await opening;
      return { alreadyOpen: false };
    } finally {
      opening = null;
    }
  };
}

module.exports = { createCyberStudioLauncher };
