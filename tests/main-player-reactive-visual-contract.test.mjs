// Main/all-player live audio-reactive visual and metadata contract v1.0.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main player has one visual writer per responsibility', async () => {
  const html = await read('index.html');
  const stage = await read('js/player-stage-v2.js');
  const effects = await read('css/effects.css');
  assert.equal(await read('public/index.html'), html);
  assert.doesNotMatch(html, /v140PcSideAddonContentScript|fraggledna-rail-led-js/);
  assert.equal((html.match(/id="nowCover"/g) || []).length, 1);
  assert.doesNotMatch(stage, /\.eq-bar-fill|\.side-meter-fill|pcBottomSyncMeter/);
  assert.match(stage, /single MeterBus consumer/i);
  assert.match(stage, /dnaRailLedLeft/);
  assert.doesNotMatch(effects, /pulseGlow|side-meter-fill|eq-bar-fill/);
});

test('header is one canonical 1536 by 509 asset without destructive rebuild', async () => {
  const stage = await read('js/player-stage-v2.js');
  const css = await read('css/player-stage-v2.css');
  assert.match(stage, /width','1536'/);
  assert.match(stage, /height','509'/);
  assert.doesNotMatch(stage, /hero\.innerHTML\s*=/);
  assert.match(css, /--s666-header-ratio:1536\/509/);
  assert.match(css, /s666-canonical-header-image/);
});

test('Now Playing uses live static information plus purple bass-reactive title ticker', async () => {
  const core = await read('js/player-core.js');
  const stage = await read('js/player-stage-v2.js');
  const css = await read('css/player-stage-v2.css');
  assert.match(core, /s666:metadata-live/);
  assert.match(core, /payload\.set_display/);
  assert.match(stage, /DJ: /);
  assert.match(stage, /SET: /);
  assert.match(stage, /s666-now-meta-detail/);
  assert.match(css, /#c56cff/);
  assert.match(css, /--s666-ticker-pulse/);
});

test('metadata and artwork truth stays live and local', async () => {
  const core = await read('js/player-core.js');
  const artwork = await read('js/artwork-core.js');
  const joined = `${core}\n${artwork}`.toLowerCase();
  assert.match(core, /metadata:\s*'\/api\/nowplaying'/);
  assert.match(artwork, /const ENDPOINT = '\/api\/nowplaying'/);
  assert.doesNotMatch(joined, /spotify|musicbrainz|last\.fm|lastfm|discogs|itunes|coverartarchive/);
  assert.match(artwork, /TRACK_MS = 18000/);
});

test('one bus exposes real frequency zones and all-player graphics use varied signal variables', async () => {
  const eq = await read('js/equalizer.js');
  const stage = await read('js/player-stage-v2.js');
  const shared = await read('css/audio-policy-core.css');
  const ui = await read('js/veluna-ui.js');
  assert.match(eq, /low: clamp\(bands\.low/);
  assert.match(eq, /mid: clamp\(bands\.mid/);
  assert.match(eq, /high: clamp\(bands\.high/);
  assert.match(eq, /now \+ 0\.16/);
  assert.match(stage, /pc-addon-waveform/);
  assert.match(stage, /pc-addon-radar/);
  assert.match(stage, /phase-cloud/);
  assert.match(shared, /--veluna-bass/);
  assert.match(shared, /s666-canonical-header-image/);
  assert.match(shared, /#coverImage/);
  assert.match(ui, /shared live audio-reactive graphics/);
});

test('all canonical runtime and style mirrors remain byte-identical', async () => {
  for (const path of ['js/player-stage-v2.js','css/player-stage-v2.css','css/effects.css','css/audio-policy-core.css','js/equalizer.js','js/player-core.js','js/veluna-ui.js','config/veluna-assets.js']) {
    assert.equal(await read(path), await read(`public/${path}`), path);
  }
});
