// Der iOS-Ersatz steuert nur Anzeigen. Die Werte stammen aus der Wiedergabezeit, nicht aus dem Stream.
(() => {
  const navigator = window.navigator;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function visualBands(seconds) {
    const beats = Math.max(0, seconds) * 142 / 60;
    const beat = beats % 1;
    const kick = Math.exp(-beat * 10);
    const offbeat = Math.exp(-((beat + 0.5) % 1) * 7);
    const phrase = 0.7 + 0.3 * Math.sin(beats * Math.PI / 16) ** 2;
    const bass = (0.12 + 0.54 * kick + 0.11 * offbeat) * phrase;
    const mid = (0.11 + 0.32 * offbeat + 0.08 * Math.sin(beats * 0.9) ** 2) * phrase;
    const high = (0.08 + 0.29 * Math.exp(-(beats * 2 % 1) * 14)) * phrase;
    return { bass, mid, high, energy: (bass * 2 + mid + high) / 4 };
  }

  function canSimulate(audio, document) {
    return isAppleMobile && !!audio && !audio.paused && !audio.ended &&
      !audio.muted && audio.volume > 0 && audio.readyState >= 3 && !document.hidden;
  }

  window.S666AudioMeterPolicy = Object.freeze({ isAppleMobile, canSimulate, visualBands });
})();
