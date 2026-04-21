/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v8 METADATA + EQ. Höherer, filigranerer EQ mit mehr Bewegung; rechter Außenmeter intern gespiegelt.
==========================================
*/
export function createBars(container, count = 24) {
  const bars = [];
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    const edgeBias = Math.max(0, 1 - (i / count) * 0.82);
    bar.style.height = `${10 + edgeBias * 18}px`;
    container.appendChild(bar);
    bars.push(bar);
  }
  return bars;
}

function applyMeters(targets, valuePercent, side = 'left') {
  const bounded = Math.max(10, Math.min(98, valuePercent));
  targets.forEach((el, index) => {
    if (!el) return;
    let offset = 0;
    if (side === 'left') {
      offset = index === 0 ? 0 : -10;
    } else {
      offset = index === 0 ? -10 : 0;
    }
    el.style.height = `${Math.max(10, bounded + offset)}%`;
  });
}

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [] }) {
  let ctx = null;
  let analyser = null;
  let source = null;
  let data = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let smoothMeter = 22;

  const setMeters = (valuePercent) => {
    const next = (smoothMeter * 0.56) + (Math.max(12, Math.min(98, valuePercent)) * 0.44);
    smoothMeter = next;
    applyMeters(leftMeters, next, 'left');
    applyMeters(rightMeters, next, 'right');
  };

  const renderFallback = () => {
    fallbackTimer = window.setInterval(() => {
      const t = Date.now() / 180;
      bars.forEach((bar, i) => {
        const wave = Math.abs(Math.sin(t + i * 0.34));
        const flutter = 0.20 + Math.abs(Math.sin(t * 0.72 + i * 0.13));
        const contour = 0.22 + Math.max(0.20, 1 - (i / bars.length) * 0.74);
        const h = 10 + (wave * contour * 96) + (flutter * 10);
        bar.style.height = `${h}px`;
      });
      const v = 24 + Math.abs(Math.sin(Date.now() / 220)) * 72;
      setMeters(v);
    }, 110);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');
    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.80;
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
        const shaped = Math.pow(avg / 255, 0.66);
        const contour = 0.28 + Math.max(0.16, 1 - (i / bars.length) * 0.84);
        const px = 12 + (shaped * contour * 102);
        bar.style.height = `${px}px`;
      });

      setMeters(14 + (globalMax / 255) * 84);
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
