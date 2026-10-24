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
  'overlay-preload.js',
  'src/app.js',
  'src/intro.js',
  'src/overlay-window.js',
  'src/diagnostics.js',
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
  'src/overlay-window.html',
  'src/overlay-window.js',
  'src/overlay-window.css',
  'src/diagnostics.js',
  'overlay-preload.js',
  'docs/RADIO_WAVE_INTERRUPTED_WORK_CHECKPOINT_2026-10-24.md',
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

const html=text('src/index.html');
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
check(/rw-window-detach/.test(workspace)&&/detachWindow/.test(workspace),'workspace-native-detach-control');
check(/openDetachedOverlay/.test(text('preload.js'))&&/workspace:overlay-open/.test(main),'workspace-native-overlay-ipc');
check(/detachedOverlayWindows/.test(main)&&/overlay-preload\.js/.test(main),'workspace-native-browserwindows');
check(pkg.build?.files?.includes('overlay-preload.js'),'detached-overlay-preload-packaged');
check(/fitVisualizerToViewport/.test(text('src/app.js'))&&/onWindowMetrics/.test(text('preload.js')),'monitor-aware-visualizer-fit');
check(/mainWindow\.on\(ev,\(\)=>emitMainWindowMetrics/.test(main),'main-window-monitor-metrics');
check(/output-only \.rw-window-dock/.test(css),'output-window-no-control-overlays');
check(/key:'diagnostics'/.test(workspace)&&/id="rw-diagnostics"/.test(html),'diagnostics-own-menu-overlay');
check(/exportRuntimeDiagnostics/.test(text('src/diagnostics.js'))&&/runtime:export-diagnostics/.test(main),'diagnostics-json-export');
check(/workspace:\{mainWindow:/.test(main)&&/detachedOverlays:overlays/.test(main),'diagnostics-overlay-monitor-state');
check(/saved\.dock=out\.dock/.test(workspace)&&/makeDraggable\(dock,dockHead,'dock'\)/.test(workspace),'movable-persistent-menu-dock');
check(/\.rw-window-dock\{[^}]*resize:both/.test(css),'resizable-menu-dock');
check(/rw-workspace-visual-frame/.test(workspace)&&/makeDraggable\(visualFrame,grip,'visualFrame'/.test(workspace),'movable-visualizer-stage');
check(/rw-workspace-visual-frame\{[^}]*resize:both/.test(css),'resizable-visualizer-stage');
check(/saved\.visualFrame=out\.visualFrame/.test(workspace)&&/rw-visual-frame-manual/.test(workspace),'visualizer-stage-persistence');
check(/RWVisualFrame\?\.fit/.test(text('src/app.js')),'visualizer-stage-monitor-auto-fit');
check(/--rw-neon-purple:#a855f7/.test(css)&&/--rw-neon-cyan:#19f7ff/.test(css)&&/--rw-neon-pink:#ff2bd6/.test(css),'cyber-system-color-hardlock');
check(/rw-led-low/.test(html)&&/rw-led-mid/.test(html)&&/rw-led-high/.test(html),'cyber-led-meter-ui');
check(/ledLow\.style\.setProperty\('--rw-level'/.test(text('src/app.js'))&&/ledMid\.style\.setProperty\('--rw-level'/.test(text('src/app.js'))&&/ledHigh\.style\.setProperty\('--rw-level'/.test(text('src/app.js')),'cyber-led-real-analyser-drive');
check(exists('docs/RADIO_WAVE_INTERRUPTED_WORK_CHECKPOINT_2026-10-24.md'),'interrupted-work-checkpoint');
check(/dialog:importMilkdropPersonalLibrary/.test(main)&&/personalMilkdropRoot/.test(main),'personal-milkdrop-persistent-library');
check(/Expand-Archive/.test(main)&&/256\*1024\*1024/.test(main),'personal-milkdrop-bounded-zip-import');
check(/personal_library_no_milk_presets/.test(main)&&/512\*1024\*1024/.test(main),'personal-milkdrop-extraction-bounds');
check(main.includes("docs[\\\\/]license\\.txt")&&main.includes("license:licenseFile"),'personal-milkdrop-license-retention');
check(/top100\\.txt/.test(main)&&/top100Count/.test(main),'personal-milkdrop-top100-index');
check(/importMilkdropPersonalLibrary/.test(text('preload.js'))&&/personalMilkdropLibrary/.test(text('preload.js')),'personal-milkdrop-preload-bridge');
check(/milkdrop-import-personal/.test(html)&&/milkdrop-filter-top100/.test(html)&&/milkdrop-filter-double/.test(html),'personal-milkdrop-library-ui');
check(/installPersonalMilkdropLibrary/.test(integration)&&/personalMilkdropDoubles/.test(integration),'personal-milkdrop-runtime-registration');
check(/native \.milk2 renderer pending/.test(integration),'milk2-no-fake-compatibility');
check(/\.milk renderable/.test(integration)&&/\.milk2 indexed/.test(integration),'personal-library-evidence-status');
check(/id="btn-mute"/.test(html)&&/aria-pressed="false"/.test(html),'main-player-mute-ui');
check(/audioElement\.muted = !audioElement\.muted/.test(text('src/app.js')),'main-player-real-mute-toggle');
check(/rw666-player-muted/.test(text('src/app.js')),'main-player-mute-persistence');
check(/mute-btn\.is-muted/.test(css),'main-player-cyber-mute-state');
check(/detachedVisualizerWindow/.test(main)&&/display:open-detached-visualizer/.test(main),'native-detached-visualizer-window');
check(/visual:frame[^]*detachedVisualizerWindow/.test(main),'detached-visualizer-real-frame-sync');
check(/broadcastSourceState[^]*detachedVisualizerWindow/.test(main),'detached-visualizer-source-sync');
check(/key:'dock'|key:\'dock\'/.test(workspace)&&/detachDock/.test(workspace),'native-detached-menu-dock');
check(/rw-dock-detach/.test(workspace)&&/rw-visual-frame-detach/.test(workspace),'cross-monitor-detach-controls');
check(/languageCode/.test(workspace)&&/tipText/.test(workspace)&&/rw-smart-tooltip/.test(css),'localized-smart-tooltips');
check(/startsWith\('de'\)/.test(workspace)&&/detachVisualizer/.test(workspace),'tooltip-de-en-language-follow');
check(/tuneTicker/.test(integration)&&/scrollWidth/.test(integration)&&/clientWidth/.test(integration),'adaptive-ticker-width-measurement');
check(/rw-ticker-static/.test(integration)&&/rw-ticker-static/.test(css),'adaptive-ticker-short-title-static');
check(/--rw-ticker-duration/.test(integration)&&/s666TickerAdaptive/.test(css),'adaptive-ticker-dynamic-duration');
check(/CSS\.escape\(b\.dataset\.source\)/.test(text('src/overlay-window.js')),'detached-source-tab-forwarding');
check(/workspace:overlay-action[^]*selector/.test(main),'detached-overlay-selector-ipc');
check(/MutationObserver[^]*syncDetachedWindow/.test(workspace),'detached-source-live-sync');
check(/#export-diagnostics'\)\?\.addEventListener/.test(integration),'stale-diagnostics-null-safe');
check(/runtime:remote-health/.test(main)&&/remoteHealth/.test(text('preload.js')),'remote-health-ipc');
check(/radio-runtime-health/.test(html)&&/soundcloud-runtime-health/.test(html),'remote-health-ui');
check(/refreshRemoteHealth/.test(integration)&&/SOUNDCLOUD HEALTH/.test(integration),'remote-health-renderer');
check(/q\('#radio-skip'\)\.onclick[^]*\.catch/.test(integration),'skip-action-error-contained');
check(/q\('#player-message-send'\)\.onclick[^]*\.catch/.test(integration),'messenger-action-error-contained');
check(/q\('#discord-send'\)\.onclick[^]*\.catch/.test(integration),'discord-action-error-contained');
check(/SoundCloud API credentials required/.test(integration),'soundcloud-credential-diagnostic');
check(/id="app-language"/.test(html)&&/languageCode/.test(workspace),'explicit-de-en-language-setting');

check(/preset-registry\.js[^]*presets-milkdrop\.js[^]*milkdrop-cycle\.js[^]*milkdrop-renderer\.js/.test(html),'milkdrop-control-script-order');
check(/window\.SVPresets=Object\.freeze/.test(text('src/vendor/cayatur/preset-registry.js')),'milkdrop-preset-registry');
check(/window\.SVMilkdropCycle=Object\.freeze/.test(text('src/vendor/cayatur/milkdrop-cycle.js')),'milkdrop-cycle-layer');
check(/hardCutBass/.test(integration)&&/hardCutTreb/.test(integration),'milkdrop-real-audio-hardcut-controls');
check(/milkdrop-never-repeat/.test(html)&&/milkdrop-lock/.test(html)&&/milkdrop-auto/.test(html),'milkdrop-overlay-advanced-controls');
check(/openMilkdropPack/.test(text('preload.js'))&&/dialog:openMilkdropPack/.test(main),'milkdrop-pack-import-ipc');
check(/MAX_FILES=128/.test(main)&&/MAX_TOTAL=16\*1024\*1024/.test(main),'milkdrop-pack-import-bounds');
check(/SVPresets\?\.byKind\?\.\('milkdrop'\)/.test(integration),'milkdrop-dynamic-library-consumer');
check(/milkdropLiveSyncId/.test(integration)&&/importedMilkdrop:\{id:lp\.id/.test(integration),'milkdrop-follower-source-sync');
check(/new window\.SVMilkdrop\.Preset|new window\.SVMilkdrop\?\.Preset/.test(integration)||/new window\.SVMilkdrop\.Preset/.test(integration),'milkdrop-import-compatibility-probe');
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
