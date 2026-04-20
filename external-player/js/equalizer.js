/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-20
ZWECK: Visualizer- und Pegelmeter-Steuerung des externen Players.
ÄNDERUNG: Audio-Analyser mit Simulations-Fallback ergänzt.
==========================================
*/
export function createBars(container, count = 24) {
  const bars = [];
  if (!container) return bars;
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.height = `${18 + ((i * 9) % 84)}px`;
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

  const renderFallback = () => {
    fallbackTimer = window.setInterval(() => {
      bars.forEach((bar, i) => {
        const h = 22 + Math.abs(Math.sin((Date.now() / 220) + i * 0.32)) * 120;
        bar.style.height = `${h}px`;
      });
      const l = 18 + Math.abs(Math.sin(Date.now() / 260)) * 74;
      const r = 18 + Math.abs(Math.cos(Date.now() / 250)) * 74;
      if (leftMeter) leftMeter.style.height = `${l}%`;
      if (rightMeter) rightMeter.style.height = `${r}%`;
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
      let leftMax = 0;
      let rightMax = 0;
      bars.forEach((bar, i) => {
        let total = 0;
        for (let j = 0; j < slice; j += 1) total += data[(i * slice + j) % data.length];
        const avg = total / slice;
        const px = 18 + (avg / 255) * 150;
        bar.style.height = `${px}px`;
        if (i < bars.length / 2) leftMax = Math.max(leftMax, avg);
        else rightMax = Math.max(rightMax, avg);
      });
      if (leftMeter) leftMeter.style.height = `${12 + (leftMax / 255) * 88}%`;
      if (rightMeter) rightMeter.style.height = `${12 + (rightMax / 255) * 88}%`;
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
