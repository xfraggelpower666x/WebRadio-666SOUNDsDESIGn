'use strict';
const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const root=path.resolve(__dirname,'..');
const pass=[];
const fail=[];

function check(ok,label){(ok?pass:fail).push(label);}
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function syntax(p){
  const r=cp.spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});
  check(r.status===0,'syntax:'+p);
  if(r.status!==0) fail.push((r.stderr||r.stdout||'').trim());
}

console.log('=== RADIO WAVE v6.66 Targeted Release Integrity ===');

// Changed-scope syntax only; historic Soundwave deep integration baseline is intentionally not rerun.
[
  'main.js',
  'preload.js',
  'intro-preload.js',
  'src/app.js',
  'src/intro.js',
  'src/integration/666-integration.js',
  'scripts/prepare-radio-wave-branding.cjs'
].forEach(syntax);

const pkg=JSON.parse(text('package.json'));
check(pkg.name==='radio-wave-v666','package-name');
check(pkg.build?.productName==='RADIO WAVE v6.66','product-name');
check(pkg.build?.win?.icon==='build/radio-wave-v6.66.ico','windows-icon-path');
check(Array.isArray(pkg.build?.win?.target)&&pkg.build.win.target.some(x=>(typeof x==='string'?x:x?.target)==='nsis'),'nsis-target');
check(pkg.build?.nsis?.oneClick===false,'nsis-assisted-installer');
check(pkg.build?.nsis?.allowToChangeInstallationDirectory===true,'nsis-install-dir');
check(pkg.build?.files?.includes('intro-preload.js'),'intro-preload-packaged');
check(pkg.build?.files?.includes('build/windowsIconBase64.cjs'),'icon-base64-packaged');

for(const p of [
  'src/intro.html',
  'src/intro.css',
  'src/intro.js',
  'src/assets/radio-wave/banner.asset.js',
  'src/assets/radio-wave/appIconSource.asset.js',
  'src/assets/radio-wave/inAppLogo.asset.js',
  'src/assets/radio-wave/stage.asset.js',
  'src/assets/radio-wave/ASSET_CONTRACT.json',
  'build/windowsIconBase64.cjs'
]) check(exists(p),'required:'+p);

const intro=text('src/intro.js');
check(/classList\.add\('blinking'\)/.test(intro),'intro-three-blink-css-trigger');
check(/await sleep\(2700\)/.test(intro),'intro-blink-duration');
check(/classList\.add\('hold'\)/.test(intro)&&/await sleep\(2000\)/.test(intro),'intro-final-2s-hold');
check(/introApi\.complete/.test(intro),'intro-complete-handoff');

const main=text('main.js');
check(/show:\s*false/.test(main),'main-starts-hidden');
check(/destroyIntroWindow\(\)/.test(main),'intro-destroy-after-handoff');
check(/lyvra:system-start/.test(main),'system-start-event');
check(/setTimeout\([^]*?14000\)/.test(main),'intro-failsafe');
check(/RADIO-WAVE-v6\.66-startup\.log/.test(main),'startup-log-path');
check(/showErrorBox\('RADIO WAVE v6\.66 · Startup Error'/.test(main),'startup-error-dialog');
check(/INTRO_LOAD_FAIL/.test(main)&&/MAIN_LOAD_FAIL/.test(main),'startup-load-failure-evidence');
check(pkg.build?.nsis?.runAfterFinish===true,'nsis-run-after-finish');
check(pkg.build?.nsis?.createDesktopShortcut==='always','nsis-desktop-shortcut');

const integration=text('src/integration/666-integration.js');
check(/getByteFrequencyData/.test(integration)&&/getByteTimeDomainData/.test(integration),'real-analyser-data');
check(/stream artwork hardlock/i.test(integration),'stream-artwork-priority');
check(/fallbackArt=window\.RWAssets\?\.inAppLogo/.test(integration),'branding-fallback-only');

const css=text('src/style.css');
check(/\.radio-status-art img\{[^}]*object-fit:contain/.test(css),'stream-artwork-contain');
check(/\.rw-brand-banner img\{[^}]*object-fit:contain/.test(css),'banner-contain');
check(/\.rw-brand-logo\{[^}]*object-fit:contain/.test(css),'logo-contain');

if(fail.length){
  console.error('FAIL '+fail.length+' targeted release gate(s)');
  for(const x of fail) console.error(' - '+x);
  process.exit(1);
}
console.log('PASS '+pass.length+'/'+pass.length+' targeted RADIO WAVE release gates');
console.log('HISTORIC_SOUNDWAVE_DEEP_BASELINE=NOT_RERUN_BY_DESIGN');
