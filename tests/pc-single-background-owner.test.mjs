import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC main uses body as the single desktop background image owner', async () => {
  const base = await read('css/base.css');
  const publicBase = await read('public/css/base.css');
  const desktop = await read('css/desktop.css');

  assert.equal(publicBase, base);
  assert.match(desktop, /body\s*\{[\s\S]*?background-image:[\s\S]*?veluna-player-background\.webp/);
  assert.match(base, /@media \(min-width: 761px\) \{[\s\S]*?body\[data-veluna-page="main"\] \.frame-stage \{[\s\S]*?background-color: transparent !important;[\s\S]*?background-image: none !important;/);
});
