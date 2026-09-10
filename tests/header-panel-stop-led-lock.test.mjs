import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

const headerIds = [
  'statusStream',
  'statusBuffer',
  'statusSource',
  'statusMeta',
  'statusWorker',
  'statusAudio',
  'statusWatchdog',
  'statusReconnect',
  'statusMeter',
  'mainBtn',
  'fallbackBtn',
  'statusDiscord',
  'statusAdmin',
  'statusGovee'
];

test('shared status stop lock is mirrored to public build', async () => {
  const root = await read('js/shared-status.js');
  const pub = await read('public/js/shared-status.js');
  assert.equal(pub, root);
});

test('all cockpit header LEDs are transport-stop locked', async () => {
  const source = await read('js/shared-status.js');
  assert.match(source, /const STOP_LOCKED_HEADER_LED_IDS = new Set\(\[/);
  for (const id of headerIds) {
    assert.ok(source.includes(`'${id}'`), `missing stop-lock for ${id}`);
  }
  assert.match(source, /rootState === 'stopped' \|\| bodyState === 'stopped'/);
  assert.match(source, /isTransportStoppedForHeaderLed\(el\) \? 'empty' : requested/);
});

test('stop lock clears active LED state instead of preserving owner state', async () => {
  const source = await read('js/shared-status.js');
  assert.match(source, /ALL_STATE_CLASSES\.forEach\(\(className\) => el\.classList\.remove\(className\)\)/);
  assert.match(source, /if \(nextClass !== 'state-empty' && nextClass !== 'state-off'\)/);
  assert.match(source, /el\.setAttribute\('data-led-state', nextClass\.replace/);
});
