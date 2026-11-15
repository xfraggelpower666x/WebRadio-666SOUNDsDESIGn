'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { create } = require('../src/vj-data.js');

test('CSV bands augment live audio, preserve missing bands and handle seeks', () => {
  const data = create();
  assert.throws(() => data.setAudioEnabled(true), /CSV first/);
  data.loadBand('bass', 'Time_ms,Bass_Amplitude\n100,0.2\n150,0.9\n200,0.3\n');
  data.loadBand('hihat', 'Time_ms,Bass_Amplitude\n100,0.7\n');
  assert.deepEqual(data.status().bands, ['bass', 'hihat']);
  const live = { bass: 0.1, snare: 0.4, hihat: 0.2 };
  assert.deepEqual(data.audio(100, live), live);
  data.setAudioEnabled(true);
  assert.deepEqual(data.audio(100, live), { bass: 0.2, snare: 0.4, hihat: 0.7 });
  assert.deepEqual(data.audio(200, live), { bass: 0.9, snare: 0.4, hihat: 0.7 });
  assert.deepEqual(data.audio(120, live), { bass: 0.2, snare: 0.4, hihat: 0.7 });
  data.clearBands();
  assert.deepEqual(data.audio(300, live), live);
});

test('parity imports are atomic, bounded and explicitly required', async () => {
  const data = create();
  assert.throws(() => data.select(['a'], 1), /first/);
  assert.equal(data.loadParity(['[{"dst":"1"},{"dst":"0"}]', '[{"dst":"111"}]']), 3);
  assert.throws(() => data.loadParity(['[{"dst":"bad"}]']), /binary/);
  assert.equal(data.status().parityRecords, 3);
  assert.equal(data.select(['a', 'b', 'c'], 3, () => 0).length, 2);
  const records = await data.simulate(['0'.repeat(24)], { shots: 1, influence: 1, random: () => 0 });
  assert.equal(records[0].dst, '0'.repeat(24));
  assert.equal(data.status().parityRecords, 1);
  data.clearParity();
  assert.throws(() => data.select(['a'], 1), /first/);
});
