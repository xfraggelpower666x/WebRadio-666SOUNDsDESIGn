import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of ['index.html','public/index.html']) {
  const src = fs.readFileSync(file, 'utf8');
  test(`${file}: mobile transport suppresses synthetic click after touchend`, () => {
    assert.match(src, /mffLastControlTouchAt=0/);
    assert.match(src, /ev\.type==='touchend'\) mffLastControlTouchAt=Date\.now\(\)/);
    assert.match(src, /ev\.type==='click' && Date\.now\(\)-mffLastControlTouchAt<700/);
  });
}
