'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { generate } = require('../src/vj-quantum-sampler.js');

test('24-bit rotations and ordered CNOT chain produce the expected extremes', async () => {
  const zero = '0'.repeat(24), one = '1'.repeat(24);
  const records = await generate([zero, one], { shots: 4, influence: 1, random: () => 0.5 });
  assert.deepEqual(records, [
    { src: zero, dst: zero, count: 4 },
    { src: one, dst: '01'.repeat(12), count: 4 }
  ]);
});

test('input bit order and chained controls are reflected in measured strings', async () => {
  const low = '0'.repeat(23) + '1', high = '1' + '0'.repeat(23);
  const records = await generate([low, high], { shots: 1, influence: 0.85, random: () => 0.5 });
  assert.equal(records[0].dst, '1'.repeat(24));
  assert.equal(records[1].dst, high);
});

test('sampler validates data, reports progress and supports cancellation', async () => {
  const source = '0'.repeat(24), progress = [];
  assert.deepEqual(await generate([source], { shots: 2, influence: 1, random: () => 0, onProgress: value => progress.push(value) }),
    [{ src: source, dst: source, count: 2 }]);
  assert.deepEqual(progress, [1]);
  await assert.rejects(generate(['101'], {}), /Invalid/);
  await assert.rejects(generate([source], { shots: 10001 }), /Invalid/);
  await assert.rejects(generate([source], { shots: 1, random: () => 1 }), /random/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generate([source], { signal: controller.signal }), /cancelled/);
});
