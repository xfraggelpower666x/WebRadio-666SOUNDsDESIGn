import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createSceneSender, describeScene, LIGHT_SCENES } from '../public/js/system-extra/govee/govee-light-scenes.js';

const capabilities = [{ type: 'devices.capabilities.color_setting', instance: 'colorRgb' }];
const first = { sku: 'H6047', device: 'a', capabilities };
const second = { sku: 'H6198', device: 'b', capabilities };

test('Szenen teilen die Windows-Farben und behandeln Teilerfolg pro Gerät', async () => {
  assert.deepEqual(LIGHT_SCENES, { bunker: 0x6400a0, break: 0x193c82, drop: 0x8800ff });
  let clock = 0;
  const calls = [];
  const sender = createSceneSender(async (members, capability) => {
    calls.push({ members, capability });
    if (calls.length === 1) return { ok: false, results: [
      { ...first, ok: true },
      { ...second, ok: false, retryAfterMs: 8000, error: 'rate_limited' }
    ] };
    return { ok: true };
  }, () => clock);
  const partial = await sender.apply([first, second], 'drop');
  assert.match(describeScene(partial), /H6198: rate_limited/);
  assert.equal(calls[0].capability.value, 0x8800ff);
  clock = 7999;
  await assert.rejects(sender.apply([first, second], 'drop'), /Befehlsfenster/);
  clock += 1;
  await sender.apply([first, second], 'drop');
  assert.deepEqual(calls[1].members, [second]);
  assert.equal((await sender.apply([first, second], 'drop')).unchanged, true);
  await assert.rejects(sender.apply([first], '__proto__'), /Unbekannte/);
});

test('Hauptplayer, beide Veluna-Pfade und Dashboard haben einen Szenen-Einstieg', async () => {
  const pages = await Promise.all(['index.html', 'veluna/index.html', 'VELUNA/index.html', 'dashboard/index.html']
    .map(path => readFile(new URL('../public/' + path, import.meta.url), 'utf8')));
  for (const player of pages.slice(1, 3)) {
    assert.match(player, /id="playerLightScenes"/);
    assert.match(player, /type="module" src="[^"]+govee-light-scenes-panel.js/);
    assert.match(player, /admin-auth-client\.js/);
  }
  assert.equal(pages[1], pages[2]);
  const main = pages[0];
  assert.match(main, /id="statusGovee"[^>]*aria-controls="playerGoveeDialog"/);
  assert.doesNotMatch(main, /id="statusDiscord"|id="playerLightScenes"/);
  const overlay = main.slice(main.indexOf('<dialog id="playerGoveeDialog"'), main.indexOf('</dialog>', main.indexOf('<dialog id="playerGoveeDialog"')));
  for (const id of ['goveeEnableSync', 'goveeModeSelect', 'playerGoveeScene']) {
    assert.ok(overlay.includes('id="' + id + '"'));
    assert.equal(main.split('id="' + id + '"').length, 2);
  }
  const script = await readFile(new URL('../public/js/system-extra/govee/player-govee-overlay.js', import.meta.url), 'utf8');
  assert.match(script, /await window\.S666AdminAuth\.ensure\(\{ forceLogin: true[\s\S]*?dialog\.showModal\(\)/);
  assert.match(script, /await sync\.setEnabled\(enabled\)/);
  assert.ok(pages[3].includes(`querySelector('[data-hud-action="govee"]')`));
  assert.match(pages[3], /data-govee-command="scene"/);
  assert.match(pages[3], /sceneSender\.apply\(selected,sceneSelect\.value\)/);
});
