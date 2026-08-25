import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const main=read('js/main-veluna-adapter.js');
const viewport=read('js/veluna-viewport-lock.js');

test('main ticker geometry measures real cover and History edges relative to now-playing',()=>{
  assert.match(main,/const TICKER_EDGE_INSET=18/);
  assert.match(main,/const TICKER_COVER_GAP=20/);
  assert.match(main,/const TICKER_MIN_WIDTH=96/);
  assert.match(main,/const nowRect=now\.getBoundingClientRect\(\)/);
  assert.match(main,/left=Math\.max\(left,Math\.round\(rect\.right-nowRect\.left\+TICKER_COVER_GAP\)\)/);
  assert.match(main,/const historyRight=Math\.round\(rect\.right-nowRect\.left\)/);
  assert.match(main,/rightEdge=Math\.min\(Math\.round\(nowRect\.width\),Math\.max\(left\+TICKER_MIN_WIDTH,historyRight\)\)/);
  assert.match(main,/const width=Math\.max\(TICKER_MIN_WIDTH,Math\.round\(rightEdge-left\)\)/);
  assert.match(main,/const right=Math\.max\(0,Math\.round\(nowRect\.width-rightEdge\)\)/);
  assert.doesNotMatch(main,/nowRect\.right-rect\.right/);
  assert.doesNotMatch(main,/right=Math\.max\(right,Math\.ceil\(nowRect\.right-rect\.left\+12\)\)/);
  assert.match(main,/--s666-main-ticker-left/);
  assert.match(main,/--s666-main-ticker-right/);
  assert.match(main,/--s666-main-ticker-right-edge/);
  assert.match(main,/--s666-main-ticker-width/);
  assert.doesNotMatch(main,/offset=Math\.ceil\(rect\.width\+14\)/);
  assert.equal(read('public/js/main-veluna-adapter.js'),main);
});

test('VELUNA iPhone viewport owner shortens chrome while protecting the LYVRA display row',()=>{
  assert.match(viewport,/stable iPhone fullscreen geometry lock v1\.3\.0/);
  assert.match(viewport,/Protect the LYVRA artwork\/title area; reclaim height from chrome, not from the display row/);
  assert.match(viewport,/const displayMinimum = compact \? 150 : 188/);
  assert.match(viewport,/--veluna-safe-player-bottom','max\(66px, calc\(env\(safe-area-inset-bottom\) \+ 30px\)\)'/);
  assert.match(viewport,/clamp\(104px,14svh,148px\)/);
  assert.match(viewport,/card\.style\.setProperty\('padding','5px','important'\)/);
  assert.match(viewport,/miniGrid\.style\.setProperty\('min-height',compact \? '38px' : '42px','important'\)/);
  assert.doesNotMatch(viewport,/--veluna-safe-player-bottom','max\(54px, calc\(env\(safe-area-inset-bottom\) \+ 24px\)\)'/);
  assert.equal(read('public/js/veluna-viewport-lock.js'),viewport);
});
