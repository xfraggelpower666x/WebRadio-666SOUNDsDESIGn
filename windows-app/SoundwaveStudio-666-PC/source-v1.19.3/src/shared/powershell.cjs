'use strict';

const { spawnSync } = require('node:child_process');

function runPowerShell(args, options) {
  const executable = process.platform === 'win32' && process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell.exe';
  const result = spawnSync(executable, args, options);
  return result.error?.code === 'ENOENT' ? spawnSync('pwsh.exe', args, options) : result;
}

module.exports = { runPowerShell };
