import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/sound-control-overlay-v1.js','utf8');
const mirror=fs.readFileSync('public/js/sound-control-overlay-v1.js','utf8');
const equalizer=fs.readFileSync('js/equalizer.js','utf8');

test('sound-control root and public remain byte-identical',()=>assert.equal(root,mirror));

test('open reads canonical EQ after cloning persisted overlay state',()=>{
  const start=root.indexOf('  function open(){');
  const end=root.indexOf('  function requestClose()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.indexOf('draft = clone(state);') < block.indexOf('readEqFromDom();'));
  assert.match(block,/dirty = false;/);
  assert.doesNotMatch(block,/b\.selector|If user changed old EQ panel/);
});

test('sound control keeps the canonical five-band contract',()=>{
  for(const key of ['low','lowMid','mid','highMid','high']) assert.match(root,new RegExp('key:"'+key+'"'));
  assert.match(root,/window\.SMFPRealEq\.getState/);
  assert.match(root,/window\.SMFPRealEq\.setState/);
  assert.match(root,/s666:sound-eq/);
});

test('canonical audio graph remains owned by equalizer.js',()=>{
  assert.match(equalizer,/const SMFP_REAL_EQ_BANDS = \[/);
  assert.match(equalizer,/createMediaElementSource\(audio\)/);
  assert.match(equalizer,/window\.SMFPRealEq =/);
  assert.doesNotMatch(root,/new AudioContext|createMediaElementSource|createBiquadFilter|createAnalyser/);
});
