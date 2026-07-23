import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('VELUNA has one boot owner and no delayed UI splash', async () => {
  const ui = await read('js/veluna-ui.js');
  assert.match(ui, /no delayed splash ownership/);
  assert.doesNotMatch(ui, /function injectSplash\(|requestAnimationFrame\(injectSplash\)|data-veluna-central-splash/);
  assert.equal(await read('public/js/veluna-ui.js'), ui);
});

test('VELUNA iPhone uses one stable full-screen size per orientation', async () => {
  const lock = await read('js/veluna-viewport-lock.js');
  assert.match(lock, /stable iPhone fullscreen geometry lock v1\.3\.0/);
  assert.match(lock, /100lvh/);
  assert.match(lock, /data-veluna-stable-fullscreen/);
  assert.match(lock, /state\.locked && state\.orientation === orientation/);
  assert.match(lock, /resetForOrientation/);
  assert.doesNotMatch(lock, /visualViewport\?\.addEventListener|addEventListener\('resize'/);
  assert.equal(await read('public/js/veluna-viewport-lock.js'), lock);
});

test('all VELUNA mirrors load current stable runtimes', async () => {
  const files = ['VELUNA/index.html','veluna/index.html','public/VELUNA/index.html','public/veluna/index.html'];
  const values = await Promise.all(files.map(read));
  for (const html of values) {
    assert.match(html, /stable-fullscreen-v130/);
    assert.match(html, /no-delayed-splash-v1231/);
  }
  assert.equal(values[0], values[1]);
  assert.equal(values[0], values[2]);
  assert.equal(values[0], values[3]);
});
