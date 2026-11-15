'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const parity = require('../src/vj-parity-selector.js');

test('precomputed dst records yield odd/even bit parity', () => {
  assert.deepEqual(parity.parse('[{"src":"00","dst":"01","count":1},{"dst":"11"},{"dst":"111"}]'),
    [true, false, true]);
});

test('malformed or oversized precomputed data is rejected explicitly', () => {
  assert.throws(() => parity.parse('{'), /invalid/);
  assert.throws(() => parity.parse('[]'), /non-empty/);
  assert.throws(() => parity.parse('[{"dst":"10x"}]'), /binary/);
  assert.throws(() => parity.parse('[{"dst":3}]'), /binary/);
  assert.throws(() => parity.parse('x'.repeat(2 * 1024 * 1024 + 1)), /too large/);
});

test('selection is bounded, shuffled and leaves the original pool intact', () => {
  const pool = ['a', 'b', 'c', 'd'];
  assert.deepEqual(parity.select(pool, [true, false, true], 3, () => 0), ['b', 'c']);
  assert.deepEqual(pool, ['a', 'b', 'c', 'd']);
  assert.deepEqual(parity.select(pool, [false], 3, () => 0), []);
  assert.throws(() => parity.select(pool, [true], 0), /Invalid/);
  assert.throws(() => parity.select(pool, [true], 1, () => 1), /random/);
});
