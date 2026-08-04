import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('index.html','utf8');
const mirror=fs.readFileSync('public/index.html','utf8');

test('root and public player remain byte-identical',()=>assert.equal(root,mirror));
for(const [name,src] of [['index.html',root],['public/index.html',mirror]]){
  test(name+': batched mobile interaction dedupe markers',()=>{
    assert.match(src,/var lastTransportFeedbackTouchAt=0;/);
    assert.match(src,/Date\.now\(\)-lastTransportFeedbackTouchAt<700/);
    assert.match(src,/var lastControlFeedbackTouchAt=0;/);
    assert.match(src,/Date\.now\(\)-lastControlFeedbackTouchAt<700/);
    assert.match(src,/var lastLedTipTouchAt=0;/);
    assert.match(src,/Date\.now\(\)-lastLedTipTouchAt<700/);
    assert.match(src,/var lastMobileEqTouchAt=0;/);
    assert.match(src,/Date\.now\(\)-lastMobileEqTouchAt<700/);
    assert.match(src,/setManualStreamTarget\(btn\.getAttribute\('data-stream-target'\)\|\|'main'\);/);
    assert.match(src,/mffRuntimeIsPlaying\(\)/);
    assert.match(src,/qsa\('\.smfp-v181-footer-version',a\)\.forEach/);
  });
}
