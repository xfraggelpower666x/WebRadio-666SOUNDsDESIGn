'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const project = path.resolve(__dirname, '..');
function fixture(t, options = {}) {
  const root = path.join(__dirname, `.cyber-build-test-${randomUUID()}`);
  const source = path.join(root, 'tools', 'milkdrop-cyber-studio');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(path.join(project, 'tools', 'milkdrop-cyber-studio'), source, {
    recursive: true, filter: file => !file.includes('__pycache__')
  });
  const script = path.join(root, 'scripts', 'build-cyber-studio.cjs');
  fs.copyFileSync(path.join(project, 'scripts', 'build-cyber-studio.cjs'), script);
  const managed = path.join(root, 'build', 'cyber-studio-env', 'venv', 'Scripts', 'python.exe');
  const candidate = options.missing ? managed : path.join(root, 'candidate', 'Scripts', 'python.exe');
  fs.mkdirSync(path.dirname(candidate), { recursive: true });
  fs.writeFileSync(candidate, '');
  if (options.missing) fs.mkdirSync(path.join(root, 'build', 'cyber-studio-env', 'venv', 'Lib', 'site-packages'), { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  const calls = [];
  let missing = options.missing ? ['pillow==12.3.0'] : [];
  const child = {
    spawnSync(file, args) {
      calls.push({ file, args });
      if (args.some(arg => arg.includes('req=json.loads'))) {
        return { status: 0, stdout: JSON.stringify({ version: [3, 13, 17], bits: 64, venv: true, missing, wrong: [] }) };
      }
      if (args.includes('pip')) { missing = []; return { status: 0 }; }
      if (args.includes('PyInstaller')) {
        if (options.failBuild) return { status: 1, stderr: 'simulated failure' };
        fs.writeFileSync(path.join(args[args.indexOf('--distpath') + 1], '666SD_Preset_Studio.exe'), 'standalone');
      }
      if (args.some(arg => arg.endsWith('collect_notices.py'))) {
        const notices = args.at(-1);
        for (const name of ['Python/LICENSE.txt', 'Tk/license.terms', 'TCL.txt', 'TKDND.txt', 'PORTAUDIO.txt']) {
          const dest = path.join(notices, ...name.split('/'));
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, name);
        }
        for (const line of fs.readFileSync(path.join(source, 'build-requirements.txt'), 'utf8').trim().split(/\r?\n/)) {
          const [name, version] = line.split('==');
          const dir = path.join(notices, `${name}-${version}`);
          fs.mkdirSync(dir);
          fs.writeFileSync(path.join(dir, 'LICENSE'), line);
        }
      }
      return { status: 0, stdout: '' };
    }
  };
  const module = { exports: {} };
  const fakeProcess = { ...process, platform: 'win32', arch: 'x64', env: { ...process.env, CYBER_STUDIO_PYTHON: candidate } };
  const load = name => name === 'node:child_process' ? child : require(name);
  vm.runInNewContext(fs.readFileSync(script, 'utf8'), { require: load, module, __dirname: path.dirname(script), __filename: script, process: fakeProcess, console, Buffer, setTimeout, clearTimeout });
  return { root, candidate, calls, builder: module.exports };
}

test('stale output is preserved while a verified staged bundle replaces it', async t => {
  const { root, builder } = fixture(t);
  const output = path.join(root, 'build', 'cyber-studio');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'user-existing.txt'), 'preserve');
  await builder.ensure();
  assert.equal(builder.verify(), true);
  const backups = path.join(root, 'build', 'cyber-studio-backups');
  assert.equal(fs.readFileSync(path.join(backups, fs.readdirSync(backups)[0], 'user-existing.txt'), 'utf8'), 'preserve');
  fs.writeFileSync(path.join(output, 'unlisted-user-file.txt'), 'private');
  assert.throws(() => builder.verify(), /unexpected or missing/);
  fs.unlinkSync(path.join(output, 'unlisted-user-file.txt'));
  fs.writeFileSync(path.join(output, 'unexpected.pyc'), 'unexpected');
  assert.throws(() => builder.verify(), /unexpected or missing/);
  fs.unlinkSync(path.join(output, 'unexpected.pyc'));
  fs.writeFileSync(path.join(output, 'notices', 'PORTAUDIO.txt'), 'tampered');
  assert.throws(() => builder.verify(), /stale/);
});

test('a failed staged build leaves existing output untouched', async t => {
  const { root, builder } = fixture(t, { failBuild: true });
  const output = path.join(root, 'build', 'cyber-studio');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'keep.txt'), 'original');
  await assert.rejects(builder.ensure(), /simulated failure/);
  assert.equal(fs.readFileSync(path.join(output, 'keep.txt'), 'utf8'), 'original');
});

test('only missing pinned packages are installed into the project venv', async t => {
  const { root, calls, builder } = fixture(t, { missing: true });
  await builder.ensure();
  const installs = calls.filter(call => call.args.includes('pip'));
  assert.equal(installs.length, 1);
  assert.ok(installs[0].args.includes('--isolated'));
  assert.equal(installs[0].args.at(-1), 'pillow==12.3.0');
  assert.equal(installs[0].args[installs[0].args.indexOf('--target') + 1], path.join(root, 'build', 'cyber-studio-env', 'venv', 'Lib', 'site-packages'));
});
