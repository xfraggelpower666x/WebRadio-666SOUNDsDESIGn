import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLiveListenerCapacity } from '../worker-addons/live-listener-capacity.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('live listener capacity parser accepts provider values without a runtime hardcode', () => {
  assert.equal(parseLiveListenerCapacity({ maxlisteners: 500 }), 500);
  assert.equal(parseLiveListenerCapacity({ maxlisteners: '750' }), 750);
  assert.equal(parseLiveListenerCapacity({}), null);
  const addon = read('worker-addons/live-listener-capacity.js');
  assert.match(addon, /stats\?sid=1&json=1/);
  assert.match(addon, /LISTENER_STATS_URL/);
  assert.doesNotMatch(addon, /maxlisteners\s*[:=]\s*500/);
});

test('production entry enriches only GET nowplaying through the live capacity addon', () => {
  const entry = read('worker-entry.js');
  assert.match(entry, /enrichNowPlayingWithLiveListenerCapacity/);
  assert.match(entry, /path === '\/api\/nowplaying' && request\.method === 'GET'/);
});

test('main player does not invent a static maximum listener count', () => {
  for (const file of ['js/player-core.js', 'public/js/player-core.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /listeners:\s*'0 \/ 250'/);
    assert.doesNotMatch(source, /listener_capacity\s*\|\|\s*250/);
    assert.match(source, /MAX_LISTENERS_UNKNOWN/);
    assert.match(source, /MAX_LISTENERS_UNKNOWN = '—'/);
  }
});
