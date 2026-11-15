'use strict';

function validateVjState(value, isApproved) {
  const fail = () => { throw new Error('vj_state_invalid'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  const { sequence, currentId, enabled, layout, opacity, loop, playing, positions, bands } = value;
  if (!Array.isArray(sequence) || sequence.length > 100 || new Set(sequence).size !== sequence.length ||
      sequence.some(id => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id) || !isApproved(id))) fail();
  if ((sequence.length && !sequence.includes(currentId)) || (!sequence.length && currentId !== null)) fail();
  if (typeof enabled !== 'boolean' || typeof loop !== 'boolean' || typeof playing !== 'boolean' ||
      (playing && !enabled) || (enabled && !sequence.length) || ![1, 2, 3].includes(layout) ||
      typeof opacity !== 'number' || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) fail();
  if (!Array.isArray(positions) || positions.length !== (sequence.length ? layout : 0) ||
      positions.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 604800)) fail();
  if (!bands || typeof bands !== 'object' || Array.isArray(bands) ||
      ['bass', 'snare', 'hihat'].some(k => typeof bands[k] !== 'number' || !Number.isFinite(bands[k]) || bands[k] < 0 || bands[k] > 1)) fail();
  return { sequence: sequence.slice(), currentId, enabled, layout, opacity, loop, playing,
    positions: positions.slice(), bands: { bass: bands.bass, snare: bands.snare, hihat: bands.hihat } };
}
module.exports = { validateVjState };
