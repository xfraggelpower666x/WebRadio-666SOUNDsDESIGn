import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile CSS contains no autonomous EQ or bottom-meter animation', async () => {
  const css = await read('css/player-patches.css');
  assert.doesNotMatch(css, /animation:mffEqPulse/);
  assert.doesNotMatch(css, /@keyframes mffEqPulse/);
  assert.doesNotMatch(css, /animation:mffCenterOutPulse/);
  assert.doesNotMatch(css, /@keyframes mffCenterOutPulse/);
  assert.match(css, /transform:scaleY\(var\(--eq-scale,.075\)\)!important/);
  assert.match(css, /opacity:calc\(\.12 \+ var\(--v,.04\) \* \.88\)!important/);
  assert.match(css, /transform:scaleY\(calc\(\.34 \+ var\(--v,.04\) \* \.74\)\)!important/);
  assert.equal(await read('public/css/player-patches.css'), css);
});

test('canonical equalizer publishes the mobile side-meter level variable', async () => {
  const js = await read('js/equalizer.js');
  assert.match(js, /root\.style\.setProperty\('--mff-level', safeLevel\.toFixed\(3\)\)/);
  assert.equal(await read('public/js/equalizer.js'), js);
});
