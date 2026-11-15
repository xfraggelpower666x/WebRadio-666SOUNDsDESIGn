'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { runPowerShell } = require('../src/shared/powershell.cjs');

const root = path.join(__dirname, '..');
const electron = path.join(root, 'node_modules', 'electron');

function checkRuntime(directory, version) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(path.join(directory, 'electron.exe'), ['--version'], {
    encoding: 'utf8', timeout: 20000, windowsHide: true, env
  });
  if (result.status !== 0 || result.stdout.trim() !== 'v' + version) {
    throw new Error('electron.exe --version: ' +
      (result.error?.message || result.stderr?.trim() || result.stdout?.trim() || result.status));
  }
  return result.stdout.trim();
}

async function replaceRuntime(stage, extracted) {
  const targets = [
    { target: path.join(electron, 'dist'), next: extracted, backup: path.join(stage, 'old-dist') },
    { target: path.join(electron, 'path.txt'), next: path.join(stage, 'new-path.txt'), backup: path.join(stage, 'old-path.txt') }
  ];
  try {
    for (const entry of targets) {
      try {
        await fs.rename(entry.target, entry.backup);
        entry.backedUp = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await fs.rename(entry.next, entry.target);
      entry.replaced = true;
    }
  } catch (error) {
    for (const entry of targets.reverse()) {
      try {
        if (entry.replaced) await fs.rename(entry.target, entry.next);
        if (entry.backedUp) await fs.rename(entry.backup, entry.target);
      } catch (rollbackError) {
        console.error('Ruecksicherung fehlgeschlagen:', entry.backup, rollbackError.message);
      }
    }
    throw error;
  }
}

async function main() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Dieser Reparaturweg erwartet Windows mit Node.js x64.');
  }
  const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
  const lock = await readJson(path.join(root, 'package-lock.json'));
  const installed = await readJson(path.join(electron, 'package.json')).catch(error => {
    if (error.code === 'ENOENT') {
      throw new Error('Electron-npm-Paket fehlt. Im Projektordner manuell ausfuehren: npm ci --include=dev --foreground-scripts');
    }
    throw error;
  });
  const version = lock.packages['node_modules/electron'].version;
  if (installed.name !== 'electron' || installed.version !== version) {
    throw new Error('Installiertes Electron-Paket stimmt nicht mit package-lock.json ueberein.');
  }
  if (process.argv[2] === '--check') {
    const executable = (await fs.readFile(path.join(electron, 'path.txt'), 'utf8')).trim();
    if (executable !== 'electron.exe') throw new Error('Electron path.txt ist ungueltig.');
    console.log('ELECTRON_RUNTIME_GATE=PASS ' + checkRuntime(path.join(electron, 'dist'), version));
    return;
  }
  const asset = `electron-v${version}-win32-x64.zip`;
  const expected = (await readJson(path.join(electron, 'checksums.json')))[asset];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Electron-SHA-256 fehlt: ' + asset);
  const fromElectron = createRequire(path.join(electron, 'package.json'));
  const { downloadArtifact } = fromElectron('@electron/get');
  const stage = await fs.mkdtemp(path.join(electron, '.runtime-repair-'));
  let keepStage = false;
  try {
    console.log('Lade und pruefe ' + asset + ' ...');
    const archive = await downloadArtifact({
      version, artifactName: 'electron', platform: 'win32', arch: 'x64',
      checksums: { [asset]: expected }, cacheRoot: path.join(stage, 'cache')
    });
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    if (hash.digest('hex') !== expected) throw new Error('SHA-256 des Electron-Archivs stimmt nicht.');
    const extracted = path.join(stage, 'new-dist');
    await fs.mkdir(extracted);
    let extraction = spawnSync('tar.exe', ['-xf', archive, '-C', extracted], {
      encoding: 'utf8', timeout: 120000, windowsHide: true
    });
    if (extraction.error?.code === 'ENOENT') {
      const quote = value => "'" + value.replace(/'/g, "''") + "'";
      extraction = runPowerShell([
        '-NoProfile', '-NonInteractive', '-Command',
        `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory(${quote(archive)}, ${quote(extracted)})`
      ], { encoding: 'utf8', timeout: 120000, windowsHide: true });
    }
    if (extraction.status !== 0) {
      throw new Error('Electron-Archiv entpacken fehlgeschlagen: ' +
        (extraction.error?.message || extraction.stderr?.trim() || extraction.status));
    }
    const actualVersion = checkRuntime(extracted, version);
    await fs.writeFile(path.join(stage, 'new-path.txt'), 'electron.exe', 'ascii');
    keepStage = true;
    await replaceRuntime(stage, extracted);
    keepStage = false;
    console.log('ELECTRON_RUNTIME_GATE=PASS ' + actualVersion);
    console.log('Datei: ' + path.join(electron, 'dist', 'electron.exe'));
  } finally {
    if (keepStage) console.error('Reparaturdateien fuer Ruecksicherung:', stage);
    else await fs.rm(stage, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error('ELECTRON_RUNTIME_GATE=FAIL: ' + error.message);
  process.exitCode = 1;
});
