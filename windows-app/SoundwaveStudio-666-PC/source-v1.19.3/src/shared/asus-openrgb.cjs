'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const connect = ['--client', '127.0.0.1:6742'];

async function verifyExecutable(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file) ||
      path.basename(file).toLowerCase() !== 'openrgb.exe' || !(await fs.stat(file)).isFile()) {
    throw new Error('Select the installed OpenRGB.exe.');
  }
  return file;
}

async function listAsus(file) {
  const { stdout } = await run(await verifyExecutable(file), [...connect, '--list-devices'],
    { windowsHide: true, timeout: 6000, maxBuffer: 256 * 1024 });
  const found = [];
  for (const block of stdout.split(/(?=^\d+:[ \t])/m)) {
    const row = /^(\d+):[ \t]*(.+)$/m.exec(block);
    if (!row || !/\b(?:ASUS|AURA|ASUSTeK)\b/i.test(block)) continue;
    const modes = /^[ \t]*Modes:[ \t]*(.+)$/mi.exec(block)?.[1] || '';
    const fixedMode = modes.match(/\b(?:static|direct)\b/i)?.[0];
    if (fixedMode) found.push({ i: Number(row[1]), name: row[2].trim().slice(0,120), mode: fixedMode });
  }
  return found;
}

async function setAsus(file, selection, color, authorized) {
  if (typeof color !== 'string' || !/^[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid ASUS color.');
  const device = (await listAsus(file)).find(item=>item.i===selection?.i && item.name===selection.name);
  if (!device) throw new Error('ASUS device disappeared. Refresh the device list.');
  const executable=await verifyExecutable(file);
  if(!authorized())throw new Error('govee_auth_required');
  const { stdout, stderr } = await run(executable, [...connect,'--device',String(device.i),'--mode',device.mode,'--color',color],
    { windowsHide: true, timeout: 6000, maxBuffer: 256 * 1024 });
  if (/failed|invalid|not found|unable to connect/i.test(stdout+' '+stderr)) throw new Error('OpenRGB rejected the ASUS command.');
  return true;
}

module.exports = { listAsus, setAsus };
