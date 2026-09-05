import { readFile, writeFile } from 'node:fs/promises';

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`missing:${label}`);
  return text.replace(from, to);
}

const OLD_CACHE = '2026-09-04-iphone-layout-appreturn-v4';
const NEW_CACHE = '2026-09-05-header-panels-led-idle-v1';

let html = await readFile('index.html', 'utf8');
html = mustReplace(html,
  '<button id="statusStream" class="status-chip led-state state-main"',
  '<button id="statusStream" class="status-chip led-state state-empty"',
  'initial-str-neutral');
html = mustReplace(html,
  '<button id="statusSource" class="status-chip led-state state-external"',
  '<button id="statusSource" class="status-chip led-state state-empty"',
  'initial-src-neutral');
html = mustReplace(html,
  '<button id="statusMeta" class="status-chip led-state state-api"',
  '<button id="statusMeta" class="status-chip led-state state-empty"',
  'initial-met-neutral');
html = mustReplace(html,
  '<button id="mainBtn" class="status-chip led-state state-main is-active source-chip source-mini-chip-v80"',
  '<button id="mainBtn" class="status-chip led-state state-empty source-chip source-mini-chip-v80 is-selected"',
  'initial-main-selected-neutral');
html = html.replaceAll(OLD_CACHE, NEW_CACHE);
await writeFile('index.html', html);
await writeFile('public/index.html', html);

let controls = await readFile('js/controls.js', 'utf8');
controls = mustReplace(controls,
`export function markSourceButtons(mainBtn, fallbackBtn, source) {
  mainBtn?.classList.toggle('is-active', source === 'main');
  fallbackBtn?.classList.toggle('is-active', source === 'fallback');
}`,
`export function markSourceButtons(mainBtn, fallbackBtn, source) {
  mainBtn?.classList.toggle('is-selected', source === 'main');
  fallbackBtn?.classList.toggle('is-selected', source === 'fallback');
}`,
  'source-selection-not-activity');
await writeFile('js/controls.js', controls);
await writeFile('public/js/controls.js', controls);

let core = await readFile('js/player-core.js', 'utf8');
core = mustReplace(core,
`  applyStatusChip(statusSource, sourceIsBackup ? 'backup' : 'main', sourceIsBackup ? 'Source: Backup Stream' : 'Source: Main Stream');`,
`  applyStatusChip(statusSource, userStopped ? 'empty' : playing ? (sourceIsBackup ? 'backup' : 'main') : 'empty',
    userStopped ? 'Source idle' : playing ? (sourceIsBackup ? 'Source: Backup Stream' : 'Source: Main Stream') : 'Source selected, transport idle');`,
  'src-idle-neutral');
core = mustReplace(core,
`    applyStatusChip(statusMain, userStopped ? 'stopped' : 'ok', userStopped ? 'Main Stream selected but stopped' : 'Main Stream active');`,
`    applyStatusChip(statusMain, userStopped ? 'empty' : 'ok', userStopped ? 'Main Stream selected, transport stopped' : 'Main Stream active');`,
  'main-stop-neutral');
core = mustReplace(core,
`    applyStatusChip(statusBackup, userStopped ? 'stopped' : 'ok', userStopped ? 'Backup Stream selected but stopped' : 'Backup Stream active');`,
`    applyStatusChip(statusBackup, userStopped ? 'empty' : 'ok', userStopped ? 'Backup Stream selected, transport stopped' : 'Backup Stream active');`,
  'backup-stop-neutral');
core = mustReplace(core,
`  } else if (value.includes('stopped') || value.includes('stop') || value.includes('pause')) {
    applyStatusChip(statusStream, 'stopped', 'Stream nicht aktiv');`,
`  } else if (value.includes('stopped') || value.includes('stop') || value.includes('pause')) {
    applyStatusChip(statusStream, 'empty', 'Stream inactive');`,
  'str-stop-neutral');
core = core.replaceAll(OLD_CACHE, NEW_CACHE);
await writeFile('js/player-core.js', core);
await writeFile('public/js/player-core.js', core);

let desktop = await readFile('css/desktop.css', 'utf8');
const marker = '/* HEADER_PANEL_TRANSPARENCY_LED_COMPACT_V1_20260905 */';
if (!desktop.includes(marker)) {
  desktop += `\n\n${marker}\n@media (min-width:761px){\n  /* Keep only the outer .player-shell frame. Header logo and system LED rows float directly inside it. */\n  .player-shell > .hero{\n    background:transparent!important;\n    border:0!important;\n    box-shadow:none!important;\n  }\n  .top-hud .status-cluster,\n  .top-hud .status-bar,\n  .top-hud .systempanel-grid-v74{\n    background:transparent!important;\n    border:0!important;\n    box-shadow:none!important;\n    min-height:34px!important;\n    padding:2px 4px!important;\n  }\n  .systempanel-v74 .systempanel-group{\n    background:transparent!important;\n    border:0!important;\n    box-shadow:none!important;\n  }\n  .systempanel-v74 .status-chip{\n    min-width:auto!important;\n    height:25px!important;\n    min-height:25px!important;\n    padding:0 7px!important;\n    gap:5px!important;\n    font-size:9px!important;\n    letter-spacing:.075em!important;\n  }\n  .systempanel-v74 .status-code{\n    font-size:9px!important;\n    letter-spacing:.075em!important;\n    line-height:1!important;\n  }\n  .systempanel-v74 .status-dot{\n    width:7px!important;\n    height:7px!important;\n    flex:0 0 7px!important;\n  }\n  .systempanel-v74 .source-chip.is-selected:not(.is-active){\n    border-color:rgba(40,255,244,.42)!important;\n    box-shadow:inset 0 0 0 1px rgba(40,255,244,.05)!important;\n  }\n  .systempanel-v74 .source-chip.is-selected:not(.is-active) .status-dot{\n    background:transparent!important;\n    border:1px solid rgba(255,255,255,.82)!important;\n    box-shadow:0 0 6px rgba(255,255,255,.24)!important;\n  }\n}\n`;
}
await writeFile('css/desktop.css', desktop);
await writeFile('public/css/desktop.css', desktop);

const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nconst read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');\n\ntest('header inner panels are transparent while outer player shell remains untouched', async () => {\n  const css = await read('css/desktop.css');\n  assert.equal(await read('public/css/desktop.css'), css);\n  assert.match(css, /HEADER_PANEL_TRANSPARENCY_LED_COMPACT_V1_20260905/);\n  assert.match(css, /\\.player-shell > \\.hero\\{[\\s\\S]*?background:transparent!important;[\\s\\S]*?border:0!important;/);\n  assert.match(css, /\\.top-hud \\.status-cluster,[\\s\\S]*?background:transparent!important;[\\s\\S]*?border:0!important;/);\n  assert.doesNotMatch(css, /HEADER_PANEL_TRANSPARENCY_LED_COMPACT_V1_20260905[\\s\\S]*?\\.player-shell\\{[\\s\\S]*?border:0!important/);\n});\n\ntest('system panel LED labels are compact', async () => {\n  const css = await read('css/desktop.css');\n  assert.match(css, /\\.systempanel-v74 \\.status-code\\{[\\s\\S]*?font-size:9px!important/);\n  assert.match(css, /\\.systempanel-v74 \\.status-dot\\{[\\s\\S]*?width:7px!important/);\n});\n\ntest('source selection no longer means active LED', async () => {\n  const controls = await read('js/controls.js');\n  assert.equal(await read('public/js/controls.js'), controls);\n  assert.match(controls, /classList\\.toggle\\('is-selected', source === 'main'\\)/);\n  assert.doesNotMatch(controls, /classList\\.toggle\\('is-active', source === 'main'\\)/);\n});\n\ntest('stopped player keeps STR SRC and selected Main LED neutral', async () => {\n  const html = await read('index.html');\n  const core = await read('js/player-core.js');\n  assert.equal(await read('public/index.html'), html);\n  assert.equal(await read('public/js/player-core.js'), core);\n  assert.match(html, /id="statusStream" class="status-chip led-state state-empty"/);\n  assert.match(html, /id="statusSource" class="status-chip led-state state-empty"/);\n  assert.match(html, /id="mainBtn" class="status-chip led-state state-empty source-chip source-mini-chip-v80 is-selected"/);\n  assert.match(core, /applyStatusChip\\(statusSource, userStopped \\? 'empty' : playing \\?/);\n  assert.match(core, /applyStatusChip\\(statusMain, userStopped \\? 'empty' : 'ok'/);\n  assert.match(core, /applyStatusChip\\(statusStream, 'empty', 'Stream inactive'\\)/);\n});\n`;
await writeFile('tests/header-panel-idle-led-contract.test.mjs', test);

console.log('header panels + compact idle LED repair applied');
