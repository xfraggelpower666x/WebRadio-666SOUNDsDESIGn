import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const statusOnlyIds = [
  'statusStream',
  'statusBuffer',
  'statusSource',
  'statusMeta',
  'statusWorker',
  'statusAudio',
  'statusWatchdog',
  'statusReconnect',
  'statusMeter',
  'statusDiscord',
  'statusGovee'
];

test('top system panel keeps one DOM control for every existing status/action ID', async () => {
  const html = await read('index.html');
  for (const id of [...statusOnlyIds, 'mainBtn', 'fallbackBtn', 'statusAdmin']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} must exist exactly once`);
  }
});

test('real stream actions stay owned by player-core rather than top status aliases', async () => {
  const core = await read('js/player-core.js');
  assert.match(core, /reconnectBtn\?\.addEventListener\('click'/);
  assert.match(core, /mainBtn\?\.addEventListener\('click'/);
  assert.match(core, /fallbackBtn\?\.addEventListener\('click'/);
  assert.doesNotMatch(core, /statusReconnect\?\.addEventListener\('click'/);
});

test('admin top chip reuses the existing protected admin overlay owner', async () => {
  const admin = await read('js/player-admin-overlay.js');
  assert.match(admin, /const chip=\$\("statusAdmin"\)/);
  assert.match(admin, /chip\.addEventListener\("click",openAdminOverlay\)/);
  assert.match(admin, /window\.FPAdminOverlay=/);
  assert.doesNotMatch(admin, /new AudioContext|createMediaElementSource/);
});

test('Discord and Govee top chips are not duplicate action controllers', async () => {
  const stage = await read('js/player-stage-v2.js');
  const govee = await read('js/system-extra/govee/govee-scene-sync.js');
  const admin = await read('js/player-admin-overlay.js');

  assert.match(stage, /s666StageDiscord/);
  assert.match(stage, /S666DiscordPlayerAddonV3\.messagePost/);
  assert.doesNotMatch(stage, /statusDiscord[^\n]{0,160}addEventListener/);
  assert.doesNotMatch(admin, /\$\("statusDiscord"\)[^\n]{0,160}addEventListener/);

  assert.match(govee, /document\.getElementById\("statusGovee"\)/);
  assert.match(govee, /applyStatusChip\(chip, ledState, tooltip\)/);
  assert.doesNotMatch(govee, /statusGovee[^\n]{0,220}addEventListener/);
});

test('root/public action owners remain byte-identical', async () => {
  for (const path of [
    'js/player-core.js',
    'js/player-stage-v2.js',
    'js/player-admin-overlay.js',
    'js/system-extra/govee/govee-scene-sync.js'
  ]) {
    assert.equal(await read(path), await read(`public/${path}`), path);
  }
});
