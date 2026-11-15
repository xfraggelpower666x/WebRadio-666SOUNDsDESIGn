(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWVjQuantumSampler = factory();
})(globalThis, function () {
  'use strict';

  async function generate(inputs, options = {}) {
    const { shots = 10000, influence = 0.85, random = Math.random, onProgress = () => {}, signal } = options;
    if (!Array.isArray(inputs) || !inputs.length || inputs.length > 64 ||
        inputs.some(value => typeof value !== 'string' || !/^[01]{24}$/.test(value)) ||
        !Number.isInteger(shots) || shots < 1 || shots > 10000 ||
        !Number.isFinite(influence) || influence < 0 || influence > 1 ||
        typeof random !== 'function' || typeof onProgress !== 'function') {
      throw new Error('Invalid simulation input');
    }
    const results = [];
    for (let item = 0; item < inputs.length; item++) {
      const source = inputs[item], counts = new Map();
      let first = '';
      for (let shot = 0; shot < shots; shot++) {
        if (signal?.aborted) throw new Error('Simulation cancelled');
        let prior = 0, output = '';
        for (let qubit = 0; qubit < 24; qubit++) {
          const value = random();
          if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source');
          const probability = source[23 - qubit] === '1' ? influence : 1 - influence;
          const measured = (value < probability ? 1 : 0) ^ prior;
          prior = measured;
          output = measured + output;
        }
        if (!first) first = output;
        counts.set(output, (counts.get(output) || 0) + 1);
        if ((shot + 1) % 512 === 0) {
          onProgress((item * shots + shot + 1) / (inputs.length * shots));
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      results.push({ src: source, dst: first, count: counts.get(first) });
      onProgress((item + 1) / inputs.length);
    }
    if (signal?.aborted) throw new Error('Simulation cancelled');
    return results;
  }

  return { generate };
});
