'use strict';

const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { devDependencies } = require('../package.json');

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error('RADIO WAVE requires Node.js 22.12 or newer.');
  process.exit(1);
}

if (process.argv.includes('--node-only')) process.exit(0);

try {
  if (require('electron/package.json').version !== devDependencies.electron) {
    throw new Error('The installed Electron package differs from the locked version.');
  }
  const executable = require('electron');
  if (!existsSync(executable)) throw new Error('Electron executable missing: ' + executable);
  const version = execFileSync(executable, ['--version'], {
    encoding: 'utf8',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    timeout: 15000,
    windowsHide: true
  }).trim();
  console.log('Electron executable ready · ' + executable + ' · Node ' + version);
} catch (error) {
  console.error(error.message);
  console.error('Run npm ci --include=dev --foreground-scripts, then retry.');
  process.exitCode = 1;
}
