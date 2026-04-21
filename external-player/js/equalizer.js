/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v12 DESKTOP POSITION + RIGHT SIDE METER + EQ. Desktop-EQ lebendiger und höher; rechter Seitenmeter/Laser intern gespiegelt; nur Balken/Füllung animieren, Container bleibt fix.
==========================================
*/
export function createBars(container, count = 24) {
  const bars = [];
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'eq-bar-slot';

    const fill = document.createElement('div');
    fill.className = 'eq-bar-fill';
    const edgeCurve = 1 - Math.min(1, i / Math.max(1, count - 1));
    const seed = 14 + (edgeCurve * 22);
    fill.style.height = `${seed}px`;

    slot.appendChild(fill);
    container.appendChild(slot);
    bars.push(fill);
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
    el.style.height = `${Math.max(10, Math.min(98, bounded + offset))}%`;
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

  const setBarHeight = (bar, px) => {
    if (!bar) return;
    bar.style.height = `${Math.max(12, px)}px`;
  };

  const renderFallback = () => {
    fallbackTimer = window.setInterval(() => {
      const t = Date.now() / 180;
      bars.forEach((bar, i) => {
        const wave = Math.abs(Math.sin(t + i * 0.28));
        const flutter = 0.28 + Math.abs(Math.sin(t * 0.74 + i * 0.17));
        const edgeWeight = 1 - Math.min(1, i / Math.max(1, bars.length - 1));
        const contour = 0.34 + (edgeWeight * 0.72);
        const h = 14 + (wave * contour * 104) + (flutter * 16);
        setBarHeight(bar, h);
      });
      const v = 26 + Math.abs(Math.sin(Date.now() / 220)) * 70;
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
        const shaped = Math.pow(avg / 255, 0.60);
        const edgeWeight = 1 - Math.min(1, i / Math.max(1, bars.length - 1));
        const contour = 0.30 + (edgeWeight * 0.78);
        const shimmer = 6 + (Math.sin((Date.now() / 170) + i * 0.42) + 1) * 4;
        const px = 14 + (shaped * contour * 108) + shimmer;
        setBarHeight(bar, px);
      });

      setMeters(18 + (globalMax / 255) * 78);
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
