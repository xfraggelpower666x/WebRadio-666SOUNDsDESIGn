import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const viewportLock = await readFile(new URL('../js/veluna-viewport-lock.js', import.meta.url), 'utf8');
const viewportMirror = await readFile(new URL('../public/js/veluna-viewport-lock.js', import.meta.url), 'utf8');

for (const htmlPath of ['../veluna/index.html','../VELUNA/index.html','../public/veluna/index.html','../public/VELUNA/index.html']) {
  test(`VELUNA viewport lock remains loaded: ${htmlPath}`, async () => {
    const html = await readFile(new URL(htmlPath, import.meta.url), 'utf8');
    assert.match(html, /veluna-viewport-lock\.js\?v=/);
    assert.match(html, /viewport-fit=cover/);
  });
}

test('viewport lock follows Safari visible viewport and protects Dynamic Island', () => {
  assert.match(viewportLock, /fullscreen geometry lock v1\.2\.27/);
  assert.match(viewportLock, /window\.visualViewport/);
  assert.match(viewportLock, /--veluna-safe-player-top/);
  assert.match(viewportLock, /max\(56px, calc\(env\(safe-area-inset-top\) \+ 10px\)\)/);
  assert.match(viewportLock, /--veluna-safe-player-bottom/);
  assert.match(viewportLock, /card\.style\.setProperty\('top'/);
  assert.match(viewportLock, /card\.style\.setProperty\('bottom'/);
  assert.match(viewportLock, /keyboardOpen\(\)/);
  assert.doesNotMatch(viewportLock, /Math\.max\(state\.height, viewport\.height\)/);
  assert.doesNotMatch(viewportLock, /if \(!force && state\.width && state\.orientation === orientation\) return/);
});

test('viewport lock root/public mirrors are identical', () => {
  assert.equal(viewportMirror, viewportLock);
});
