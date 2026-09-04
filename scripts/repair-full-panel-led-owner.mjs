import { readFile, writeFile, readdir } from 'node:fs/promises';

const OLD_MARK = '2026-09-04-mainstream-single-owner-v1';
const NEW_MARK = '2026-09-04-panel-led-owner-v2';

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`missing:${label}`);
  return text.replace(from, to);
}

const corePath = 'js/player-core.js';
let core = await readFile(corePath, 'utf8');

core = mustReplace(core,
`const statusSource = document.getElementById('statusSource');\nconst statusMain = document.getElementById('mainBtn');`,
`const statusSource = document.getElementById('statusSource');\nconst statusBuffer = document.getElementById('statusBuffer');\nconst statusWorker = document.getElementById('statusWorker');\nconst statusAudio = document.getElementById('statusAudio');\nconst statusWatchdog = document.getElementById('statusWatchdog');\nconst statusReconnect = document.getElementById('statusReconnect');\nconst statusMeter = document.getElementById('statusMeter');\nconst statusMain = document.getElementById('mainBtn');`,
'panel-status-elements');

core = mustReplace(core,
`let switchingStream = false;\nconst PLAY_START_TIMEOUT_MS = 6500;`,
`let switchingStream = false;\nlet panelWorkerOnline = false;\nlet panelMetadataOnline = false;\nlet panelBuffering = false;\nlet panelAudioFault = false;\nlet panelReconnectState = 'idle';\nlet panelReconnectClearTimer = 0;\nlet panelStatusTimer = 0;\nconst PLAY_START_TIMEOUT_MS = 6500;`,
'panel-status-state');

const oldPanelBlock = `function updateStreamPanelLeds(source) {\n  const active = source === 'fallback' || source === 'backup' ? 'backup' : 'main';\n  if (active === 'main') {\n    applyStatusChip(statusMain, 'ok', 'Main stream active');\n    applyStatusChip(statusBackup, 'empty', 'Backup stream inactive');\n  } else {\n    applyStatusChip(statusMain, 'empty', 'Main stream inactive');\n    applyStatusChip(statusBackup, 'ok', 'Backup stream active');\n  }\n}\n\n\n\nfunction setActivePanelLeds() {\n  applyStatusChip(statusStream, 'ok', 'Stream aktiv');\n  applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');\n  applyStatusChip(statusSource, 'ok', 'Quelle aktiv');\n  updateStreamPanelLeds(currentSource);\n}\n\nfunction setStoppedPanelLeds() {\n  applyStatusChip(statusStream, 'stopped', 'Stream gestoppt');\n  applyStatusChip(statusMeta, 'warn', 'Metadaten gestoppt');\n  applyStatusChip(statusSource, 'warn', 'Quelle gestoppt');\n\n  if (currentSource === 'fallback' || currentSource === 'backup') {\n    applyStatusChip(statusMain, 'empty', 'Main stream inactive');\n    applyStatusChip(statusBackup, 'stopped', 'Backup stream selected but stopped');\n  } else {\n    applyStatusChip(statusMain, 'stopped', 'Main stream selected but stopped');\n    applyStatusChip(statusBackup, 'empty', 'Backup stream inactive');\n  }\n}\n`;

const newPanelBlock = `function updateStreamPanelLeds(source) {\n  const active = source === 'fallback' || source === 'backup' ? 'backup' : 'main';\n  if (active === 'main') {\n    applyStatusChip(statusMain, userStopped ? 'stopped' : 'ok', userStopped ? 'Main Stream selected but stopped' : 'Main Stream active');\n    applyStatusChip(statusBackup, 'empty', 'Backup Stream inactive');\n  } else {\n    applyStatusChip(statusMain, 'empty', 'Main Stream inactive');\n    applyStatusChip(statusBackup, userStopped ? 'stopped' : 'ok', userStopped ? 'Backup Stream selected but stopped' : 'Backup Stream active');\n  }\n}\n\nfunction canonicalWatchdogAvailable() {\n  try {\n    const owner = window.S666AllPlayerAudioRecovery;\n    return !!(owner && owner.owner === 'all-player-audio-recovery-v1' && typeof owner.legacyHandoff === 'function');\n  } catch (err) {\n    return false;\n  }\n}\n\nfunction meterBusIsFresh() {\n  try {\n    const bus = window.__MeterBus;\n    return !!(bus && Number(bus.ts) > 0 && Date.now() - Number(bus.ts) < 1500 && bus.source === 'real');\n  } catch (err) {\n    return false;\n  }\n}\n\nfunction audioGraphIsHealthy() {\n  try {\n    return audio?.dataset?.visualizerGraph === 'GRAPH_OK' || document.documentElement.getAttribute('data-visualizer-graph') === 'ok';\n  } catch (err) {\n    return false;\n  }\n}\n\nfunction updateCanonicalPanelStatus(reason = 'tick') {\n  const playing = !!(audio && !userStopped && !audio.paused && !audio.ended && (audio.currentSrc || audio.getAttribute('src')));\n  const sourceIsBackup = currentSource === 'fallback' || currentSource === 'backup';\n  const watchdogReady = canonicalWatchdogAvailable();\n  const meterReady = meterBusIsFresh();\n\n  applyStatusChip(statusStream, userStopped ? 'stopped' : panelAudioFault ? 'warn' : playing ? 'ok' : panelBuffering ? 'buffer' : 'empty',\n    userStopped ? 'Stream stopped' : panelAudioFault ? 'Stream error' : playing ? 'Stream active' : panelBuffering ? 'Stream buffering' : 'Stream idle');\n  applyStatusChip(statusBuffer, userStopped ? 'empty' : panelBuffering ? 'buffer' : playing ? 'stable' : 'empty',\n    userStopped ? 'Buffer inactive' : panelBuffering ? 'Stream buffering' : playing ? 'Buffer stable' : 'Buffer idle');\n  applyStatusChip(statusSource, sourceIsBackup ? 'backup' : 'main', sourceIsBackup ? 'Source: Backup Stream' : 'Source: Main Stream');\n  applyStatusChip(statusMeta, userStopped ? 'empty' : panelMetadataOnline ? 'api' : 'warn',\n    userStopped ? 'Metadata idle' : panelMetadataOnline ? 'Metadata live' : 'Metadata unavailable');\n  applyStatusChip(statusWorker, panelWorkerOnline ? 'online' : 'warn', panelWorkerOnline ? 'Worker / health online' : 'Worker / health unavailable');\n  applyStatusChip(statusAudio, userStopped ? 'empty' : panelAudioFault ? 'error' : playing ? (audioGraphIsHealthy() ? 'ok' : 'warn') : 'empty',\n    userStopped ? 'Audio idle' : panelAudioFault ? 'Audio fault' : playing ? (audioGraphIsHealthy() ? 'Audio graph active' : 'Audio graph waiting') : 'Audio idle');\n  applyStatusChip(statusWatchdog, watchdogReady ? 'ready' : 'warn', watchdogReady ? 'Canonical watchdog ready' : 'Canonical watchdog unavailable');\n  applyStatusChip(statusReconnect, panelReconnectState === 'running' ? 'warn' : panelReconnectState === 'failed' ? 'error' : panelReconnectState === 'ok' ? 'ok' : 'empty',\n    panelReconnectState === 'running' ? 'Reconnect running' : panelReconnectState === 'failed' ? 'Reconnect failed' : panelReconnectState === 'ok' ? 'Reconnect completed' : 'Reconnect idle');\n  applyStatusChip(statusMeter, userStopped ? 'empty' : meterReady ? 'active' : playing ? 'warn' : 'empty',\n    userStopped ? 'Meter idle' : meterReady ? 'MeterBus live' : playing ? 'MeterBus waiting' : 'Meter idle');\n\n  updateStreamPanelLeds(currentSource);\n  try {\n    document.documentElement.setAttribute('data-panel-status-owner', 'player-core-v2');\n    document.documentElement.setAttribute('data-panel-status-reason', String(reason));\n  } catch (err) {}\n}\n\nfunction setActivePanelLeds() {\n  updateCanonicalPanelStatus('active');\n}\n\nfunction setStoppedPanelLeds() {\n  updateCanonicalPanelStatus('stopped');\n}\n`;
core = mustReplace(core, oldPanelBlock, newPanelBlock, 'canonical-panel-block');

core = core.replace(
`applyStatusChip(statusSource, 'ok', 'Quelle aktiv');\napplyStatusChip(statusStream, 'ok', 'Stream aktiv');\napplyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');\nupdateStreamPanelLeds(currentSource);`,
`panelMetadataOnline = false;\nupdateCanonicalPanelStatus('boot');`);

core = mustReplace(core,
`    applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');\nupdateHistory(data.title);`,
`    panelMetadataOnline = true;\n    updateCanonicalPanelStatus('metadata-ok');\nupdateHistory(data.title);`,
'metadata-success');

core = mustReplace(core,
`    applyStatusChip(statusMeta, 'warn', 'Metadaten aktuell nicht erreichbar');`,
`    panelMetadataOnline = false;\n    updateCanonicalPanelStatus('metadata-fail');`,
'metadata-failure');

core = mustReplace(core,
`    applyStatusChip(statusSource, 'ok', 'Quelle aktiv');\n  } catch (err) {\n    applyStatusChip(statusSource, 'warn', 'Externer Hauptplayer meldet Fehler');`,
`    panelWorkerOnline = true;\n    updateCanonicalPanelStatus('health-ok');\n  } catch (err) {\n    panelWorkerOnline = false;\n    updateCanonicalPanelStatus('health-fail');`,
'health-state');

const oldErrorHandler = `audio?.addEventListener('error', async () => {\n  if (userStopped) return;\n  if (currentSource === 'main') {\n    setSource('fallback');\n    await playCurrent();\n  } else {\n    applyStatusChip(statusStream, 'warn', 'Streamfehler auf Main und Backup');\n    setStatus('STREAM ERROR');\n  }\n});`;
const newErrorHandler = `audio?.addEventListener('error', () => {\n  if (userStopped) return;\n  panelAudioFault = true;\n  panelBuffering = false;\n  setStatus(currentSource === 'main' ? 'MAIN STREAM ERROR' : 'BACKUP STREAM ERROR');\n  updateCanonicalPanelStatus('audio-error');\n});`;
core = mustReplace(core, oldErrorHandler, newErrorHandler, 'disable-error-failover');

core = mustReplace(core,
`audio?.addEventListener('playing', async () => {\n  lockVisualStage();`,
`audio?.addEventListener('playing', async () => {\n  panelAudioFault = false;\n  panelBuffering = false;\n  lockVisualStage();`,
'playing-state');

core = mustReplace(core,
`reconnectBtn?.addEventListener('click', async () => {\n  stopPlayback('RECONNECT');\n  userStopped = false;\n  await playCurrent();\n});`,
`reconnectBtn?.addEventListener('click', async () => {\n  panelReconnectState = 'running';\n  updateCanonicalPanelStatus('reconnect-start');\n  stopPlayback('RECONNECT');\n  userStopped = false;\n  await playCurrent();\n  panelReconnectState = audio && !audio.paused ? 'ok' : 'failed';\n  updateCanonicalPanelStatus('reconnect-end');\n  window.clearTimeout(panelReconnectClearTimer);\n  panelReconnectClearTimer = window.setTimeout(() => {\n    panelReconnectState = 'idle';\n    updateCanonicalPanelStatus('reconnect-clear');\n  }, 1800);\n});`,
'reconnect-state');

core = mustReplace(core,
`audio?.addEventListener('stalled', () => { markAudioSelfHealDirty('stalled'); setTimeout(() => recoverInterruptedAudio('stalled'), 350); });\naudio?.addEventListener('suspend', () => { markAudioSelfHealDirty('suspend'); setTimeout(() => recoverInterruptedAudio('suspend'), 350); });`,
`audio?.addEventListener('waiting', () => { if (!userStopped) { panelBuffering = true; updateCanonicalPanelStatus('waiting'); } });\naudio?.addEventListener('canplay', () => { panelBuffering = false; panelAudioFault = false; updateCanonicalPanelStatus('canplay'); });\naudio?.addEventListener('stalled', () => { panelBuffering = true; updateCanonicalPanelStatus('stalled'); markAudioSelfHealDirty('stalled'); setTimeout(() => recoverInterruptedAudio('stalled'), 350); });\naudio?.addEventListener('suspend', () => { updateCanonicalPanelStatus('suspend'); markAudioSelfHealDirty('suspend'); setTimeout(() => recoverInterruptedAudio('suspend'), 350); });`,
'buffering-events');

core = mustReplace(core,
`setDesktopTransportState('stop');\n\n\naudio?.addEventListener('pause', () => {`,
`setDesktopTransportState('stop');\npanelStatusTimer = window.setInterval(() => updateCanonicalPanelStatus('tick'), 1000);\nupdateCanonicalPanelStatus('init');\n\n\naudio?.addEventListener('pause', () => {`,
'panel-status-timer');

core = core.replaceAll(OLD_MARK, NEW_MARK);
await writeFile(corePath, core);
await writeFile('public/js/player-core.js', core);

let html = await readFile('index.html', 'utf8');
html = mustReplace(html,
`    updateBottomCenterOutSegments(bottomLevel,pack.pulse||0);\n    document.documentElement.style.setProperty('--mff-level',bottomLevel.toFixed(3));`,
`    // Bottom meter segments are written only by equalizer.js (canonical visual writer).\n    document.documentElement.style.setProperty('--mff-level',bottomLevel.toFixed(3));`,
'mobile-bottom-single-writer');
html = html.replaceAll(OLD_MARK, NEW_MARK);
await writeFile('index.html', html);
await writeFile('public/index.html', html);

const testDir = 'tests';
for (const name of await readdir(testDir)) {
  if (!name.endsWith('.test.mjs')) continue;
  const path = `${testDir}/${name}`;
  let text = await readFile(path, 'utf8');
  if (text.includes(OLD_MARK)) {
    text = text.replaceAll(OLD_MARK, NEW_MARK);
    await writeFile(path, text);
  }
}

const ownerTest = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nconst read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');\n\ntest('top function LEDs have one canonical player-core truth owner', async () => {\n  const core = await read('js/player-core.js');\n  const pub = await read('public/js/player-core.js');\n  assert.equal(pub, core);\n  for (const id of ['statusStream','statusBuffer','statusSource','statusMeta','statusWorker','statusAudio','statusWatchdog','statusReconnect','statusMeter']) {\n    assert.ok(core.includes(\`document.getElementById('\\${id}')\`), id);\n  }\n  assert.match(core, /function updateCanonicalPanelStatus\\(reason = 'tick'\\)/);\n  assert.match(core, /data-panel-status-owner', 'player-core-v2'/);\n  assert.match(core, /panelWorkerOnline = true/);\n  assert.match(core, /panelMetadataOnline = true/);\n  assert.match(core, /canonicalWatchdogAvailable/);\n  assert.match(core, /meterBusIsFresh/);\n  assert.match(core, /panelReconnectState = 'running'/);\n});\n\ntest('ordinary audio error cannot auto-switch Main Stream to Backup', async () => {\n  const core = await read('js/player-core.js');\n  const block = core.slice(core.indexOf("audio?.addEventListener('error'"), core.indexOf("audio?.addEventListener('playing'"));\n  assert.match(block, /MAIN STREAM ERROR/);\n  assert.doesNotMatch(block, /setSource\\('fallback'\\)/);\n  assert.doesNotMatch(block, /playCurrent\\(\\)/);\n});\n\ntest('mobile bottom meter has one writer: canonical equalizer', async () => {\n  const html = await read('index.html');\n  const eq = await read('js/equalizer.js');\n  assert.equal(await read('public/index.html'), html);\n  assert.equal(await read('public/js/equalizer.js'), eq);\n  assert.doesNotMatch(html, /updateBottomCenterOutSegments\\(bottomLevel/);\n  assert.match(eq, /querySelectorAll\\('#mffBottomBars i'\\)/);\n  assert.match(eq, /applyBottomMeter\\(bottomMeterSegments/);\n});\n`;
await writeFile('tests/full-panel-led-owner-contract.test.mjs', ownerTest);

console.log('full panel LED owner repair applied');
