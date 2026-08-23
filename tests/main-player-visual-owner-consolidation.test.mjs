import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('css/main-player-visual-repair-20260821.css');
const publicCss = read('public/css/main-player-visual-repair-20260821.css');
const stageCss = read('css/player-stage-v2.css');
const stageJs = read('js/player-stage-v2.js');
const equalizer = read('js/equalizer.js');
const index = read('index.html');

test('visual repair mirrors remain identical', () => {
  assert.equal(publicCss, css);
});

test('legacy wrapper reactivity is neutralized without audio mutation', () => {
  assert.match(css, /VISUAL OWNER CONSOLIDATION BRIDGE/);
  const frameRule = css.match(/\.frame-stage::before\{([^}]*)\}/)?.[1] || '';
  assert.match(frameRule, /background:radial-gradient/);
  assert.doesNotMatch(frameRule, /--pc-audio-energy/);
  assert.match(frameRule, /transition:none!important/);
  assert.match(css, /\.now-cover-wrap\{[^}]*filter:none!important;[^}]*transition:none!important/);
  assert.match(stageJs, /function driveReactiveVisuals/);
  assert.match(equalizer, /window\.__MeterBus\s*=\s*\{/);
});

test('active single-logo wrapper cannot remain a legacy audio-reactive owner', () => {
  assert.match(index, /id="pcHeaderBrandSplit" class="pc-header-brand-split pc-header-brand-single"/);
  const wrapperRule = css.match(/#pcHeaderBrandSplit\.pc-header-brand-split\.pc-header-brand-single\{([^}]*)\}/)?.[1] || '';
  assert.match(wrapperRule, /--logo-energy:0!important/);
  assert.match(wrapperRule, /filter:none!important/);
  assert.match(wrapperRule, /transform:none!important/);
  assert.match(wrapperRule, /transition:none!important/);
  assert.doesNotMatch(wrapperRule, /--pc-audio-energy/);
  assert.match(stageJs, /image\.classList\.add\('s666-main-header-image'\);normalizeHeaderImage\(image\)/);
  assert.match(stageJs, /image\.classList\.add\('s666-canonical-header-image'\)/);
  assert.match(stageCss, /\.s666-canonical-header-image\{[^}]*var\(--s666-stage-mid\)[^}]*var\(--s666-stage-high\)/);
});

test('visual repair owns no ticker selector but repairs the missing legacy keyframes', () => {
  assert.doesNotMatch(css, /\.ticker-window\{/);
  assert.doesNotMatch(css, /#nowPlayingTicker/);
  assert.match(css, /@keyframes v73TickerRun\{0%\{transform:translate3d\(100%,0,0\)\}100%\{transform:translate3d\(-100%,0,0\)\}\}/);
  assert.match(stageCss, /@keyframes s666TitleMarquee/);
  assert.match(stageCss, /\.now-playing :is\(#nowPlayingTicker,\.ticker-text\)\{[\s\S]*?animation:s666TitleMarquee 14s linear infinite!important/);
});

test('repair layer does not touch protected runtime', () => {
  for (const forbidden of [
    '/api/discord', 'S666DiscordPlayerAddonV3', 'S666Messenger', 'S666SkipControl',
    'AudioContext', '__MeterBus', 'fetch(', '/api/admin/skip'
  ]) assert.equal(css.includes(forbidden), false, forbidden);
});
