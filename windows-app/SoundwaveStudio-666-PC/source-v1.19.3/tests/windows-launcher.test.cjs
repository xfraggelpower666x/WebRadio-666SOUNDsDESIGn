'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('PowerShell falls back only when Windows PowerShell is absent', () => {
  const source = fs.readFileSync(path.join(root, 'src/shared/powershell.cjs'), 'utf8');
  const calls = [];
  let first = { error: { code: 'ENOENT' } };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, process: { platform: 'win32', env: { SystemRoot: 'C:\\Windows' } },
    require: () => ({ spawnSync: (exe) => { calls.push(exe); return calls.length === 1 ? first : { status: 0 }; } })
  });
  assert.equal(module.exports.runPowerShell([], {}).status, 0);
  assert.deepEqual(calls, ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', 'pwsh.exe']);
  calls.length = 0;
  first = { status: 1 };
  assert.equal(module.exports.runPowerShell([], {}).status, 1);
  assert.deepEqual(calls, ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe']);
});

function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radio-wave-launcher-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bin = path.join(dir, 'bin');
  const scripts = path.join(dir, 'scripts');
  fs.mkdirSync(bin);
  fs.mkdirSync(scripts);
  fs.copyFileSync(path.join(root, 'RADIO_WAVE.bat'), path.join(dir, 'RADIO_WAVE.bat'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { electron: '^31.0.0' } }));
  fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/electron': { version: '31.7.7' } } }));
  fs.writeFileSync(path.join(dir, 'create-deps.cjs'), [
    "const fs=require('fs');",
    "fs.mkdirSync('node_modules/electron',{recursive:true});",
    "fs.mkdirSync('node_modules/.bin',{recursive:true});",
    "for(const tool of ['electron-builder','electron-packager']) fs.writeFileSync('node_modules/.bin/'+tool+'.cmd','');",
    "fs.writeFileSync('node_modules/electron/package.json',JSON.stringify({version:'31.7.7'}));",
    "fs.writeFileSync('deps.ok','');"
  ].join('\n'));
  fs.writeFileSync(path.join(scripts, 'repair-electron-runtime.cjs'), [
    "const fs=require('fs');",
    "fs.appendFileSync('runtime.calls',process.argv[2]==='--check'?'check\\n':'repair\\n');",
    "if(process.argv[2]==='--check') process.exit(fs.existsSync('runtime.ok')?0:1);",
    "if(fs.existsSync('fail-repair')) process.exit(1);",
    "fs.writeFileSync('runtime.ok','');"
  ].join('\n'));
  const npm = [
    '@echo off',
    'echo %*>>npm.calls',
    'if "%~1"=="ls" if not exist deps.ok exit /b 1',
    'if "%~1"=="install" if exist fail-install exit /b 1',
    'if "%~1"=="install" node.exe create-deps.cjs',
    'exit /b %errorlevel%'
  ].join('\r\n');
  fs.writeFileSync(path.join(bin, 'npm.cmd'), npm);
  fs.writeFileSync(path.join(dir, 'npm-fixture.cmd'), npm);
  fs.writeFileSync(path.join(dir, 'list'), "process.exit(1);\n");
  fs.writeFileSync(path.join(dir, 'install'), [
    "const fs=require('fs'),path=require('path');",
    "fs.appendFileSync('winget.calls',process.argv.slice(2).join(' ')+'\\n');",
    "const target=path.join(process.cwd(),'bin');",
    "fs.mkdirSync(target,{recursive:true});",
    "fs.copyFileSync(process.execPath,path.join(target,'node.exe'));",
    "fs.copyFileSync('npm-fixture.cmd',path.join(target,'npm.cmd'));"
  ].join('\n'));
  fs.copyFileSync(process.execPath, path.join(bin, 'winget.exe'));
  const winGetLinks = path.join(dir, 'local-app-data', 'Microsoft', 'WinGet', 'Links');
  fs.mkdirSync(winGetLinks, { recursive: true });
  fs.copyFileSync(process.execPath, path.join(winGetLinks, 'winget.exe'));
  if (options.deps) {
    fs.mkdirSync(path.join(dir, 'node_modules', 'electron'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'electron', 'package.json'), JSON.stringify({ version: options.version || '31.7.7' }));
    if (!options.missingBin) {
      fs.mkdirSync(path.join(dir, 'node_modules', '.bin'));
      for (const tool of ['electron-builder', 'electron-packager']) fs.writeFileSync(path.join(dir, 'node_modules', '.bin', tool + '.cmd'), '');
    }
    fs.writeFileSync(path.join(dir, 'deps.ok'), '');
  }
  if (options.runtime) fs.writeFileSync(path.join(dir, 'runtime.ok'), '');
  if (options.failInstall) fs.writeFileSync(path.join(dir, 'fail-install'), '');
  if (options.failRepair) fs.writeFileSync(path.join(dir, 'fail-repair'), '');
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (['path', 'programfiles', 'localappdata'].includes(key.toLowerCase())) delete env[key];
  }
  env.PATH = [bin, ...(options.noNode ? [] : [path.dirname(process.execPath)]), path.join(process.env.SystemRoot, 'System32')].join(';');
  env.ProgramFiles = path.join(dir, 'program-files');
  env.LOCALAPPDATA = path.join(dir, 'local-app-data');
  if (options.noNode) fs.rmSync(path.join(bin, 'npm.cmd'));
  const result = spawnSync(process.env.ComSpec, ['/d', '/c', '.\\RADIO_WAVE.bat', 'check', '/nopause'], { cwd: dir, env, encoding: 'utf8', timeout: 120000 });
  return { dir, result };
}

if (process.platform === 'win32') {
  test('launcher reuses valid dependencies and Electron', t => {
    const { dir, result } = fixture(t, { deps: true, runtime: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'npm.calls'), 'utf8'), /^install /m);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'runtime.calls'), 'utf8'), /repair/);
  });

  test('launcher installs missing dependencies and repairs Electron', t => {
    const { dir, result } = fixture(t);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(path.join(dir, 'npm.calls'), 'utf8'), /^install /m);
    assert.equal(fs.readFileSync(path.join(dir, 'runtime.calls'), 'utf8'), 'check\nrepair\ncheck\n');
  });

  test('launcher reinstalls a dependency that differs from the lockfile', t => {
    const { dir, result } = fixture(t, { deps: true, runtime: true, version: '30.0.0' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(path.join(dir, 'npm.calls'), 'utf8'), /^install /m);
  });

  test('launcher restores missing build-tool commands', t => {
    const { dir, result } = fixture(t, { deps: true, runtime: true, missingBin: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(path.join(dir, 'npm.calls'), 'utf8'), /^install /m);
  });

  test('launcher stops when npm installation or Electron repair fails', t => {
    for (const options of [{ failInstall: true }, { deps: true, failRepair: true }]) {
      const { result } = fixture(t, options);
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /FEHLER/);
    }
  });

  test('launcher installs missing Node.js and npm via WinGet', t => {
    const { dir, result } = fixture(t, { noNode: true, runtime: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(path.join(dir, 'winget.calls'), 'utf8'), /OpenJS\.NodeJS\.LTS/);
  });
}
