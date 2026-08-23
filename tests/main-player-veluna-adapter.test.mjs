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
  assert.match(bootstrap,/mainVelunaAdapterVersion = '2026-08-23-main-ticker-dynamic-lane-dna-contained-v4'/);
  assert.match(bootstrap,/main-veluna-adapter\.css/);
  assert.match(bootstrap,/main-veluna-adapter\.js/);
});
test('main ticker uses VELUNA measured travel and always runs non-empty canonical text',()=>{
  assert.match(js,/measureTextWidth\(ticker\)/);
  assert.match(js,/measureSeparatorWidth\(ticker\)/);
  assert.match(js,/shift=itemWidth\+gapPadding\+separatorWidth/);
  assert.match(js,/Math\.max\(14,Math\.min\(42,shift\/34\)\)/);
  assert.doesNotMatch(js,/itemWidth<=Math\.max\(0,viewportWidth-24\)/);
  assert.match(js,/ticker\.classList\.add\('is-running'\)/);
  assert.match(js,/MutationObserver/);
  assert.match(css,/#nowPlayingTicker\.s666-veluna-main-ticker\.is-running/);
  assert.match(css,/content:" ◆ " attr\(data-s666-marquee-text\)/);
  assert.doesNotMatch(js,/createElement\(['"](?:div|span)['"]\).*nowPlayingTicker/);
});
test('main ticker lane expands dynamically when the cover is not visibly occupying column one',()=>{
  assert.match(js,/function syncTickerGeometry\(\)/);
  assert.match(js,/getComputedStyle\(cover\)/);
  assert.match(js,/rect\.width>8&&rect\.height>8/);
  assert.match(js,/--s666-main-ticker-offset/);
  assert.match(css,/grid-column:1\/-1!important/);
  assert.match(css,/width:calc\(100% - var\(--s666-main-ticker-offset,0px\)\)!important/);
  assert.match(css,/margin-left:var\(--s666-main-ticker-offset,0px\)!important/);
});
test('cyber boot waits fail-closed for the persistent central boot load state',()=>{
  assert.match(js,/installBootAfterCentralOwner/);
  assert.match(js,/window\.S666CentralBootScreen/);
  assert.match(js,/central\?\.isActive\?\.\(\)/);
  assert.match(js,/s666-central-boot-active/);
  assert.match(js,/#s666CentralBoot/);
  assert.match(js,/__S666_CENTRAL_BOOT_LOAD_STATE__/);
  assert.match(js,/loadState==='error'/);
  assert.match(js,/loadState==='loaded'/);
  assert.doesNotMatch(js,/centralScript=|5200|Date\.now\(\)-started/);
  assert.match(js,/const play=q\('#playBtn'\)/);
  assert.match(js,/play\.click\(\)/);
  assert.match(js,/audio\.addEventListener\('playing',success/);
  assert.doesNotMatch(js,/new AudioContext|webkitAudioContext|createMediaElementSource|fetch\(/);
});
test('DNA wave stays contained while reactor and phase keep strong stage-driven reactivity',()=>{
  assert.match(css,/#pcLeftFxAddon \.pc-addon-waveform\{overflow:hidden!important;align-items:flex-end!important\}/);
  assert.match(css,/#pcLeftFxAddon \.pc-addon-waveform i\{max-height:calc\(100% - 6px\)!important;min-height:7%!important;transform:none!important;transform-origin:bottom!important/);
  assert.match(css,/#pcLeftFxAddon \.pc-addon-reactor-core/);
  assert.match(css,/#pcRightFxAddon \.pc-addon-phase/);
  assert.match(css,/--s666-stage-pulse/);
  assert.match(css,/--s666-stage-peak/);
  assert.match(css,/--s666-stage-mid/);
  assert.doesNotMatch(js,/__MeterBus|MeterBus/);
});
