import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const viewportLock = await readFile(new URL('../js/veluna-viewport-lock.js', import.meta.url), 'utf8');
const viewportMirror = await readFile(new URL('../public/js/veluna-viewport-lock.js', import.meta.url), 'utf8');

for (const htmlPath of ['../veluna/index.html','../VELUNA/index.html','../public/veluna/index.html','../public/VELUNA/index.html']) {
  test(`VELUNA viewport cache bust active: ${htmlPath}`, async () => {
    const html = await readFile(new URL(htmlPath, import.meta.url), 'utf8');
    assert.match(html, /veluna-viewport-lock\.js\?v=2026-07-13-veluna-v1220/);
  });
}

test('viewport lock grows with Safari usable height', () => {
  assert.match(viewportLock, /visualViewport\.addEventListener\('resize'/);
  assert.match(viewportLock, /Math\.max\(state\.height, viewport\.height\)/);
  assert.match(viewportLock, /keyboardOpen\(\)/);
  assert.doesNotMatch(viewportLock, /if \(!force && state\.width && state\.orientation === orientation\) return/);
});

test('viewport lock root/public mirrors are identical', () => {
  assert.equal(viewportMirror, viewportLock);
});
