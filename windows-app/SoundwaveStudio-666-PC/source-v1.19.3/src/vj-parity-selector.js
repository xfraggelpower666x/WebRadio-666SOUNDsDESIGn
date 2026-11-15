(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWVjParity = factory();
})(globalThis, function () {
  'use strict';

  const MAX_RECORDS = 20000;

  function parse(text) {
    if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('Parity JSON is missing or too large');
    let records;
    try { records = JSON.parse(text); }
    catch { throw new Error('Parity JSON is invalid'); }
    if (!Array.isArray(records) || !records.length || records.length > MAX_RECORDS) {
      throw new Error('Parity JSON must be a non-empty bounded array');
    }
    return records.map(record => {
      const bits = record?.dst;
      if (typeof bits !== 'string' || !/^[01]{1,256}$/.test(bits)) throw new Error('Parity record requires a binary dst string');
      let odd = false;
      for (const bit of bits) if (bit === '1') odd = !odd;
      return odd;
    });
  }

  function select(candidates, parity, limit, random = Math.random) {
    if (!Array.isArray(candidates) || candidates.length > 1000 ||
        !Array.isArray(parity) || !parity.length || parity.length > MAX_RECORDS ||
        parity.some(value => typeof value !== 'boolean') ||
        !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid parity selection');
    const count = Math.min(limit, candidates.length, parity.filter(Boolean).length);
    const result = candidates.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source');
      const index = Math.floor(value * (i + 1));
      [result[i], result[index]] = [result[index], result[i]];
    }
    return result.slice(0, count);
  }

  return { parse, select };
});
