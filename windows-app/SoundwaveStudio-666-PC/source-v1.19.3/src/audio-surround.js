(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWAudioSurround = factory();
})(globalThis, function () {
  'use strict';

  function createUpmix(context) {
    const nodes = [];
    const keep = node => { nodes.push(node); return node; };
    try {
      const input = keep(context.createGain());
      input.channelCount = 2;
      input.channelCountMode = 'explicit';
      input.channelInterpretation = 'speakers';
      const split = keep(context.createChannelSplitter(2));
      const output = keep(context.createChannelMerger(8));
      const lfe = keep(context.createBiquadFilter());
      lfe.type = 'lowpass';
      lfe.frequency.value = 120;
      lfe.Q.value = Math.SQRT1_2;
      input.connect(split);
      function send(sourceChannel, destination, inputChannel, gain) {
        const node = keep(context.createGain());
        node.gain.value = gain;
        split.connect(node, sourceChannel);
        node.connect(destination, 0, inputChannel);
      }
      send(0, output, 0, 0.5); send(1, output, 1, 0.5);
      send(0, output, 2, 0.25); send(1, output, 2, 0.25);
      send(0, lfe, 0, 0.125); send(1, lfe, 0, 0.125);
      lfe.connect(output, 0, 3);
      send(0, output, 4, 0.25); send(1, output, 5, 0.25);
      send(0, output, 6, 0.35); send(1, output, 7, 0.35);
      return { input, output, disconnect() { nodes.forEach(node => { try { node.disconnect(); } catch {} }); } };
    } catch (error) {
      nodes.forEach(node => { try { node.disconnect(); } catch {} });
      throw error;
    }
  }

  // The caller starts with source already connected directly to destination.
  function create(context, source) {
    const destination = context.destination;
    let active = null;
    let restoreChannelCount = null;
    function disable() {
      if (active) {
        const previous = active;
        active = null;
        restoreChannelCount = previous.channelCount;
        source.disconnect(previous.graph.input);
        previous.graph.disconnect();
        source.connect(destination);
      }
      if (restoreChannelCount === null) return;
      try {
        if (destination.channelCount !== restoreChannelCount) destination.channelCount = restoreChannelCount;
        if (destination.channelCount !== restoreChannelCount) throw new Error('Output rejected the original channel count.');
        restoreChannelCount = null;
      } catch (error) {
        const maximum = destination.maxChannelCount;
        if (Number.isFinite(maximum) && maximum > 0) {
          try { destination.channelCount = Math.min(restoreChannelCount, maximum); } catch {}
        }
        throw new Error('Normal routing restored, but the original output channel count could not be restored: ' + error.message);
      }
    }
    function enable() {
      if (active) return;
      if (restoreChannelCount !== null) disable();
      if (context.state === 'closed') throw new Error('The playback audio context is closed.');
      if (typeof context.sinkId !== 'string')
        throw new Error('The active output identity cannot be verified by this Chromium version.');
      if (!Number.isFinite(destination.maxChannelCount) || destination.maxChannelCount < 8)
        throw new Error('The active output does not advertise at least 8 channels.');
      const channelCount = destination.channelCount;
      let graph;
      try {
        graph = createUpmix(context);
        destination.channelCount = 8;
        if (destination.channelCount !== 8) throw new Error('The output did not accept 8 channels.');
        graph.output.connect(destination);
        source.connect(graph.input);
        source.disconnect(destination);
        active = { graph, channelCount };
      } catch (error) {
        if (graph) {
          try { source.disconnect(graph.input); } catch {}
          graph.disconnect();
        }
        try { source.connect(destination); } catch {}
        restoreChannelCount = channelCount;
        try { disable(); }
        catch (restoreError) { throw new Error(error.message + '; ' + restoreError.message); }
        throw error;
      }
    }
    return { enable, disable, isActive: () => !!active };
  }
  return { create, createUpmix };
});
