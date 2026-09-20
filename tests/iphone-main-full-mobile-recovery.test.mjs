import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('iPhone main recovery keeps native controls and mounts visible bottom meter/footer', async () => {
  const js = await read('js/phase10-stability-iphone-panel-hud.js');
  const css = await read('css/phase10-stability-iphone-panel-hud.css');

  assert.match(js, /mountMobilePanelRow\(\);\s*mountMobileFooter\(\);\s*installMobileTransportUiBridge\(\);/);
  assert.doesNotMatch(js, /qsa\('\[data-mff="down"\],\[data-mff="boost"\],\[data-mff="up"\],\.mff-boost-row-panel', app\)\.forEach\(function\(el\)\{ el\.remove\(\); \}\);/);
  assert.match(js, /function syncMobileTransportUi\(\)/);
  assert.match(js, /data-mff-transport-state/);
  assert.match(css, /\.s666-mobile-footer-safe\{[\s\S]*?z-index:2147482900!important/);
  assert.match(css, /#mffApp \.mff-controls\{[\s\S]*?pointer-events:auto!important/);

  assert.equal(await read('public/js/phase10-stability-iphone-panel-hud.js'), js);
  assert.equal(await read('public/css/phase10-stability-iphone-panel-hud.css'), css);
});

test('canonical iPhone main V5 owner reserves footer space and preserves the meter lanes', async () => {
  const css = await read('css/mobile-patches.css');

  assert.match(css, /S666_IPHONE_LAYOUT_APPRETURN_V5 — canonical iPhone main structure owner/);
  assert.match(css, /width:calc\(100vw - 54px\)!important/);
  assert.match(css, /height:calc\(100dvh - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\) - 42px\)!important/);
  assert.match(css, /#mffApp \.mff-bottom\{[\s\S]*?height:38px!important/);
  assert.match(css, /#mffApp \.mff-boost-row-panel\{[\s\S]*?height:30px!important/);
  assert.match(css, /@media \(max-width:380px\) and \(max-height:740px\)[\s\S]*?width:calc\(100vw - 46px\)!important/);

  assert.equal(await read('public/css/mobile-patches.css'), css);
});

test('mobile audio has its own power profile while desktop remains conservative', async () => {
  const core = await read('js/boost-core.js');
  const eq = await read('js/equalizer.js');
  const veluna = await read('veluna/index.html');

  assert.match(core, /MOBILE_GAINS = \[1\.00, 1\.45, 2\.10, 2\.85, 3\.60, 4\.80\]/);
  assert.match(core, /maxBoostStage: mobile \? 5 : 1/);
  assert.match(core, /return isMobileDevice\(\) \? \(MOBILE_GAINS\[stage\] \|\| 1\)/);
  assert.match(core, /limiter\.threshold\.value = mobilePower \? -0\.8 : -2\.5/);
  assert.match(eq, /limiterNode\.threshold\.value = mobileLike\(\) \? -0\.8 : -1/);
  assert.match(veluna, /\[0,1,2,3,4,5\]\.map\(stage=>window\.SMFPBoostCore\.getGain\(stage\)\)/);
  assert.match(veluna, /limiterNode\.threshold\.value=isMobileLike\(\)\?-.8:-2\.5/);

  assert.equal(await read('public/js/boost-core.js'), core);
  assert.equal(await read('core/audio/boost-core.js'), core);
  assert.equal(await read('public/core/audio/boost-core.js'), core);
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.equal(await read('VELUNA/index.html'), veluna);
  assert.equal(await read('public/veluna/index.html'), veluna);
  assert.equal(await read('public/VELUNA/index.html'), veluna);
});

test('main root/public entrypoints carry the new mobile recovery cache keys', async () => {
  const html = await read('index.html');
  assert.match(html, /phase10-stability-iphone-panel-hud\.css\?v=2026-09-20-mobile-recovery-v2/);
  assert.match(html, /phase10-stability-iphone-panel-hud\.js\?v=2026-09-20-mobile-recovery-v2/);
  assert.equal(await read('public/index.html'), html);
});
