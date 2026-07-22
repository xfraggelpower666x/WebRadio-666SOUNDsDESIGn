import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function assertMirror(path) {
  assert.equal(await read(path), await read(`public/${path}`), `mirror drift: ${path}`);
}

test('central audio policy owns device boost, ramp, EQ and volume rules', async () => {
  const core = await read('js/boost-core.js');
  assert.match(core, /CENTRAL_AUDIO_POLICY_v2\.0\.2/);
  assert.match(core, /centralPolicyVersion:'2\.0\.2'/);
  assert.match(core, /maxBoostStage:\s*mobile\s*\?\s*5\s*:\s*1/);
  assert.match(core, /playerVolume:\s*!mobile/);
  assert.match(core, /hardwareVolume:\s*mobile/);
  assert.match(core, /coarse\s*&&\s*width\s*<=\s*1024/);
  assert.match(core, /RAMP_SECONDS\s*=\s*0\.16/);
  assert.match(core, /linearRampToValueAtTime/);
  assert.match(core, /__smfpContext/);
  assert.match(core, /EQ_BANDS/);
  assert.match(core, /applyEq/);
  assert.match(core, /ensureGraph/);
  assert.match(core, /installGraphInstrumentation/);
  assert.match(core, /applyVolumePolicy/);
  assert.match(core, /data-smfp-volume-policy/);
  assert.match(core, /__SMFPAudioGraphBridge/);
});

test('central sound UI reuses VELUNA panel and keeps PC boost at one stage', async () => {
  const ui = await read('js/audio-policy-core.js');
  const css = await read('css/audio-policy-core.css');
  assert.match(ui, /ensureDesktopVolume/);
  assert.match(ui, /ensureDesktopSoundPanel/);
  assert.match(ui, /configureExistingSoundPanel/);
  assert.match(ui, /currentPage === 'veluna' && configureExistingSoundPanel\(\)/);
  assert.match(ui, /Number\(button\.dataset\.boost\) <= max/);
  assert.match(ui, /data-central-boost="0"/);
  assert.match(ui, /data-central-boost="1"/);
  assert.doesNotMatch(ui, /data-central-boost="2"/);
  assert.match(ui, /\['sub','low','mid','high','air'\]/);
  assert.match(ui, /shared-sound-panel-confirm/);
  assert.match(ui, /bindSharedSoundRecovery/);
  assert.doesNotMatch(ui, /function bindMobileSoundRecovery/);
  assert.match(css, /@media \(max-width:860px\), \(pointer:coarse\)/);
  assert.match(css, /#velunaVolumeSlider/);
  assert.match(css, /#volumeSlider/);
  assert.match(css, /display:none!important/);
});

test('central artwork policy shows track art once, then stream art, then fallback', async () => {
  const artwork = await read('js/artwork-core.js');
  assert.match(artwork, /TRACK_MS\s*=\s*18000/);
  assert.match(artwork, /streamArtwork/);
  assert.match(artwork, /trackArtwork/);
  assert.match(artwork, /presentedTrackKey/);
  assert.match(artwork, /trackExpiresAt/);
  assert.match(artwork, /track-18s-complete/);
  assert.match(artwork, /streamUrl \|\| fallback\(\)/);
  assert.match(artwork, /MutationObserver/);
  assert.match(artwork, /data-smfp-artwork-mode/);
});

test('shared asset bootstrap loads current audio core and artwork policy for every player', async () => {
  const assets = await read('config/veluna-assets.js');
  assert.match(assets, /Shared infrastructure bootstrap v181/);
  assert.match(assets, /__SMFPAudioGraphBridge/);
  assert.match(assets, /loadCurrentScript/);
  assert.match(assets, /\/js\/boost-core\.js/);
  assert.match(assets, /\/js\/audio-policy-core\.js/);
  assert.match(assets, /\/js\/artwork-core\.js/);
  assert.match(assets, /\/css\/audio-policy-core\.css/);
  for (const path of ['index.html','VELUNA/index.html','veluna/index.html']) {
    assert.match(await read(path), /config\/veluna-assets\.js/);
  }
  for (const path of ['worker.js','workers/webradio-666soundsdesign-worker/worker.js']) {
    assert.match(await read(path), /config\/veluna-assets\.js/);
  }
});

test('central policy mirrors are byte-identical', async () => {
  for (const path of [
    'js/boost-core.js',
    'core/audio/boost-core.js',
    'js/audio-policy-core.js',
    'js/artwork-core.js',
    'css/audio-policy-core.css',
    'config/veluna-assets.js'
  ]) await assertMirror(path);
  assert.equal(await read('js/boost-core.js'), await read('core/audio/boost-core.js'));
  assert.equal(await read('public/js/boost-core.js'), await read('public/core/audio/boost-core.js'));
});
