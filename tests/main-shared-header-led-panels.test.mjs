import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const js=read('js/main-veluna-adapter.js');
const css=read('css/main-player-visual-repair-20260821.css');
const config=read('config/veluna-assets.js');
const index=read('index.html');

test('Main desktop and iPhone keep one shared LYVRA header asset owner',()=>{
  const hits=index.match(/\/assets\/veluna\/header\/veluna-player-header\.webp/g)||[];
  assert.ok(hits.length>=2,'desktop and mobile Main must reference the shared header asset');
  assert.deepEqual(fs.readFileSync('assets/veluna/header/veluna-player-header.webp'),fs.readFileSync('public/assets/veluna/header/veluna-player-header.webp'));
  assert.match(js,/HEADER_ASSET_SRC='\/assets\/veluna\/header\/veluna-player-header\.webp\?v=20260830-shared-lyvra-header-v2'/);
  assert.match(js,/querySelectorAll\('#pcHeaderNewLogo,\.hero-brand-image'\)/);
});

test('Main shared visual mirrors remain byte-identical',()=>{
  assert.equal(read('public/js/main-veluna-adapter.js'),js);
  assert.equal(read('public/css/main-player-visual-repair-20260821.css'),css);
  assert.equal(read('public/config/veluna-assets.js'),config);
});

test('shared visual bootstrap has fresh cache identities',()=>{
  assert.match(config,/mainVisualRepairVersion = '2026-08-30-shared-header-led-repair-v2'/);
  assert.match(config,/mainVelunaAdapterVersion = '2026-08-30-shared-header-led-repair-v2'/);
});

test('redundant outer header and system-panel shells are visually removed',()=>{
  assert.match(css,/2026-08-30 SHARED LYVRA HEADER \+ PANEL CLEANUP/);
  assert.match(css,/body\[data-veluna-page="main"\] \.hero,[\s\S]*border:0!important;[\s\S]*background:transparent!important;[\s\S]*box-shadow:none!important/);
  assert.match(css,/body\[data-veluna-page="main"\] \.status-cluster,[\s\S]*\.systempanel-grid-v74\{[\s\S]*border:0!important;[\s\S]*background:transparent!important;[\s\S]*box-shadow:none!important/);
});

test('shared header is larger on desktop and the canonical visible image is responsive on iPhone',()=>{
  assert.match(css,/#pcHeaderNewLogo\.pc-header-new-logo\{[\s\S]*width:min\(560px,100%\)!important;[\s\S]*max-height:none!important;[\s\S]*object-fit:contain!important/);
  assert.match(css,/@media \(max-width:760px\)\{[\s\S]*#pcHeaderNewLogo\.pc-header-new-logo,[\s\S]*\.hero-brand-image\{[\s\S]*width:min\(360px,94vw\)!important;[\s\S]*max-height:none!important/);
});

test('Main observational LED bridge consumes existing runtime truth without creating a network owner',()=>{
  for(const id of ['statusBuffer','statusWorker','statusAudio','statusWatchdog','statusReconnect']) assert.match(js,new RegExp(id));
  assert.match(js,/function syncAudioHudLeds\(reason='state'\)/);
  assert.match(js,/function syncWorkerLedFromExistingTruth\(\)/);
  assert.match(js,/statusStream/);
  assert.match(js,/statusMeta/);
  assert.match(js,/navigator\.onLine/);
  assert.match(js,/audio\.readyState/);
  assert.match(js,/audio\.error/);
  assert.match(js,/S666AllPlayerAudioRecovery/);
  assert.match(js,/data-audio-recovery-owner/);
  assert.match(js,/data-audio-recovery-action/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/probeWorkerLed|__S666_MAIN_LED_WORKER_TIMER__/);
});

test('Buffer LED retains waiting stalled and suspend truth until playback recovery clears it',()=>{
  assert.match(js,/let bufferEventState=''/);
  assert.match(js,/\['waiting','stalled','suspend'\]\.includes\(reason\)/);
  assert.match(js,/bufferEventState==='stalled'/);
  assert.match(js,/Stall erkannt, wartet auf Recovery/);
  assert.match(js,/\['playing','canplay','loadeddata'\]\.includes\(reason\)/);
  assert.match(js,/event=>syncAudioHudLeds\(event\.type\)/);
});

test('LED bridge is observational and does not mutate protected audio graph or transport',()=>{
  assert.doesNotMatch(js,/new AudioContext|webkitAudioContext|createMediaElementSource|createGain|createBiquadFilter/);
  assert.doesNotMatch(js,/audio\.(?:load|play|pause)\s*\(/);
  assert.doesNotMatch(js,/audio\.src\s*=|audio\.setAttribute\(['"]src['"]|audio\.removeAttribute\(['"]src['"]\)/);
  assert.doesNotMatch(js,/SMFPBoostCore|MeterBus/);
});

test('LED visual semantics separate healthy warning error backup and idle states',()=>{
  assert.match(css,/LED meaning: cyan healthy\/active, pink transition\/warning, red error, purple backup\/fallback, hollow white idle\/off/);
  assert.match(css,/\.status-chip\.state-error \.status-dot/);
  assert.match(css,/background:#ff304f!important/);
  assert.match(css,/\.status-chip\.state-warn \.status-dot/);
  assert.match(css,/background:#ff3dbb!important/);
  assert.match(css,/\.status-chip\.state-backup \.status-dot/);
  assert.match(css,/background:#b45cff!important/);
  assert.match(css,/\.status-chip\.state-empty \.status-dot/);
  assert.match(css,/background:transparent!important/);
});
