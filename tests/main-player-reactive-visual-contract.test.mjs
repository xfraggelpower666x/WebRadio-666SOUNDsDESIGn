// Main/all-player live audio-reactive visual and metadata contract v1.0.3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main player has one visual writer per responsibility', async () => {
  const html = await read('index.html');
  const stage = await read('js/player-stage-v2.js');
  const phase10 = await read('js/phase10-stability-iphone-panel-hud.js');
  const effects = await read('css/effects.css');
  const boot = phase10.match(/function boot\(\)\{([\s\S]*?)window\.S666Phase10/)?.[1] || '';
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/phase10-stability-iphone-panel-hud.js'), phase10);
  assert.doesNotMatch(html, /v140PcSideAddonContentScript|fraggledna-rail-led-js/);
  assert.equal((html.match(/id="nowCover"/g) || []).length, 1);
  assert.doesNotMatch(stage, /\.eq-bar-fill|\.side-meter-fill|pcBottomSyncMeter/);
  assert.match(stage, /single MeterBus consumer/i);
  assert.match(stage, /dnaRailLedLeft/);
  assert.doesNotMatch(effects, /pulseGlow|side-meter-fill|eq-bar-fill/);
  assert.ok(boot, 'Phase10 boot block must remain discoverable');
  assert.doesNotMatch(boot, /\buiFinetuneV1\s*\(\s*\)/, 'legacy Phase10 UI finetune must not own boot-time layout');
  assert.doesNotMatch(boot, /\bforcedUiApplyV1\s*\(\s*\)/, 'legacy forced UI must not overwrite canonical header/version');
  assert.doesNotMatch(boot, /\bstartSideMeterReactV1\s*\(\s*\)/, 'legacy 120ms side-meter writer must stay demoted');
  assert.doesNotMatch(boot, /\bdirectfixTickerAndMessage\s*\(\s*\)/, 'legacy ticker writer must stay demoted');
  assert.doesNotMatch(boot, /\bphase10RelocatePcPanels\s*\(\s*\)/, 'legacy panel relocation must stay demoted');
  assert.doesNotMatch(boot, /\bmountBottomSafe\s*\(\s*\)/, 'legacy duplicate mobile bottom meter must stay demoted');
});

test('header is one dedicated canonical 800 by 200 Main asset without destructive rebuild', async () => {
  const stage = await read('js/player-stage-v2.js');
  const css = await read('css/player-stage-v2.css');
  assert.match(stage, /width','800'/);
  assert.match(stage, /height','200'/);
  assert.doesNotMatch(stage, /hero\.innerHTML\s*=/);
  assert.match(css, /--s666-header-ratio:4\/1/);
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
  assert.match(css, /#nowPlayingTicker[\s\S]*?padding-left:0!important/);
  assert.doesNotMatch(css, /#nowPlayingTicker[\s\S]{0,500}?padding-left:100%!important/);
});

test('main layout preserves existing VELUNA link and gives FX toggles one persistent owner', async () => {
  const html = await read('index.html');
  const stage = await read('js/player-stage-v2.js');
  const css = await read('css/player-stage-v2.css');
  assert.match(html, /id="playerDesignSwitch"[^>]+href="\/veluna"/);
  assert.match(stage, /function ensureMainLayoutControls\(\)/);
  assert.match(stage, /top-hud \.systempanel-right/);
  assert.match(stage, /timeline\.hidden=true/);
  assert.match(stage, /s666-pc-'\+side\+'-fx/);
  assert.match(stage, /setAttribute\('aria-pressed',on\?'true':'false'\)/);
  assert.match(stage, /data-s666-'\+side\+'-fx/);
  assert.match(css, /data-s666-left-fx="off"/);
  assert.match(css, /data-s666-right-fx="off"/);
  assert.match(css, /--s666-side-release/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(142px,174px\)/);
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
  for (const path of ['js/player-stage-v2.js','js/phase10-stability-iphone-panel-hud.js','css/player-stage-v2.css','css/effects.css','css/audio-policy-core.css','js/equalizer.js','js/player-core.js','js/veluna-ui.js','config/veluna-assets.js']) {
    assert.equal(await read(path), await read(`public/${path}`), path);
  }
});
