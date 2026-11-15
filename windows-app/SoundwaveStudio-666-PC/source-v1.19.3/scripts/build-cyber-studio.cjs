'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'tools', 'milkdrop-cyber-studio');
const buildRoot = path.join(root, 'build');
const output = path.join(buildRoot, 'cyber-studio');
const environment = path.join(buildRoot, 'cyber-studio-env');
const workRoot = path.join(buildRoot, 'cyber-studio-work');
const pythonUrl = 'https://www.python.org/ftp/python/3.13.17/python-3.13.17-amd64.zip';
const pythonSha256 = 'b26ca4b4ee51e157836049934d2b8eabd55939be296f3130254251b6df96ec2f';
const requiredNotices = ['Python/LICENSE.txt', 'Tk/license.terms', 'TCL.txt', 'TKDND.txt', 'PORTAUDIO.txt'];

function files(dir, prefix = '', ignorePythonCache = false) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => !ignorePythonCache || (entry.name !== '__pycache__' && !entry.name.endsWith('.pyc'))).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return files(path.join(dir, entry.name), relative, ignorePythonCache);
    if (entry.isFile()) return [relative];
    throw new Error(`Unexpected non-file in Studio build: ${path.join(dir, entry.name)}`);
  });
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function sourceHash() {
  const hash = crypto.createHash('sha256');
  for (const relative of files(source, '', true)) {
    hash.update(`${relative}\0`).update(fs.readFileSync(path.join(source, relative)));
  }
  hash.update(fs.readFileSync(__filename));
  return hash.digest('hex');
}
function requirements() {
  return fs.readFileSync(path.join(source, 'build-requirements.txt'), 'utf8').trim().split(/\r?\n/);
}
function verify(dir = output) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    if (manifest.schema !== 2 || manifest.sourceHash !== sourceHash()) throw new Error('source changed');
    const expected = ['666SD_Preset_Studio.exe', 'scripts/directx_sdk.ps1', ...requiredNotices.map(n => `notices/${n}`)];
    for (const requirement of requirements()) {
      const [name, version] = requirement.split('==');
      if (!Object.keys(manifest.files).some(p => p.startsWith(`notices/${name}-${version}/`))) throw new Error(`notice missing: ${name}`);
    }
    for (const name of expected) if (!manifest.files[name]) throw new Error(`file missing: ${name}`);
    const listed = Object.keys(manifest.files).sort();
    const present = files(dir).filter(name => name !== 'manifest.json').sort();
    if (JSON.stringify(listed) !== JSON.stringify(present)) throw new Error('unexpected or missing bundle files');
    for (const [name, digest] of Object.entries(manifest.files)) {
      if (name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('invalid manifest path');
      if (sha(path.join(dir, ...name.split('/'))) !== digest) throw new Error(`file changed: ${name}`);
    }
    return true;
  } catch (error) {
    throw new Error(`Cyber Studio bundle is missing or stale (${error.message}). Run node scripts\\build-cyber-studio.cjs.`);
  }
}
function childEnv(scratch) {
  const env = { ...process.env, TEMP: scratch, TMP: scratch, PYTHONNOUSERSITE: '1', PYINSTALLER_CONFIG_DIR: path.join(scratch, 'pyinstaller-cache') };
  for (const key of Object.keys(env)) {
    if (/^(PYTHONHOME|PYTHONPATH|PIP_TARGET|PIP_PREFIX|PIP_USER|PIP_CONFIG_FILE|SD_ENABLE_ASIO)$/i.test(key)) delete env[key];
  }
  return env;
}
function run(file, args, scratch, options = {}) {
  const result = spawnSync(file, args, {
    cwd: root, env: childEnv(scratch), windowsHide: true,
    encoding: 'utf8', ...options
  });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(file)} failed (${result.error?.message || result.status}): ${(result.stderr || result.stdout || '').slice(-1500)}`);
  return result.stdout || '';
}
const probeScript = [
  'import json,sys,tkinter,importlib.metadata as m',
  'req=json.loads(sys.argv[1]); missing=[]; wrong=[]',
  'for name,version in req:',
  ' try: found=m.version(name)',
  ' except m.PackageNotFoundError: missing.append(name+"=="+version); continue',
  ' if found!=version: wrong.append(name+"=="+found)',
  'print(json.dumps({"version":list(sys.version_info[:3]),"bits":sys.maxsize.bit_length()+1,"venv":sys.prefix!=sys.base_prefix,"missing":missing,"wrong":wrong}))'
].join('\n');
function probe(python, scratch) {
  try {
    const req = requirements().map(line => line.split('=='));
    const info = JSON.parse(run(python, ['-B', '-I', '-c', probeScript, JSON.stringify(req)], scratch));
    if (info.version.join('.') !== '3.13.17' || info.bits !== 64) return null;
    return info;
  } catch { return null; }
}
function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 60000 }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`Python download returned HTTP ${response.statusCode}`)); return; }
      const stream = fs.createWriteStream(destination, { flags: 'wx' });
      let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 150 * 1024 * 1024) request.destroy(new Error('Python download exceeds size limit')); });
      response.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', () => stream.close(resolve));
      response.pipe(stream);
    });
    request.on('timeout', () => request.destroy(new Error('Python download timed out')));
    request.on('error', reject);
  });
}
async function findPython(scratch) {
  const managed = path.join(environment, 'venv', 'Scripts', 'python.exe');
  const validation = path.join(root, '.cyber-studio-validation', 'venv', 'Scripts', 'python.exe');
  const explicit = process.env.CYBER_STUDIO_PYTHON;
  const active = process.env.VIRTUAL_ENV && path.join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe');
  const pathCandidates = (process.env.PATH || '').split(path.delimiter)
    .filter(dir => dir && !/WindowsApps/i.test(dir))
    .map(dir => path.join(dir, 'python.exe'));
  if (explicit && (!path.isAbsolute(explicit) || !fs.existsSync(explicit))) throw new Error('CYBER_STUDIO_PYTHON must be an existing absolute Python executable path.');
  for (const candidate of [explicit, managed, validation, active].filter(Boolean)) {
    if (!fs.existsSync(candidate)) continue;
    const info = probe(candidate, scratch);
    if (info?.venv && !info.missing.length && !info.wrong.length) return candidate;
    if (candidate === managed && (!info || info.wrong.length)) throw new Error(`Existing isolated Studio venv is incompatible; preserve or move it before retrying: ${managed}`);
  }
  let base;
  for (const candidate of fs.existsSync(managed) ? [] : [
    explicit,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python313', 'python.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Python', 'pythoncore-3.13-64', 'python.exe'),
    ...pathCandidates
  ].filter(Boolean)) {
    if (fs.existsSync(candidate) && probe(candidate, scratch)) { base = candidate; break; }
  }
  if (!base && !fs.existsSync(managed)) {
    const archive = path.join(scratch, 'python.zip');
    console.log('Downloading pinned Python 3.13.17 into the project build environment.');
    await download(pythonUrl, archive);
    if (sha(archive) !== pythonSha256) throw new Error('Python download SHA-256 mismatch; refusing extraction.');
    const runtime = path.join(environment, `python-${crypto.randomUUID()}`);
    const quote = value => `'${value.replace(/'/g, "''")}'`;
    run(path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory(${quote(archive)}, ${quote(runtime)})`], scratch);
    base = path.join(runtime, 'python.exe');
    if (!probe(base, scratch)) throw new Error('Downloaded Python lacks the required x64 Python 3.13.17 and Tcl/Tk.');
  }
  if (!fs.existsSync(managed)) {
    if (fs.existsSync(path.dirname(path.dirname(managed)))) throw new Error(`Incomplete Studio venv exists; preserve or move it before retrying: ${path.dirname(path.dirname(managed))}`);
    console.log('Creating project-local Studio build venv.');
    run(base, ['-B', '-I', '-m', 'venv', path.dirname(path.dirname(managed))], scratch);
  }
  let info = probe(managed, scratch);
  if (!info?.venv || info.wrong.length) throw new Error('Project Studio venv is incompatible; no packages were replaced.');
  if (info.missing.length) {
    console.log(`Installing missing packages in project-local Studio venv: ${info.missing.join(', ')}`);
    const site = path.join(environment, 'venv', 'Lib', 'site-packages');
    run(managed, ['-B', '-I', '-m', 'pip', '--isolated', 'install', '--no-cache-dir', '--no-input', '--no-deps', '--target', site, ...info.missing], scratch, { stdio: 'inherit' });
  }
  info = probe(managed, scratch);
  if (!info?.venv || info.missing.length || info.wrong.length) throw new Error('Studio build prerequisites could not be verified in the project venv.');
  return managed;
}
async function ensure() {
  try { verify(); console.log('Reusing verified Cyber Studio bundle.'); return; } catch {}
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('A Studio rebuild requires Windows x64.');
  fs.mkdirSync(buildRoot, { recursive: true });
  const lock = path.join(buildRoot, 'cyber-studio.lock');
  try { fs.mkdirSync(lock); } catch { throw new Error(`Another Studio build may be running, or a stale lock exists: ${lock}`); }
  try {
    try { verify(); return; } catch {}
    fs.mkdirSync(environment, { recursive: true });
    fs.mkdirSync(workRoot, { recursive: true });
    const scratch = path.join(workRoot, crypto.randomUUID());
    const stage = path.join(buildRoot, `cyber-studio-stage-${crypto.randomUUID()}`);
    fs.mkdirSync(scratch);
    fs.mkdirSync(stage);
    const before = sourceHash();
    const python = await findPython(scratch);
    run(python, ['-B', '-I', '-c', 'import tkinter, PyInstaller, PIL, tkinterdnd2, sounddevice'], scratch);
    console.log('Building standalone Cyber Studio.');
    run(python, ['-B', '-I', '-m', 'PyInstaller', '--noconfirm', '--onefile', '--console',
      '--name', '666SD_Preset_Studio', '--distpath', stage, '--workpath', scratch,
      '--specpath', scratch, '--additional-hooks-dir', path.join(source, 'hooks'),
      '--collect-all', 'PIL', path.join(source, 'src', 'gui.py')], scratch, { stdio: 'inherit' });
    fs.mkdirSync(path.join(stage, 'scripts'));
    fs.copyFileSync(path.join(source, 'scripts', 'directx_sdk.ps1'), path.join(stage, 'scripts', 'directx_sdk.ps1'), fs.constants.COPYFILE_EXCL);
    run(python, ['-B', '-I', path.join(source, 'collect_notices.py'), path.join(stage, 'notices')], scratch);
    if (before !== sourceHash()) throw new Error('Studio source changed while building; staged output retained and old output unchanged.');
    const hashes = Object.fromEntries(files(stage).map(name => [name, sha(path.join(stage, ...name.split('/')))]));
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify({ schema: 2, sourceHash: before, files: hashes }, null, 2), { flag: 'wx' });
    verify(stage);
    let backup;
    if (fs.existsSync(output)) {
      const backups = path.join(buildRoot, 'cyber-studio-backups');
      fs.mkdirSync(backups, { recursive: true });
      backup = path.join(backups, crypto.randomUUID());
      fs.renameSync(output, backup);
    }
    try { fs.renameSync(stage, output); }
    catch (error) {
      if (backup) {
        try { fs.renameSync(backup, output); }
        catch { throw new Error(`Failed to install Studio bundle. Previous output preserved at ${backup}; staged output at ${stage}.`); }
      }
      throw error;
    }
    console.log(`Cyber Studio bundle ready.${backup ? ` Previous output preserved at ${backup}.` : ''}`);
  } finally { fs.rmdirSync(lock); }
}
if (require.main === module) {
  ensure().catch(error => { console.error(`Cyber Studio: ${error.message}`); process.exitCode = 1; });
}
module.exports = { ensure, verify, sourceHash };
