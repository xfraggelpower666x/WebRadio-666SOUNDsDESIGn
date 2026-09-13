import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boot = fs.readFileSync('js/central-boot-screen.js','utf8');
const bootPublic = fs.readFileSync('public/js/central-boot-screen.js','utf8');
const css = fs.readFileSync('css/central-boot-screen.css','utf8');
const cssPublic = fs.readFileSync('public/css/central-boot-screen.css','utf8');
const audioStart = fs.readFileSync('js/audio-start-core.js','utf8');
const audioStartPublic = fs.readFileSync('public/js/audio-start-core.js','utf8');
const logo = fs.readFileSync('assets/boot-screen/666-cyber-hud-main-logo.webp');
const logoPublic = fs.readFileSync('public/assets/boot-screen/666-cyber-hud-main-logo.webp');

test('Main Cyber HUD boot implementation keeps root/public mirrors exact',()=>{
  assert.equal(bootPublic,boot);
  assert.equal(cssPublic,css);
  assert.equal(audioStartPublic,audioStart);
  assert.deepEqual(logoPublic,logo);
});

test('Cyber HUD skin is selected only for the main page so Veluna and internal keep legacy boot',()=>{
  assert.match(boot,/function mainCyberHudMarkup\(\)/);
  assert.match(boot,/function legacyBootMarkup\(\)/);
  assert.match(boot,/return identity\.page==='main' \? mainCyberHudMarkup\(\) : legacyBootMarkup\(\)/);
  assert.match(boot,/root\.dataset\.bootSkin=identity\.page==='main'\?'main-cyber-hud-v1':'central-legacy'/);
  assert.match(boot,/if\(page==='veluna'\) return \{page,device,playerId:'veluna'/);
  assert.match(boot,/if\(page==='internal'\) return \{page,device,playerId:'internal'/);
  assert.doesNotMatch(css,/html\[data-s666-player-page="veluna"\][^{]*s666boot-main/);
});

test('desktop and iPhone main player share the same Main page Cyber HUD owner',()=>{
  assert.match(boot,/if\(device==='iphone'\) return \{page,device,playerId:'iphone',route:'\/'/);
  assert.match(boot,/return \{page,device,playerId:'hub',route:'\/'/);
  assert.match(css,/html\[data-s666-player-page="main"\] #s666CentralBoot/);
  assert.match(css,/@media \(max-width:760px\)/);
});

test('Main Cyber HUD contains supplied identity visuals and the dedicated boot asset',()=>{
  assert.match(boot,/data-main-cyber-hud=\\?"1\\?"/);
  assert.match(boot,/666 CYBER BOOT/);
  assert.match(boot,/SYSTEM ONLINE/);
  assert.match(boot,/666SOUNDsDESIGn/);
  assert.match(boot,/© FRAGGLEPOWER666/);
  assert.match(boot,/ॐ/);
  assert.match(boot,/666-cyber-hud-main-logo\.webp\?v=20260913-main-cyber-hud-v1/);
  assert.ok(logo.length>10000,'main boot logo asset is unexpectedly small');
});

test('bottom progress dock is driven by the existing real 0 to 100 boot progress owner',()=>{
  assert.match(boot,/s666boot-main-progress-dock/);
  assert.match(boot,/id=\\?"s666boot-track\\?"/);
  assert.match(boot,/id=\\?"s666boot-bar\\?"/);
  assert.match(boot,/id=\\?"s666boot-percent\\?">0%/);
  assert.match(boot,/n\.bar\.style\.width=p\+'%'/);
  assert.match(boot,/n\.percent\.textContent=p\+'%'/);
  assert.match(boot,/n\.track\.setAttribute\('aria-valuenow',String\(p\)\)/);
  assert.match(boot,/root\.dataset\.progress=String\(p\)/);
  assert.match(css,/\.s666boot-main-progress-dock\{[^}]*bottom:max\(4\.5vh,env\(safe-area-inset-bottom\)\)/);
});

test('Main boot is made explicitly visible and records its handoff to prevent a silent hidden boot regression',()=>{
  assert.match(css,/html\[data-s666-player-page="main"\] #s666CentralBoot\{[^}]*display:grid!important;visibility:visible!important;opacity:1/);
  assert.match(audioStart,/html\.setAttribute\('data-main-boot-preflight', 'boot-visible'\)/);
  assert.match(audioStart,/html\.setAttribute\('data-main-cyber-hud-handoff', boot\.dataset\.bootSkin \|\| 'central-boot-visible'\)/);
  assert.match(audioStart,/central-boot-screen\.css/);
  assert.match(audioStart,/20260913-main-cyber-hud-v1/);
});

test('Main gets a longer six-second presentation without changing the legacy Veluna duration',()=>{
  assert.match(boot,/const DEFAULT_DURATION=4200/);
  assert.match(boot,/const MAIN_DURATION=6000/);
  assert.match(boot,/const fallbackDuration=identity\.page==='main'\?MAIN_DURATION:DEFAULT_DURATION/);
});
