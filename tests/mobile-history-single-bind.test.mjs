import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = fs.readFileSync('index.html', 'utf8');
const mirror = fs.readFileSync('public/index.html', 'utf8');

test('root and public player remain byte-identical', () => {
  assert.equal(root, mirror);
});

for (const [name, src] of [['index.html', root], ['public/index.html', mirror]]) {
  test(name + ': one authoritative history binding with touch-click dedupe', () => {
    assert.match(src, /var lastHistoryTouchAt=0;/);
    assert.match(src, /Date\.now\(\)-lastHistoryTouchAt<700/);
    assert.match(src, /var lastHistoryCloseTouchAt=0;/);
    assert.match(src, /Date\.now\(\)-lastHistoryCloseTouchAt<700/);
    assert.match(src, /if\(btn\.__mffHistoryBound\) return;/);
    assert.doesNotMatch(src, /var hback=q\('#mffHistoryBackdrop',app\);/);
    assert.doesNotMatch(src, /hbtn\.addEventListener\('click',function\(ev\)\{ev\.preventDefault\(\);ev\.stopPropagation\(\);toggleHistory\(\);/);
  });
}
