/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v6 FINAL UI. Weniger Balken, stärkere Dynamik und doppelte Außenmeter links/rechts.
==========================================
*/
export function createBars(container, count = 16) {
  const bars = [];
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.height = `${14 + Math.max(0, 10 - i) * 5}px`;
    container.appendChild(bar);
    bars.push(bar);
  }
  return bars;
}

function applyMeters(targets, valuePercent) {
  const bounded = Math.max(8, Math.min(96, valuePercent));
  targets.forEach((el, index) => {
    if (!el) return;
    const offset = index % 2 === 0 ? 0 : -8;
    el.style.height = `${Math.max(8, bounded + offset)}%`;
  });
}

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [] }) {
  let ctx = null;
  let analyser = null;
  let source = null;
  let data = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let smoothMeter = 24;

  const allMeters = [...leftMeters, ...rightMeters].filter(Boolean);

  const setMeters = (valuePercent) => {
    const next = (smoothMeter * 0.68) + (Math.max(10, Math.min(98, valuePercent)) * 0.32);
    smoothMeter = next;
    applyMeters(allMeters, next);
  };

  const renderFallback = () => {
    fallbackTimer = window.setInterval(() => {
      const t = Date.now() / 210;
      bars.forEach((bar, i) => {
        const wave = Math.abs(Math.sin(t + i * 0.42));
        const contour = Math.max(0.18, 1 - (i / bars.length) * 0.9);
        const h = 12 + (wave * contour * 72);
        bar.style.height = `${h}px`;
      });
      const v = 28 + Math.abs(Math.sin(Date.now() / 240)) * 68;
      setMeters(v);
    }, 120);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');
    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    data = new Uint8Array(analyser.frequencyBinCount);
    source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    const frame = () => {
      analyser.getByteFrequencyData(data);
      const slice = Math.max(1, Math.floor(data.length / bars.length));
      let globalMax = 0;

      bars.forEach((bar, i) => {
        let total = 0;
        for (let j = 0; j < slice; j += 1) total += data[(i * slice + j) % data.length];
        const avg = total / slice;
        globalMax = Math.max(globalMax, avg);
        const shaped = Math.pow(avg / 255, 0.72);
        const contour = Math.max(0.16, 1 - (i / bars.length) * 0.92);
        const px = 12 + (shaped * contour * 90);
        bar.style.height = `${px}px`;
      });

      setMeters(12 + (globalMax / 255) * 84);
      rafId = requestAnimationFrame(frame);
    };

    const ensureRunning = async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      if (!rafId) frame();
    };

    return {
      start: ensureRunning,
      stop: () => { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
    };
  } catch (err) {
    renderFallback();
    return {
      start: async () => {},
      stop: () => { if (fallbackTimer) window.clearInterval(fallbackTimer); }
    };
  }
}
