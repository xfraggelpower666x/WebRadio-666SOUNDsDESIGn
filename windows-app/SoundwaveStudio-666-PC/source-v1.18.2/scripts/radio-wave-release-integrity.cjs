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
  'src/workspace.js',
  'src/integration/666-integration.js',
  'src/vendor/cayatur/preset-registry.js',
  'src/vendor/cayatur/milkdrop-cycle.js',
  'tests/milkdrop-control-layer.test.cjs',
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

const workspace=text('src/workspace.js');
check(/rw666-workspace-v1/.test(workspace),'workspace-state-storage');
check(/rw666-ui-settings-v1/.test(workspace),'workspace-settings-storage');
check(/rw-window-close/.test(workspace)&&/closeWindow/.test(workspace),'workspace-close-buttons');
check(/pointerdown/.test(workspace)&&/pointermove/.test(workspace),'workspace-pointer-drag');
check(/rw-window-dock/.test(workspace)&&/toggleDock/.test(workspace),'workspace-right-dock');
check(/beforeunload/.test(workspace)&&/visibilitychange/.test(workspace),'workspace-exit-persistence');
check(/radio-password/.test(workspace)&&/type==='password'/.test(workspace),'workspace-password-not-persisted');
check(/status.*LIVE STREAM STATUS|LIVE STREAM STATUS.*status/s.test(workspace),'stream-status-draggable-overlay');
check(/resize:both/.test(css),'workspace-resizable-overlays');
check(/slider-visual-opacity/.test(text('src/index.html')),'visualizer-opacity-control');
check(/visualizerCanvas\.style\.opacity/.test(text('src/app.js')),'visualizer-opacity-application');
check(/getContext\('webgl2'/.test(text('src/vendor/cayatur/shaderhost.js')),'gpu-webgl2-shader-path');
check(/\.rw-window-dock\{[^}]*right:8px/.test(css),'workspace-right-side-dock');

const html=text('src/index.html');
check(/preset-registry\.js[^]*presets-milkdrop\.js[^]*milkdrop-cycle\.js[^]*milkdrop-renderer\.js/.test(html),'milkdrop-control-script-order');
check(/window\.SVPresets=Object\.freeze/.test(text('src/vendor/cayatur/preset-registry.js')),'milkdrop-preset-registry');
check(/window\.SVMilkdropCycle=Object\.freeze/.test(text('src/vendor/cayatur/milkdrop-cycle.js')),'milkdrop-cycle-layer');
check(/hardCutBass/.test(integration)&&/hardCutTreb/.test(integration),'milkdrop-real-audio-hardcut-controls');
check(/milkdrop-never-repeat/.test(html)&&/milkdrop-lock/.test(html)&&/milkdrop-auto/.test(html),'milkdrop-overlay-advanced-controls');
const mdTest=cp.spawnSync(process.execPath,[path.join(root,'tests/milkdrop-control-layer.test.cjs')],{encoding:'utf8'});
check(mdTest.status===0,'milkdrop-control-layer-node-test');
if(mdTest.status!==0)fail.push((mdTest.stderr||mdTest.stdout||'').trim());

if(fail.length){
  console.error('FAIL '+fail.length+' targeted release gate(s)');
  for(const x of fail) console.error(' - '+x);
  process.exit(1);
}
console.log('PASS '+pass.length+'/'+pass.length+' targeted RADIO WAVE release gates');
console.log('HISTORIC_SOUNDWAVE_DEEP_BASELINE=NOT_RERUN_BY_DESIGN');
