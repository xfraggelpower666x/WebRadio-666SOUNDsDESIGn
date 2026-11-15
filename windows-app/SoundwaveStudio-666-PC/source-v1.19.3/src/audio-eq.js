(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWAudioEq = factory();
})(globalThis, function () {
  'use strict';

  function create(context) {
    const input = context.createGain();
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const bass = context.createBiquadFilter();
    const mid = context.createBiquadFilter();
    const treble = context.createBiquadFilter();
    const mix = context.createGain();
    const direct = context.createGain();
    const stereo = context.createGain();
    const stereoInput = context.createGain();
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const leftLeft = context.createGain();
    const leftRight = context.createGain();
    const rightLeft = context.createGain();
    const rightRight = context.createGain();
    bass.type = 'lowshelf'; bass.frequency.value = 200;
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.7;
    treble.type = 'highshelf'; treble.frequency.value = 4000;
    bass.gain.value = mid.gain.value = treble.gain.value = 0;
    dry.gain.value = 0;
    wet.gain.value = 1;
    direct.gain.value = 1;
    stereo.gain.value = 0;
    leftLeft.gain.value = rightRight.gain.value = 1;
    leftRight.gain.value = rightLeft.gain.value = 0;
    stereoInput.channelCount = 2;
    stereoInput.channelCountMode = 'explicit';
    stereoInput.channelInterpretation = 'speakers';
    input.connect(dry); dry.connect(mix);
    input.connect(bass); bass.connect(mid); mid.connect(treble); treble.connect(wet); wet.connect(mix);
    mix.connect(direct); direct.connect(output);
    mix.connect(stereoInput); stereoInput.connect(splitter);
    splitter.connect(leftLeft, 0); leftLeft.connect(merger, 0, 0);
    splitter.connect(leftRight, 0); leftRight.connect(merger, 0, 1);
    splitter.connect(rightLeft, 1); rightLeft.connect(merger, 0, 0);
    splitter.connect(rightRight, 1); rightRight.connect(merger, 0, 1);
    merger.connect(stereo); stereo.connect(output);

    function setParam(param, value) {
      if (context.state === 'running') {
        param.cancelScheduledValues(context.currentTime);
        param.setTargetAtTime(value, context.currentTime, 0.015);
      } else param.value = value;
    }
    function level(value) {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(-12, Math.min(12, number)) : 0;
    }
    return {
      input, output,
      set({ bass: low = 0, mid: middle = 0, treble: high = 0, bypass = false, width = 100 } = {}) {
        setParam(bass.gain, level(low));
        setParam(mid.gain, level(middle));
        setParam(treble.gain, level(high));
        setParam(dry.gain, bypass ? 1 : 0);
        setParam(wet.gain, bypass ? 0 : 1);
        const number = Number(width);
        const value = Number.isFinite(number) ? Math.max(0, Math.min(200, number)) / 100 : 1;
        const divisor = Math.max(1, value);
        const same = (1 + value) / (2 * divisor);
        const cross = (1 - value) / (2 * divisor);
        setParam(leftLeft.gain, same);
        setParam(rightRight.gain, same);
        setParam(leftRight.gain, cross);
        setParam(rightLeft.gain, cross);
        setParam(direct.gain, value === 1 ? 1 : 0);
        setParam(stereo.gain, value === 1 ? 0 : 1);
      }
    };
  }
  return { create };
});
