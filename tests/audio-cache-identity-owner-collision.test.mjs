import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmls = [
  'index.html','VELUNA/index.html','veluna/index.html',
  'public/index.html','public/VELUNA/index.html','public/veluna/index.html'
];
const AUDIO_CACHE = 'audio-start-core.js?v=20260903-main-boot-body-mount-v3';
const PREVIOUS_AUDIO_CACHE = 'audio-start-core.js?v=20260902-owner-collision-v2';
const OLD_AUDIO_CACHE = 'audio-start-core.js?v=2026-07-12-v1217';

function literal(value) {
  return new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

test('all Main and VELUNA entrypoints force the repaired early audio-start authority runtime', () => {
  for (const file of htmls) {
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, literal(AUDIO_CACHE), file);
    assert.doesNotMatch(text, literal(PREVIOUS_AUDIO_CACHE), file);
    assert.doesNotMatch(text, literal(OLD_AUDIO_CACHE), file);
  }
});

test('outer all-player-mute bootstrap has a dedicated owner-collision cache identity in both mirrors', () => {
  const root = fs.readFileSync('config/veluna-assets.js', 'utf8');
  const pub = fs.readFileSync('public/config/veluna-assets.js', 'utf8');
  assert.equal(pub, root);
  assert.match(root, /const muteVersion = '2026-09-01-owner-collision-v1';/);
  assert.match(root, /\/js\/all-player-mute\.js\?v=\$\{muteVersion\}/);
});
