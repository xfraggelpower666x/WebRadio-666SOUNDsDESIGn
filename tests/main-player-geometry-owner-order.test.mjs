import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function stylesheetOrder(html, href) {
  const marker = `href="${href}`;
  return html.indexOf(marker);
}

test('main player loads legacy desktop styling before canonical stage geometry', async () => {
  const html = await read('index.html');
  const publicHtml = await read('public/index.html');
  assert.equal(publicHtml, html, 'root/public main HTML must remain byte-identical');

  const desktop = stylesheetOrder(html, '/css/desktop.css');
  const patches = stylesheetOrder(html, '/css/player-patches.css');
  const stage = stylesheetOrder(html, '/css/player-stage-v2.css');
  const eqOverlay = stylesheetOrder(html, '/css/eq-overlay.css');

  assert.ok(desktop >= 0, 'desktop.css must remain loaded');
  assert.ok(patches > desktop, 'player-patches.css must remain after legacy desktop.css');
  assert.ok(stage > patches, 'player-stage-v2.css must remain after prior desktop geometry layers');
  assert.ok(eqOverlay > stage, 'eq-overlay may follow stage but must not own main shell geometry');
});

test('player-stage-v2 is the scoped current-main geometry authority', async () => {
  const stage = await read('css/player-stage-v2.css');
  const publicStage = await read('public/css/player-stage-v2.css');
  assert.equal(publicStage, stage, 'root/public player-stage geometry must remain byte-identical');

  assert.match(stage, /body\[data-veluna-page="main"\] \.frame-stage \.player-shell\{/);
  assert.match(stage, /width:var\(--s666-main-player-width\)!important/);
  assert.match(stage, /height:calc\(100dvh - 12px\)!important/);
  assert.match(stage, /margin:6px auto!important/);
  assert.match(stage, /flex-direction:column!important/);
  assert.match(stage, /\.player-shell>\.hero\{order:1!important/);
  assert.match(stage, /\.player-shell>\.top-hud\{order:2!important/);
  assert.match(stage, /\.player-shell>\.info-grid\{order:3!important/);
  assert.match(stage, /\.player-shell>\.visualizer\{order:4!important/);
  assert.match(stage, /\.player-shell>\.bottom-console\{order:6!important/);
  assert.match(stage, /#pcBottomSyncMeter\{order:7!important/);
  assert.match(stage, /\.player-shell>\.now-playing\{order:8!important/);
  assert.match(stage, /\.player-shell>\.pc-copyright-footer\{order:9!important/);
});

test('post-stage styles do not claim current main player-shell geometry', async () => {
  for (const path of ['css/eq-overlay.css', 'css/mobile-patches.css']) {
    const css = await read(path);
    assert.doesNotMatch(
      css,
      /body\[data-veluna-page="main"\][^{]*\.player-shell\s*\{[^}]*\b(?:width|height|min-width|max-width|margin|display|flex-direction|gap)\s*:/s,
      `${path} must not become a later main-shell geometry owner`
    );
  }
});
