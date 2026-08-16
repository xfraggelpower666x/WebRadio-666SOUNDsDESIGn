import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const PLAYER_ENTRIES = [
  'index.html',
  'veluna/index.html',
  'VELUNA/index.html',
  'public/index.html',
  'public/veluna/index.html',
  'public/VELUNA/index.html',
  'worker.js',
  'workers/webradio-666soundsdesign-worker/worker.js'
];

test('all canonical players receive one shared mute runtime through the common asset bootstrap', async () => {
  const config = await read('config/veluna-assets.js');
  assert.equal(await read('public/config/veluna-assets.js'), config);
  assert.match(config, /all-player-mute\.css/);
  assert.match(config, /all-player-mute\.js/);
  assert.match(config, /S666AllPlayerMute/);
  for (const entry of PLAYER_ENTRIES) {
    assert.match(await read(entry), /\/config\/veluna-assets\.js\?v=/, entry);
  }
});

test('mute runtime changes only media muted state and preserves volume audio graph EQ boost and stream contracts', async () => {
  const runtime = await read('js/all-player-mute.js');
  assert.equal(await read('public/js/all-player-mute.js'), runtime);
  assert.equal(await read('public/css/all-player-mute.css'), await read('css/all-player-mute.css'));
  assert.match(runtime, /audio\.muted = !audio\.muted/);
  assert.match(runtime, /volumechange/);
  assert.doesNotMatch(runtime, /audio\.volume\s*=/);
  assert.doesNotMatch(runtime, /createMediaElementSource|AudioContext|webkitAudioContext|createGain|createBiquadFilter|DynamicsCompressor/);
  assert.doesNotMatch(runtime, /\/stream|fallback-stream|api\/nowplaying|discord|player-alert/i);
});

test('mute control is accessible, visible and survives late audio remounts', async () => {
  const runtime = await read('js/all-player-mute.js');
  const css = await read('css/all-player-mute.css');
  assert.match(runtime, /aria-pressed/);
  assert.match(runtime, /aria-label/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /findAudio\(\) !== boundAudio/);
  assert.match(css, /\.s666-mute-button/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
});
