import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const worker = read('worker.js');
const workerMirror = read('workers/webradio-666soundsdesign-worker/worker.js');
const messenger = read('js/messenger-overlay.js');
const messengerMirror = read('public/js/messenger-overlay.js');
const renderer = read('Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py');

const velunaPaths = [
  'VELUNA/index.html',
  'veluna/index.html',
  'public/VELUNA/index.html',
  'public/veluna/index.html'
];

test('Player Alert worker forwards the server-controlled SHA-256 rate identity to the Render backend', () => {
  assert.match(worker, /const rateKey = await playerAlertRateIdentity\(request, env\)/);
  assert.match(worker, /const backendAlert = Object\.assign\(\{\}, alert, \{rateKey\}\);\s*const backend = await playerAlertBackendFetch\(env, '\/send', \{method:'POST', body:JSON\.stringify\(backendAlert\)\}\)/);
  assert.doesNotMatch(worker, /const alert = \{[^\n]*rateKey[^\n]*\};/);
  assert.match(renderer, /if not rate_key or not re\.fullmatch\(r"\[a-f0-9\]\{64\}", rate_key\)/);
});

test('Player Alert worker mirror remains byte-identical', () => {
  assert.equal(workerMirror, worker);
});

test('shared Messenger adopts the existing VELUNA MSG trigger instead of creating a duplicate control', () => {
  assert.match(messenger, /data-veluna-page/);
  assert.match(messenger, /document\.getElementById\('s666VelunaMessageButton'\)/);
  assert.doesNotMatch(messenger, /document\.getElementById\('actionBar'\)/);
  assert.doesNotMatch(messenger, /document\.querySelector\('\.tool-strip'\)/);
  assert.equal(messengerMirror, messenger);
});

test('all VELUNA player mirrors load the authoritative Player Alert client and Messenger overlay', () => {
  for (const path of velunaPaths) {
    const html = read(path);
    const client = html.indexOf('/js/player-alert-client.js?v=2026-08-11-global-player-alert-v1');
    const overlay = html.indexOf('/js/messenger-overlay.js?v=2026-08-11-global-player-alert-v1');
    const shared = html.indexOf('/config/veluna-assets.js?v=2026-07-23-reactive-visual-v183');
    assert.ok(client >= 0, `${path}: Player Alert client missing`);
    assert.ok(overlay > client, `${path}: Messenger must load after Player Alert client`);
    assert.ok(shared > overlay, `${path}: shared infrastructure must load after Messenger`);
  }
});
