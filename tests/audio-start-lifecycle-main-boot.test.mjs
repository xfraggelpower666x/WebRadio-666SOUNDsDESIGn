import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = fs.readFileSync('js/audio-start-core.js','utf8');
const mirror = fs.readFileSync('public/js/audio-start-core.js','utf8');

test('audio start core root/public mirrors stay byte-identical',()=>{
  assert.equal(mirror, root);
});

test('reset false does not reload an unchanged stream target',()=>{
  assert.match(root,/else if \(!sameTarget\(target\)\) \{[\s\S]*audio\.src = target;[\s\S]*audio\.load\(\)/);
  assert.doesNotMatch(root,/else \{\s*if \(audio\.getAttribute\('src'\) !== target\) audio\.src = target;\s*try \{ audio\.load\(\); \}/);
});

test('foreground and suspend recovery stays soft for the same live stream',()=>{
  assert.match(root,/softResumeReasons = new Set\(\['focus','pageshow','visibility','visible','suspend','stalled','interrupted','system-interruption'\]\)/);
  assert.match(root,/if \(softResumeReasons\.has\(why\) && sameTarget\(target\)\)/);
  assert.match(root,/audioStartState = 'resume-prepared'/);
});

test('main route preloads the existing shared central boot owner early',()=>{
  assert.match(root,/function installEarlyMainCentralBoot\(\)/);
  assert.match(root,/path !== '\/' && path !== '\/index\.html'/);
  assert.match(root,/\/css\/central-boot-screen\.css/);
  assert.match(root,/\/js\/central-boot-screen\.js/);
  assert.match(root,/S666CentralBootScreen\.bootOnce/);
  assert.doesNotMatch(root,/START AUDIO|USER GESTURE REQUIRED/);
});
