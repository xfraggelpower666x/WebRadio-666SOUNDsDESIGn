import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const viewportLock = await readFile(new URL('../js/veluna-viewport-lock.js', import.meta.url), 'utf8');
const viewportMirror = await readFile(new URL('../public/js/veluna-viewport-lock.js', import.meta.url), 'utf8');

for (const htmlPath of ['../veluna/index.html','../VELUNA/index.html','../public/veluna/index.html','../public/VELUNA/index.html']) {
  test(`VELUNA viewport and status fields remain loaded: ${htmlPath}`, async () => {
    const html = await readFile(new URL(htmlPath, import.meta.url), 'utf8');
    assert.match(html, /veluna-viewport-lock\.js\?v=/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /id="listenersText"/);
    assert.match(html, /id="bitrateText"/);
    assert.match(html, /id="djText"/);
    assert.match(html, /class="mini-grid"/);
  });
}

test('viewport lock follows Safari viewport and protects Dynamic Island', () => {
  assert.match(viewportLock, /fullscreen geometry lock v1\.2\.28/);
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

test('iPhone layout keeps status row visible and pushes MAIN controls downward', () => {
  assert.match(viewportLock, /grid-template-rows/);
  assert.match(viewportLock, /minmax\(\$\{spacerMinimum\}px,\.38fr\)/);
  assert.match(viewportLock, /placeInRow\(miniGrid, 5\)/);
  assert.match(viewportLock, /placeInRow\(sourceSwitch, 7\)/);
  assert.match(viewportLock, /placeInRow\(footer, 12\)/);
  assert.match(viewportLock, /miniGrid\.style\.setProperty\('visibility','visible','important'\)/);
  assert.match(viewportLock, /sourceSwitch\.style\.setProperty\('align-self','end','important'\)/);
  assert.match(viewportLock, /bottomBanner\.remove\(\)/);
});

test('viewport lock root/public mirrors are identical', () => {
  assert.equal(viewportMirror, viewportLock);
});
