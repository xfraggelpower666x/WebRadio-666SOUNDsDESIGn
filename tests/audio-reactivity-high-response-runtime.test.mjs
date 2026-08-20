import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
test('canonical audio reactivity is live with proportional peak headroom',async()=>{const eq=await read('js/equalizer.js');assert.match(eq,/\(local - 2\) \/ 14/);assert.match(eq,/attack = 0\.76/);assert.match(eq,/release = 0\.15/);assert.match(eq,/spectralResponse \* 0\.86 \+ adaptiveResponse/);assert.doesNotMatch(eq,/localPeak - average/);assert.match(eq,/visualSignalScale/);assert.equal(await read('public/js/equalizer.js'),eq);});
