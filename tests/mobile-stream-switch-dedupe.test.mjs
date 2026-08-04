import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('index.html','utf8');
const mirror=fs.readFileSync('public/index.html','utf8');

test('root and public remain byte-identical',()=>assert.equal(root,mirror));
for(const [name,src] of [['index.html',root],['public/index.html',mirror]]){
  test(name+': mobile stream switch suppresses synthetic click',()=>{
    assert.match(src,/var lastStreamSwitchTouchAt=0;/);
    assert.match(src,/Date\.now\(\)-lastStreamSwitchTouchAt<700/);
    assert.match(src,/if\(ev\.type==='touchend'\) lastStreamSwitchTouchAt=Date\.now\(\);/);
    assert.match(src,/setManualStreamTarget\(btn\.getAttribute\('data-stream-target'\)\|\|'main'\);/);
    assert.match(src,/if\(canonical && typeof canonical\.click==='function'\) canonical\.click\(\);/);
    assert.doesNotMatch(src,/btn\.__mffStreamBound=true;\n      var fn=function\(ev\)\{\n        ev\.preventDefault/);
  });
}
