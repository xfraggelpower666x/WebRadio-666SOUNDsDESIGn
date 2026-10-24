import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const htmlPublic=fs.readFileSync('public/index.html','utf8');
const core=fs.readFileSync('js/player-core.js','utf8');
const corePublic=fs.readFileSync('public/js/player-core.js','utf8');
const recovery=fs.readFileSync('js/all-player-audio-recovery.js','utf8');
test('Main Stream has one English naming owner',()=>{assert.equal(htmlPublic,html);assert.match(html,/id=\"mainBtn\"[\s\S]*?title=\"Main Stream — Click to switch to Main Stream\"[\s\S]*?<span class=\"status-code\">M<\/span>/);assert.doesNotMatch(html,/Hauptstream — Klick schaltet auf Hauptstream/);assert.doesNotMatch(html,/id=\"mainBtn\"[\s\S]{0,300}<span class=\"status-code\">H<\/span>/);assert.match(core,/main\.title='Main Stream';/);assert.equal(corePublic,core);});
test('ordinary Main play timeout cannot auto-switch the player to Backup',()=>{assert.match(core,/const AUTO_MAIN_TO_BACKUP_TIMEOUT_FAILOVER = false;/);assert.match(core,/if \(AUTO_MAIN_TO_BACKUP_TIMEOUT_FAILOVER && currentSource === 'main' && !switchingStream\) \{/);assert.match(core,/fallbackBtn\?\.addEventListener\('click',[\s\S]*?setSource\('fallback'\)/);});
test('canonical recovery keeps confirmed Backup to Main hard-failure direction',()=>{assert.match(recovery,/const targetSrc=isBackupSource\(src\)\?PRIMARY_ROUTE:src/);});


test('unexpected live ended keeps Main play intent and delegates to canonical recovery',()=>{
  assert.match(core,/audio\?\.addEventListener\('ended',[\s\S]*?if \(userStopped\) return;[\s\S]*?setDesktopTransportState\('play'\);[\s\S]*?canonicalRecoveryHandoff\('ended'\)/);
  assert.doesNotMatch(core,/audio\?\.addEventListener\('ended',[\s\S]*?setDesktopTransportState\('stop'\)/);
});

test('canonical recovery fast-reopens technical ended only on the Main player page',()=>{
  assert.match(recovery,/function isMainPlayerPage\(\).*data-veluna-page.*===['"]main['"]/);
  assert.match(recovery,/mainTechnicalEnded=isMainPlayerPage\(\)&&\/ended\/i\.test\(reasonText\)/);
  assert.match(recovery,/if\(mainTechnicalEnded&&candidateFor>=p\.hardConfirmMs\)\{void hardRecover\(audio,s,'main-live-ended-reopen'\);return;\}/);
  assert.match(recovery,/if\(audio\.paused&&candidateFor>=p\.pausedConfirmMs&&!mainTechnicalEnded\)/);
});
