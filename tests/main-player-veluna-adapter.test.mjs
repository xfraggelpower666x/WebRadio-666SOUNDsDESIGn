import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const js=read('js/main-veluna-adapter.js');
const css=read('css/main-veluna-adapter.css');
const headers=read('_headers');
const bootstrap=read('config/veluna-assets.js');

test('main VELUNA adapter root/public mirrors are byte-identical',()=>{
  assert.equal(read('public/js/main-veluna-adapter.js'),js);
  assert.equal(read('public/css/main-veluna-adapter.css'),css);
  assert.equal(read('public/_headers'),headers);
});
test('bootstrap config is revalidated and loads one main adapter',()=>{
  assert.match(headers,/\/config\/\*\n  Cache-Control: no-cache, must-revalidate/);
  assert.match(bootstrap,/mainVelunaAdapterVersion = '2026-08-23-main-veluna-adapter-v2'/);
  assert.match(bootstrap,/main-veluna-adapter\.css/);
  assert.match(bootstrap,/main-veluna-adapter\.js/);
});
test('ticker adapts VELUNA measured static-vs-running behavior on the existing canonical element',()=>{
  assert.match(js,/measureTextWidth\(ticker\)/);
  assert.match(js,/viewportWidth=Math\.floor\(windowNode\.clientWidth/);
  assert.match(js,/itemWidth<=Math\.max\(0,viewportWidth-24\)/);
  assert.match(js,/measureSeparatorWidth\(ticker\)/);
  assert.match(js,/shift=itemWidth\+gapPadding\+separatorWidth/);
  assert.match(js,/Math\.max\(14,Math\.min\(42,shift\/34\)\)/);
  assert.match(js,/MutationObserver/);
  assert.match(css,/#nowPlayingTicker\.s666-veluna-main-ticker\.is-running/);
  assert.match(css,/content:" ◆ " attr\(data-s666-marquee-text\)/);
  assert.doesNotMatch(js,/createElement\(['"](?:div|span)['"]\).*nowPlayingTicker/);
});
test('cyber boot waits fail-closed for the actual central boot script owner',()=>{
  assert.match(js,/installBootAfterCentralOwner/);
  assert.match(bootstrap,/__S666_CENTRAL_BOOT_LOAD_STATE__ = window\.S666CentralBootScreen \? 'loaded' : 'pending'/);
  assert.match(bootstrap,/__S666_CENTRAL_BOOT_LOAD_STATE__ = 'loaded'/);
  assert.match(bootstrap,/__S666_CENTRAL_BOOT_LOAD_STATE__ = 'error'/);
  assert.match(js,/window\.S666CentralBootScreen/);
  assert.match(js,/central\?\.isActive\?\.\(\)/);
  assert.match(js,/s666-central-boot-active/);
  assert.match(js,/#s666CentralBoot/);
  assert.match(js,/__S666_CENTRAL_BOOT_LOAD_STATE__/);
  assert.match(js,/loadState==='error'/);
  assert.match(js,/loadState==='loaded'/);
  assert.doesNotMatch(js,/5200|Date\.now\(\)-started|centralScript=/);
  assert.match(js,/const play=q\('#playBtn'\)/);
  assert.match(js,/play\.click\(\)/);
  assert.match(js,/audio\.addEventListener\('playing',success/);
  assert.doesNotMatch(js,/new AudioContext|webkitAudioContext|createMediaElementSource|fetch\(/);
});
test('only DNA wave reactor and phase are visually amplified using stage variables',()=>{
  assert.match(css,/#pcLeftFxAddon \.pc-addon-waveform i/);
  assert.match(css,/#pcLeftFxAddon \.pc-addon-reactor-core/);
  assert.match(css,/#pcRightFxAddon \.pc-addon-phase/);
  assert.match(css,/--s666-stage-pulse/);
  assert.match(css,/--s666-stage-peak/);
  assert.match(css,/--s666-stage-mid/);
  assert.doesNotMatch(js,/__MeterBus|MeterBus/);
});
