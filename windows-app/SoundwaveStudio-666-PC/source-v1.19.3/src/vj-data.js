(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./vj-audio-sync.js'), require('./vj-parity-selector.js'), require('./vj-quantum-sampler.js'));
  } else {
    root.RWVjData = factory(root.RWVjAudioSync, root.RWVjParity, root.RWVjQuantumSampler);
  }
})(globalThis, function (sync, parity, sampler) {
  'use strict';

  function create() {
    const bands = { bass: null, snare: null, hihat: null };
    let flags = null, previousMs = null, audioEnabled = false;
    return {
      status() {
        return { bands: Object.keys(bands).filter(key => bands[key] !== null), audioEnabled, parityRecords: flags?.length || 0 };
      },
      loadBand(kind, text) {
        if (!Object.hasOwn(bands, kind)) throw new Error('Invalid audio sync band');
        const samples = sync.parse(text);
        bands[kind] = samples;
        previousMs = null;
        return samples.length;
      },
      clearBands() {
        for (const kind of Object.keys(bands)) bands[kind] = null;
        previousMs = null;
        audioEnabled = false;
      },
      setAudioEnabled(enabled) {
        if (enabled === true && !Object.values(bands).some(Boolean)) throw new Error('Load an audio sync CSV first');
        audioEnabled = enabled === true;
        previousMs = null;
      },
      resetClock() { previousMs = null; },
      audio(timeMs, live) {
        if (!live || !Number.isFinite(timeMs) || timeMs < 0) throw new Error('Invalid VJ audio frame');
        const out = { ...live };
        if (!audioEnabled) return out;
        for (const kind of ['bass', 'snare', 'hihat']) {
          if (bands[kind]) out[kind] = Math.min(1, sync.sample(bands[kind], previousMs, timeMs));
        }
        previousMs = timeMs;
        return out;
      },
      loadParity(texts) {
        if (!Array.isArray(texts) || !texts.length || texts.length > 16) throw new Error('Choose one to sixteen parity files');
        const parsed = texts.flatMap(text => parity.parse(text));
        if (parsed.length > 20000) throw new Error('Combined parity records exceed limit');
        flags = parsed;
        return parsed.length;
      },
      async simulate(inputs, options) {
        const records = await sampler.generate(inputs, options);
        flags = parity.parse(JSON.stringify(records));
        return records;
      },
      clearParity() { flags = null; },
      select(candidates, limit, random) {
        if (!flags) throw new Error('Load or generate parity data first');
        return parity.select(candidates, flags, limit, random);
      }
    };
  }

  return { create };
});
