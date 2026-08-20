import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('skip bridge forwards previous and current track without browser secrets', () => {
  const root = read('worker-addons/skip-api-addon.js');
  const mirror = read('workers/webradio-666soundsdesign-worker/worker-addons/skip-api-addon.js');
  assert.equal(root, mirror, 'root and deployed worker skip bridges must remain byte-identical');
  assert.match(root, /previousTrack:\s*cleanTrack\(data\.previousTrack\)/);
  assert.match(root, /currentTrack:\s*cleanTrack\(data\.currentTrack\)/);
  assert.match(root, /authorization:\s*`Bearer \$\{token\}`/);
});

test('shared skip controller renders verified transition on every canonical ticker target', () => {
  const root = read('js/skip-control.js');
  const mirror = read('public/js/skip-control.js');
  assert.equal(root, mirror, 'root/public skip controllers must remain byte-identical');
  assert.match(root, /SKIPPED · PREVIOUS:/);
  assert.match(root, /NOW:/);
  assert.match(root, /getElementById\('nowPlayingTicker'\)/, 'Main desktop ticker target');
  assert.match(root, /#mffApp \.mff-title h1 span/, 'Main iPhone ticker target');
  assert.match(root, /getElementById\('nowPlaying'\)/, 'VELUNA/Internal ticker target');
  assert.match(root, /getElementById\('nowPlayingClone'\)/, 'VELUNA marquee clone target');
  assert.match(root, /9000/, 'skip transition must be temporary');
  assert.doesNotMatch(root, /S666_AUTODJ_SKIP_ACCESS_TOKEN/);
  assert.doesNotMatch(root, /666-autodj-skip\.666soundsdesign-broadcaster\.com/);
});
