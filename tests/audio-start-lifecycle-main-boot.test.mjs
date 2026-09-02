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

test('foreground and suspend recovery are canonical sensor handoffs and never hard-reset transport',()=>{
  assert.match(root,/softResumeReasons = new Set\(\['focus','pageshow','visibility','visible','suspend','stalled','interrupted','system-interruption'\]\)/);
  assert.match(root,/function handoffAutomaticRecovery\(why\)/);
  assert.match(root,/owner\.owner === 'all-player-audio-recovery-v1'/);
  assert.match(root,/if \(softResumeReasons\.has\(why\)\) \{[\s\S]*handoffAutomaticRecovery\(why\);[\s\S]*return;[\s\S]*\}/);
  const sensorBlock = root.match(/if \(softResumeReasons\.has\(why\)\) \{([\s\S]*?)\n      \}/)?.[1] || '';
  assert.doesNotMatch(sensorBlock,/audio\.pause\(|audio\.load\(|removeAttribute\('src'\)/);
  assert.match(root,/audioStartState = sameTarget\(target\) \? 'resume-prepared' : 'sensor-handoff'/);
});

test('main route preloads the existing shared central boot owner early',()=>{
  assert.match(root,/function installEarlyMainCentralBoot\(\)/);
  assert.match(root,/path !== '\/' && path !== '\/index\.html'/);
  assert.match(root,/\/css\/central-boot-screen\.css/);
  assert.match(root,/\/js\/central-boot-screen\.js/);
  assert.match(root,/S666CentralBootScreen\.bootOnce/);
  assert.doesNotMatch(root,/START AUDIO|USER GESTURE REQUIRED/);
});

test('main cyberboot suppresses both player DOM layers until the single boot owner hands off',()=>{
  assert.match(root,/s666-main-boot-preflight/);
  assert.match(root,/\.frame-stage,html\.s666-main-boot-preflight #mffApp\{visibility:hidden!important\}/);
  assert.match(root,/let bootSeen = Boolean\(document\.getElementById\('s666CentralBoot'\)\)/);
  assert.match(root,/if \(boot\) \{[\s\S]*bootSeen = true;[\s\S]*return;[\s\S]*\}/);
  assert.match(root,/if \(bootSeen\) releasePreflight\('boot-handoff-complete'\)/);
  assert.match(root,/releasePreflight\('failsafe-release'\), 9000/);
  assert.match(root,/releasePreflight\('boot-script-error'\)/);
});
