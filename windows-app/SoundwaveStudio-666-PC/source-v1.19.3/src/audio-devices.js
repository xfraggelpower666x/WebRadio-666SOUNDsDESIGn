(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWAudioDevices = factory();
})(globalThis, function () {
  'use strict';
  function create({ mediaDevices, begin, end, graph, onInputStopped = () => {} }) {
    let active = null;
    let generation = 0;
    let starting = false;
    let recordInput = false;
    const permissionBusy = { microphone: false, output: false };
    function dispose(input) {
      if (!input) return;
      try { input.node.disconnect(); } catch {}
      input.stream.getTracks().forEach(track => track.stop());
    }
    function stopInput() {
      generation++;
      const previous = active;
      active = null;
      dispose(previous);
    }
    async function withPermission(kind, operation) {
      if (permissionBusy[kind]) throw new Error('Another audio device operation is in progress.');
      permissionBusy[kind] = true;
      let armed = false;
      try {
        await begin(kind);
        armed = true;
        return await operation();
      } finally {
        if (armed) try { await end(kind); } catch {}
        permissionBusy[kind] = false;
      }
    }
    return {
      async enumerate() {
        if (!mediaDevices?.enumerateDevices) throw new Error('Device enumeration is unavailable.');
        return withPermission('output', () => mediaDevices.enumerateDevices());
      },
      async startInput(deviceId) {
        if (starting) throw new Error('Microphone request already in progress.');
        if (!mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable.');
        starting = true;
        const token = ++generation;
        let stream;
        try {
          const { context, analyser, exportNode } = graph();
          stream = await withPermission('microphone', () => token !== generation ? null : mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true, video: false
          }));
          if (!stream) return false;
          if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return false; }
          if (!stream.getAudioTracks().length) throw new Error('The selected microphone has no audio track.');
          if (context.state === 'suspended') await context.resume();
          if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return false; }
          const node = context.createMediaStreamSource(stream);
          try {
            node.connect(analyser);
            if (recordInput) {
              if (!exportNode) throw new Error('Video audio destination is unavailable.');
              node.connect(exportNode);
            }
          }
          catch (error) { try { node.disconnect(); } catch {} throw error; }
          const previous = active;
          active = { stream, node, exportNode };
          for (const track of stream.getAudioTracks()) track.addEventListener('ended', () => {
            if (active?.stream !== stream) return;
            stopInput();
            onInputStopped('Microphone disconnected or access was revoked.');
          }, { once: true });
          dispose(previous);
          return true;
        } catch (error) {
          if (stream && active?.stream !== stream) stream.getTracks().forEach(track => track.stop());
          if (token !== generation) return false;
          throw error;
        } finally { starting = false; }
      },
      stopInput,
      hasInput() { return !!active; },
      recordsInput() { return recordInput && !!active; },
      setInputRecording(enabled) {
        const next = enabled === true;
        if (next === recordInput) return;
        if (active) {
          if (!active.exportNode) throw new Error('Video audio destination is unavailable.');
          if (next) active.node.connect(active.exportNode);
          else active.node.disconnect(active.exportNode);
        }
        recordInput = next;
      },
      async setOutput(deviceId) {
        const { context } = graph();
        if (typeof context.setSinkId !== 'function') throw new Error('Playback output selection is not supported by this Chromium version.');
        await withPermission('output', () => context.setSinkId(deviceId || ''));
      },
      async chooseOutput() {
        if (!mediaDevices?.selectAudioOutput) throw new Error('The system output chooser is not supported by this Chromium version.');
        const { context } = graph();
        if (typeof context.setSinkId !== 'function') throw new Error('Playback output selection is not supported by this Chromium version.');
        return withPermission('output', async () => {
          const device = await mediaDevices.selectAudioOutput();
          await context.setSinkId(device.deviceId);
          return device;
        });
      }
    };
  }
  return { create };
});
