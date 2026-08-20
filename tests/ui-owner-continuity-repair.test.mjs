import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('index.html');
const publicIndex = read('public/index.html');
const phase10 = read('js/phase10-stability-iphone-panel-hud.js');
const phase10Mirror = read('public/js/phase10-stability-iphone-panel-hud.js');
const stage = read('js/player-stage-v2.js');
const stageMirror = read('public/js/player-stage-v2.js');
const css = read('css/player-stage-v2.css');
const cssMirror = read('public/css/player-stage-v2.css');
const eq = read('js/equalizer.js');
const eqMirror = read('public/js/equalizer.js');

const bootBlock = source => {
  const start = source.indexOf('    function boot(){');
  const end = source.indexOf('\n\n  window.S666Phase10', start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
};

test('UI owner repair keeps all root/public mirrors byte-identical', () => {
  assert.equal(index, publicIndex);
  assert.equal(phase10, phase10Mirror);
  assert.equal(stage, stageMirror);
  assert.equal(css, cssMirror);
  assert.equal(eq, eqMirror);
});

test('Phase10 boots recovery only and no longer mutates canonical player visuals', () => {
  const boot = bootBlock(phase10);
  for (const forbidden of ['mountHudLogo()', 'uiFinetuneV1()', 'iphonePcParityV1()', 'forcedUiApplyV1()', 'startSideMeterReactV1()', 'directfixRestoreStatusLeds()', 'directfixTickerAndMessage()', 'phase10RelocatePcPanels()', 'mountMobilePanelRow()', 'mountBottomSafe()']) {
    assert.doesNotMatch(boot, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const required of ['startIphoneAudioStabilityGuardV2()', 'installAudioFocusGuard()', 'bindMobileStreamLedSwitch()']) assert.ok(boot.includes(required), required);
  assert.match(boot, /data-phase10-ui-owner","canonical-player-stage/);
});

test('canonical side meters and ticker retain one active visual owner', () => {
  const boot = bootBlock(phase10);
  assert.doesNotMatch(boot, /startSideMeterReactV1|directfixTickerAndMessage/);
  assert.match(eq, /applyMeters\(leftMeters, left\)/);
  assert.match(eq, /applyMeters\(rightMeters, right\)/);
  assert.match(stage, /#nowPlayingTicker/);
  assert.match(css, /animation:s666TitleMarquee 14s linear infinite/);
});

test('VELUNA navigation lives in top panel and live runtime timeline is removed', () => {
  assert.equal((index.match(/id="playerDesignSwitch"/g) || []).length, 1);
  const veluna = index.indexOf('id="playerDesignSwitch"');
  const topHudEnd = index.indexOf('</header>', index.indexOf('<header class="top-hud'));
  assert.ok(veluna > 0 && veluna < topHudEnd);
  assert.doesNotMatch(index, /timeline-wrap desktop-only|id="currentTimeText"|id="timelineProgress"|id="durationText"/);
  assert.match(index, /DNA PULSE<\/span><b>0%<\/b>/);
});

test('system panel actions bind to existing canonical systems', () => {
  for (const id of ['statusStream','statusBuffer','statusSource','statusMeta','statusWorker','statusAudio','statusWatchdog','statusReconnect','statusMeter','statusDiscord','statusAdmin','statusGovee']) {
    assert.ok(stage.includes(`bindPanelButton('${id}'`), id);
  }
  assert.match(stage, /S666DiscordPlayerAddonV3/);
  assert.match(stage, /FPAdminOverlay/);
  assert.match(stage, /S666GoveeSync/);
  assert.match(stage, /#reconnectBtn/);
});

test('L-FX and R-FX restore historical persistence keys and proportional expansion', () => {
  assert.match(stage, /s666_'\+side\+'_addon_fx/);
  assert.match(stage, /pc-left-addon-off/);
  assert.match(stage, /pc-right-addon-off/);
  assert.match(css, /pc-single-addon-off/);
  assert.match(css, /pc-both-addons-off/);
  assert.match(css, /display:none!important/);
});

test('desktop resizing preserves geometry instead of forcing viewport-height clipping', () => {
  assert.match(css, /min-height:max\(100dvh,820px\)!important/);
  assert.match(css, /height:auto!important;min-height:808px!important;max-height:none!important/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(150px,190px\)!important/);
});

test('real analyser visual headroom is calmer without touching audio routing', () => {
  assert.match(eq, /visualVolumeScale = Math\.pow\(volume, 1\.15\)/);
  assert.match(eq, /Math\.pow\(absolute, 0\.78\)/);
  assert.match(eq, /visualSignalScale \* 1\.85/);
  assert.match(eq, /visualSignalScale \* 0\.96/);
  assert.match(stage, /Math\.pow\(clamp\(value,0,1\),1\.18\)/);
  assert.match(eq, /createMediaElementSource/);
  assert.match(eq, /__MeterBus/);
});

test('protected AutoDJ and Discord paths remain present during UI repair', () => {
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(stage, /S666DiscordPlayerAddonV3\.messagePost/);
  assert.doesNotMatch(stage, /\/api\/radio\/skip/);
});
