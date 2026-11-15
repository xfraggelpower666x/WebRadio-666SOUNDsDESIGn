'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const { createCyberStudioLauncher } = require('../src/shared/milkdrop-cyber-studio.cjs');

function fixture(t) {
  const root = path.join(__dirname, `.cyber-test-${randomUUID()}`);
  const data = path.join(root, 'data');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, '666SD_Preset_Studio.exe'), '');
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  return { root, data };
}
function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  return child;
}

test('launches only bundled executable, waits for ready and deduplicates concurrent requests', async t => {
  const { root, data } = fixture(t);
  const child = fakeChild();
  let calls = 0;
  const launch = createCyberStudioLauncher({
    studioRoot: root, dataRoot: data, platform: 'win32',
    spawnProcess(exe, args, options) {
      calls++;
      assert.equal(exe, path.join(root, '666SD_Preset_Studio.exe'));
      assert.deepEqual(args, []);
      assert.equal(options.env.RADIO_WAVE_CYBER_STUDIO_DATA, data);
      assert.equal(options.cwd, data);
      return child;
    }
  });
  const first = launch(), second = launch();
  child.stdout.write('RADIO_WAVE_CYBER_');
  child.stdout.write('STUDIO_READY\r\n');
  assert.deepEqual(await first, { alreadyOpen: false });
  assert.deepEqual(await second, { alreadyOpen: true });
  assert.deepEqual(await launch(), { alreadyOpen: true });
  assert.equal(calls, 1);
  child.emit('close', 0);
});

test('reports missing executable and early process exit without a Python fallback', async t => {
  const { root, data } = fixture(t);
  fs.unlinkSync(path.join(root, '666SD_Preset_Studio.exe'));
  const missing = createCyberStudioLauncher({ studioRoot: root, dataRoot: data, platform: 'win32' });
  await assert.rejects(missing(), /studio_binary_missing/);
  fs.writeFileSync(path.join(root, '666SD_Preset_Studio.exe'), '');
  const child = fakeChild();
  const launch = createCyberStudioLauncher({ studioRoot: root, dataRoot: data, platform: 'win32', spawnProcess: () => child });
  const pending = launch();
  child.emit('close', 7);
  await assert.rejects(pending, /studio_exit_7/);
});

test('startup timeout does not start duplicate processes while the first is alive', async t => {
  const { root, data } = fixture(t);
  const child = fakeChild();
  let calls = 0;
  const launch = createCyberStudioLauncher({ studioRoot: root, dataRoot: data, platform: 'win32', timeoutMs: 5, spawnProcess: () => { calls++; return child; } });
  await assert.rejects(launch(), /studio_start_timeout/);
  await assert.rejects(launch(), /studio_start_timeout/);
  assert.equal(calls, 1);
  child.emit('close', 0);
});

test('real bundled executable starts without Python on PATH', { skip: process.env.CYBER_STUDIO_REAL_EXE_TEST !== '1' }, async t => {
  const { root, data } = fixture(t);
  const studioRoot = path.resolve(__dirname, '../build/cyber-studio');
  fs.mkdirSync(path.join(data, 'library'), { recursive: true });
  const existing = path.join(data, 'library', 'existing.milk');
  fs.writeFileSync(existing, 'user preset');
  const env = {
    ...process.env, PATH: path.join(process.env.SystemRoot, 'System32'),
    PYTHONHOME: path.join(root, 'nonexistent-python'), TEMP: root, TMP: root
  };
  delete env.SD_ENABLE_ASIO;
  const selfTest = spawnSync(path.join(studioRoot, '666SD_Preset_Studio.exe'),
    ['--radio-wave-studio-self-test'], { env, windowsHide: true, encoding: 'utf8', timeout: 60000 });
  assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.error?.message);
  assert.match(selfTest.stdout, /RADIO_WAVE_CYBER_STUDIO_SELF_TEST_OK/);
  let proc;
  const launch = createCyberStudioLauncher({
    studioRoot, dataRoot: data,
    spawnProcess(exe, args, options) {
      proc = spawn(exe, args, { ...options, env: {
        ...options.env, PATH: path.join(process.env.SystemRoot, 'System32'),
        PYTHONHOME: path.join(root, 'nonexistent-python'), TEMP: root, TMP: root
      } });
      return proc;
    }
  });
  try {
    assert.deepEqual(await launch(), { alreadyOpen: false });
    assert.deepEqual(await launch(), { alreadyOpen: true });
    assert.equal(fs.existsSync(path.join(data, 'library')), true);
    assert.equal(fs.readFileSync(existing, 'utf8'), 'user preset');
  } finally {
    if (proc?.pid) {
      const command = `$ids=@(Get-CimInstance Win32_Process -Filter 'ParentProcessId = ${proc.pid}' | Select-Object -ExpandProperty ProcessId); foreach($id in $ids){Stop-Process -Id $id -ErrorAction SilentlyContinue}; Stop-Process -Id ${proc.pid} -ErrorAction SilentlyContinue`;
      execFileSync(path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', command]);
      await new Promise(resolve => proc.once('close', resolve));
    }
  }
});
