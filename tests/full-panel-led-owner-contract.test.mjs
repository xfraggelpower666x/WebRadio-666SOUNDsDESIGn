import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('top function LEDs have one canonical player-core truth owner', async () => {
  const core = await read('js/player-core.js');
  const pub = await read('public/js/player-core.js');
  assert.equal(pub, core);
  for (const id of ['statusStream','statusBuffer','statusSource','statusMeta','statusWorker','statusAudio','statusWatchdog','statusReconnect','statusMeter']) {
    assert.ok(core.includes(`document.getElementById('${id}')`), id);
  }
  assert.match(core, /function updateCanonicalPanelStatus\(reason = 'tick'\)/);
  assert.match(core, /data-panel-status-owner', 'player-core-v2'/);
  assert.match(core, /panelWorkerOnline = true/);
  assert.match(core, /panelMetadataOnline = true/);
  assert.match(core, /canonicalWatchdogAvailable/);
  assert.match(core, /meterBusIsFresh/);
  assert.match(core, /panelReconnectState = 'running'/);
});

test('ordinary audio error cannot auto-switch Main Stream to Backup', async () => {
  const core = await read('js/player-core.js');
  const block = core.slice(core.indexOf("audio?.addEventListener('error'"), core.indexOf("audio?.addEventListener('playing'"));
  assert.match(block, /MAIN STREAM ERROR/);
  assert.doesNotMatch(block, /setSource\('fallback'\)/);
  assert.doesNotMatch(block, /playCurrent\(\)/);
});

test('mobile bottom meter has one writer: canonical equalizer', async () => {
  const html = await read('index.html');
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/index.html'), html);
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.doesNotMatch(html, /updateBottomCenterOutSegments\(bottomLevel/);
  assert.match(eq, /querySelectorAll\('#mffBottomBars i'\)/);
  assert.match(eq, /applyBottomMeter\(bottomMeterSegments/);
});
