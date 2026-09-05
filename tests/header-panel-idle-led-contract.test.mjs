import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('header inner panels are transparent while outer player shell remains untouched', async () => {
  const css = await read('css/desktop.css');
  assert.equal(await read('public/css/desktop.css'), css);
  assert.match(css, /HEADER_PANEL_TRANSPARENCY_LED_COMPACT_V1_20260905/);
  assert.match(css, /\.player-shell > \.hero\{[\s\S]*?background:transparent!important;[\s\S]*?border:0!important;/);
  assert.match(css, /\.top-hud \.status-cluster,[\s\S]*?background:transparent!important;[\s\S]*?border:0!important;/);
  assert.doesNotMatch(css, /HEADER_PANEL_TRANSPARENCY_LED_COMPACT_V1_20260905[\s\S]*?\.player-shell\{[\s\S]*?border:0!important/);
});

test('system panel LED labels are compact', async () => {
  const css = await read('css/desktop.css');
  assert.match(css, /\.systempanel-v74 \.status-code\{[\s\S]*?font-size:9px!important/);
  assert.match(css, /\.systempanel-v74 \.status-dot\{[\s\S]*?width:7px!important/);
});

test('source selection no longer means active LED', async () => {
  const controls = await read('js/controls.js');
  assert.equal(await read('public/js/controls.js'), controls);
  assert.match(controls, /classList\.toggle\('is-selected', source === 'main'\)/);
  assert.doesNotMatch(controls, /classList\.toggle\('is-active', source === 'main'\)/);
});

test('stopped player keeps STR SRC and selected Main LED neutral', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(html, /id="statusStream" class="status-chip led-state state-empty"/);
  assert.match(html, /id="statusSource" class="status-chip led-state state-empty"/);
  assert.match(html, /id="mainBtn" class="status-chip led-state state-empty source-chip source-mini-chip-v80 is-selected"/);
  assert.match(core, /applyStatusChip\(statusSource, userStopped \? 'empty' : playing \?/);
  assert.match(core, /applyStatusChip\(statusMain, userStopped \? 'empty' : 'ok'/);
  assert.match(core, /applyStatusChip\(statusStream, 'empty', 'Stream inactive'\)/);
});
