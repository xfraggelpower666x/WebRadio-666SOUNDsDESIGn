'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const sync = require('../src/vj-audio-sync.js');

test('CSV envelopes group duplicate rounded timestamps by peak', () => {
  assert.deepEqual(sync.parse('\uFEFFTime_ms,Bass_Amplitude\r\n1.5,0.2\r\n2,0.8\r\n2.5,0.6\r\n3.5,0.4\r\n'),
    [{ timeMs: 2, amplitude: 0.8 }, { timeMs: 4, amplitude: 0.4 }]);
  assert.deepEqual(sync.parse('"Time_ms","Bass_Amplitude"\n0,0.5\n'), [{ timeMs: 0, amplitude: 0.5 }]);
});

test('CSV validation rejects invalid columns, samples and oversized input', () => {
  assert.throws(() => sync.parse('Time_ms,Other\n0,1\n'), /requires/);
  assert.throws(() => sync.parse('Time_ms,Bass_Amplitude\n1,\n'), /Invalid/);
  assert.throws(() => sync.parse('Time_ms,Bass_Amplitude\n-1,0.4\n'), /Invalid/);
  assert.throws(() => sync.parse('Time_ms,Bass_Amplitude\n"1,0.5\n'), /Unclosed/);
  assert.throws(() => sync.parse('Time_ms,Bass_Amplitude\n' + '1,0.5\n'.repeat(20001)), /limit/);
  assert.throws(() => sync.parse('x'.repeat(2 * 1024 * 1024 + 1)), /too large/);
});

test('sampling uses the interval peak, handles gaps and backward seeks', () => {
  const points = sync.parse('Time_ms,Bass_Amplitude\n100,0.1\n150,0.9\n200,0.2\n');
  assert.equal(sync.sample(points, 0, 50), 0);
  assert.equal(sync.sample(points, 100, 200), 0.9);
  assert.equal(sync.sample(points, 200, 250), 0.2);
  assert.equal(sync.sample(points, 250, 140), 0.1);
});
