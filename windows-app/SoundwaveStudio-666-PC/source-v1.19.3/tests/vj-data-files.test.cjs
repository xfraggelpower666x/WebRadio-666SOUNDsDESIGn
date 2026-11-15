'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { readSelectedFiles } = require('../src/shared/vj-data-files.cjs');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radio-wave-vj-data-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  return dir;
}

test('reads only selected bounded files of the requested type', async t => {
  const dir = fixture(t), first = path.join(dir, 'first.json'), second = path.join(dir, 'second.json');
  fs.writeFileSync(first, '[{"dst":"1"}]');
  fs.writeFileSync(second, '[{"dst":"0"}]');
  assert.deepEqual(await readSelectedFiles([first, second], 'parity'), [
    { name: 'first.json', text: '[{"dst":"1"}]' },
    { name: 'second.json', text: '[{"dst":"0"}]' }
  ]);
  await assert.rejects(readSelectedFiles([first], 'sync'), /Invalid/);
  await assert.rejects(readSelectedFiles(['relative.json'], 'parity'), /Invalid/);
  await assert.rejects(readSelectedFiles([first, second], 'sync'), /Invalid/);
});

test('rejects empty, oversized and invalid UTF-8 files', async t => {
  const dir = fixture(t), file = path.join(dir, 'sync.csv');
  fs.writeFileSync(file, '');
  await assert.rejects(readSelectedFiles([file], 'sync'), /empty or too large/);
  fs.writeFileSync(file, Buffer.alloc(2 * 1024 * 1024 + 1));
  await assert.rejects(readSelectedFiles([file], 'sync'), /too large/);
  fs.writeFileSync(file, Buffer.from([0xff]));
  await assert.rejects(readSelectedFiles([file], 'sync'), /UTF-8/);
});

test('IPC accepts only a data kind and reads paths chosen by the native dialog', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const start = main.indexOf("registerIpc('dialog:openVjData'");
  const end = main.indexOf("registerIpc('app:open-site'", start);
  assert.ok(start >= 0 && end > start);
  const handlers = {}, calls = [];
  const context = {
    registerIpc: (name, role, handler) => { assert.equal(role, 'main'); handlers[name] = handler; },
    mainWindow: {},
    dialog: { showOpenDialog: async (_window, options) => {
      calls.push(options);
      return { canceled: false, filePaths: ['chosen-by-dialog'] };
    } },
    readVjDataFiles: async (paths, kind) => ({ paths, kind })
  };
  runInNewContext(main.slice(start, end), context);
  await assert.rejects(handlers['dialog:openVjData']({}, '../secret'), /Invalid VJ data type/);
  const result = await handlers['dialog:openVjData']({}, 'sync');
  assert.equal(result.kind, 'sync');
  assert.equal(result.paths[0], 'chosen-by-dialog');
  assert.equal(calls.length, 1);
});
