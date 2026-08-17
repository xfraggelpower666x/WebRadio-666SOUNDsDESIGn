import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/media-session-ios.js','utf8');
const mirror=fs.readFileSync('public/js/media-session-ios.js','utf8');
const skip=fs.readFileSync('js/skip-control.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('MediaSession root and public remain byte-identical',()=>assert.equal(root,mirror));
test('player root and public remain byte-identical',()=>assert.equal(index,publicIndex));

test('MediaSession next-track delegates to the canonical protected skip controller',()=>{
  const start=root.indexOf('    function submitAdminSkip(reason) {');
  const end=root.indexOf('    // ─── Sync MediaSession',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.match(block,/window\.S666SkipControl/);
  assert.match(block,/S666SkipControl\.skip\(\{ source: source, ensureAuth: true \}\)/);
  assert.match(block,/skip_control_missing/);
  assert.doesNotMatch(block,/fetch\(|\/api\/admin\/skip/);
});

test('canonical skip controller retains auth and dedicated admin skip route',()=>{
  assert.match(skip,/S666AdminAuth\.ensure/);
  assert.match(skip,/S666AdminAuth\.fetch/);
  assert.match(skip,/S666AdminAuth\.fetch\('\/api\/admin\/skip'/);
  assert.doesNotMatch(skip,/\/api\/radio\/skip/);
});

test('skip-control loads before MediaSession',()=>{
  const skipPos=index.indexOf('/js/skip-control.js');
  const mediaPos=index.indexOf('/js/media-session-ios.js');
  assert.ok(skipPos>=0&&mediaPos>skipPos);
});
