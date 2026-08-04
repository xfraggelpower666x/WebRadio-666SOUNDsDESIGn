import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/media-session-ios.js','utf8');
const mirror=fs.readFileSync('public/js/media-session-ios.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('MediaSession root and public remain byte-identical',()=>assert.equal(root,mirror));
test('player root and public remain byte-identical',()=>assert.equal(index,publicIndex));

test('mobile player publishes a non-repeated canonical current title',()=>{
  assert.match(index,/h1\.setAttribute\('data-current-title',clean\)/);
  assert.match(index,/span\.textContent=clean\+'   •   '\+clean/);
});

test('MediaSession prioritizes the canonical mobile title attribute',()=>{
  const start=root.indexOf('    function watchNowPlaying() {');
  const end=root.indexOf('    // ─── Boot',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.match(block,/#mffApp \.mff-title h1/);
  assert.match(block,/getAttribute\('data-current-title'\)/);
  assert.ok(block.indexOf('mobileTitle ||') < block.indexOf("document.getElementById('nowPlayingTicker')") || block.indexOf('mobileTitle ||') < block.indexOf('(ticker && ticker.textContent.trim())'));
  assert.match(block,/data-media-session-title-source/);
  assert.match(block,/loading\|connecting\|starting\|press play/);
});

test('protected MediaSession skip gate remains intact',()=>{
  assert.match(root,/S666SkipControl\.skip\(\{ source: source, ensureAuth: true \}\)/);
  assert.doesNotMatch(root,/fetch\('\/api\/admin\/skip'/);
});
