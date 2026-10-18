// Read-only Pegelbrücke für den bestehenden MiniPlayer-Analyser.
(() => {
  'use strict';
  const allowed = new Set(['https://weblyvra.666soundsdesign-broadcaster.com', 'https://lyvra-living-universe.crisp-siren-2613.chatgpt.site', 'https://webradio.666soundsdesign-broadcaster.com']);
  let subscriber = null, sequence = 0, last = -Infinity, lastGenuinePublish = 0, lastSilentFrameAt = 0, silentFrameCount = 0;
  function send(playing, bands) {
    if (!subscriber) return;
    window.parent.postMessage({ type: 'lyvra:audio:levels', version: 1, sequence: ++sequence, playing, ...bands }, subscriber);
  }
  const zero = { bass: 0, mid: 0, high: 0, energy: 0 };
  window.addEventListener('message', event => {
    const data = event.data;
    if (window.parent === window || event.source !== window.parent || !allowed.has(event.origin) || !data || data.type !== 'lyvra:audio:subscribe' || data.version !== 1 || typeof data.enabled !== 'boolean') return;
    subscriber = data.enabled ? event.origin : null;
    if (subscriber) send(false, zero);
  });
  window.S666AudioLevels = Object.freeze({
    publish(audio, analyser, data, sampleRate, contextState) {
      if (!subscriber || document.hidden || performance.now() - last < 50) return;
      last = performance.now();
      if (audio.paused || audio.readyState < 3 || contextState !== 'running' || !analyser || !data?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) { send(false, zero); return; }
      const hasFrequencySignal = data.some(value => value > 0);
      if (!hasFrequencySignal) { lastSilentFrameAt = performance.now(); silentFrameCount++; send(false, zero); return; }
      const width = sampleRate / analyser.fftSize;
      function rms(low, high) {
        const start = Math.max(0, Math.floor(low / width));
        const end = Math.min(data.length, Math.ceil(high / width));
        if (start >= end) return 0;
        let sum = 0;
        for (let i = start; i < end; i++) sum += (data[i] / 255) ** 2;
        return Math.min(1, Math.sqrt(sum / (end - start)) * audio.volume);
      }
      const bass = rms(30, 250), mid = rms(250, 2500), high = rms(2500, 10000);
      lastGenuinePublish = performance.now();
      send(!audio.muted, audio.muted ? zero : { bass, mid, high, energy: Math.min(1, (bass * 2 + mid + high) / 4) });
    },
    getDiagnostics() { return Object.freeze({ subscribed: !!subscriber, sequence, lastGenuinePublish, lastSilentFrameAt, silentFrameCount, visible: !document.hidden }); }
  });
  function stop() { send(false, zero); }
  const audio = document.getElementById('radio');
  for (const event of ['pause', 'ended', 'waiting', 'error', 'emptied']) audio?.addEventListener(event, stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();
