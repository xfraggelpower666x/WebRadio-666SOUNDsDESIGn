/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Visualizer- und Pegelmeter-Steuerung.
ÄNDERUNG: Rechter Außenmeter-Fix: beide Außenmeter werden an denselben Live-Pegel gespiegelt,
           damit die rechte Seite nicht tot wirkt. Kein Umbau an Stream-/Audio-Routen.
==========================================
*/
export function createBars(container, count = 24) {
  const bars = [];
  if (!container) return bars;
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.height = `${14 + ((i * 8) % 72)}px`;
    container.appendChild(bar);
    bars.push(bar);
  }
  return bars;
}

export function startVisualizer({ audio, bars, leftMeter, rightMeter }) {
  let ctx = null;
  let analyser = null;
  let source = null;
  let data = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let smoothMeter = 24;

  const setMeters = (valuePercent) => {
    const bounded = Math.max(12, Math.min(96, valuePercent));
    const next = (smoothMeter * 0.72) + (bounded * 0.28);
    smoothMeter = next;
    if (leftMeter) leftMeter.style.height = `${next}%`;
    if (rightMeter) rightMeter.style.height = `${next}%`;
  };

  const renderFallback = () => {
    fallbackTimer = window.setInterval(() => {
      bars.forEach((bar, i) => {
        const h = 18 + Math.abs(Math.sin((Date.now() / 240) + i * 0.24)) * 70;
        bar.style.height = `${h}px`;
      });
      const v = 22 + Math.abs(Math.sin(Date.now() / 260)) * 68;
      setMeters(v);
    }, 120);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');
    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
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
        const px = 12 + (avg / 255) * 88;
        bar.style.height = `${px}px`;
      });

      setMeters(14 + (globalMax / 255) * 82);
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
