/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-24
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v16 REAL ANALYZER + HYBRID FALLBACK + MOBILE BOOSTER.
          - echter AudioContext/AnalyserNode, wenn Browser/Stream es zulassen
          - stabiler Hybrid-Fallback, wenn Safari/iPhone keine brauchbaren Daten liefert
          - rechte EQ-Seite wird bewusst gespiegelt, damit sie nicht abstirbt
          - Booster-Stufen 0-3 über GainNode; Fallback läuft ohne Systemumbau weiter
HINWEIS: Keine Worker-/Stream-/API-Änderung. Nur externer Player.
==========================================
*/

const BOOST_MULTIPLIERS = [1.0, 1.16, 1.36, 1.62];

export function createBars(container, count = 24) {
  const bars = [];
  if (!container) return bars;
  container.innerHTML = '';

  for (let i = 0; i < count; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'eq-bar-slot';

    const fill = document.createElement('div');
    fill.className = 'eq-bar-fill';

    const mirrored = i < count / 2 ? i : count - 1 - i;
    const contour = 1 - (mirrored / Math.max(1, count / 2)) * 0.42;
    fill.style.height = `${14 + contour * 14}px`;

    slot.appendChild(fill);
    container.appendChild(slot);
    bars.push(fill);
  }
  return bars;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isMobileLike() {
  return window.matchMedia?.('(max-width: 860px)').matches || window.innerWidth <= 860;
}

function setHeightPx(el, px) {
  if (!el) return;
  el.style.height = `${Math.round(Math.max(10, px))}px`;
}

function applyMeters(targets, valuePercent, side = 'left') {
  const bounded = clamp(valuePercent, 10, 98);
  targets.forEach((el, index) => {
    if (!el) return;
    // Außen länger, innen kürzer. Rechts wird intern gespiegelt.
    const offset = side === 'left'
      ? (index === 0 ? 0 : -11)
      : (index === 0 ? -11 : 0);
    el.style.height = `${Math.max(10, bounded + offset)}%`;
  });
}

function fallbackValue(index, total, intensity = 1) {
  const half = Math.max(1, Math.floor(total / 2));
  const mirrored = index < half ? index : total - 1 - index;
  const t = Date.now() / 135;
  const waveA = Math.abs(Math.sin(t + mirrored * 0.34));
  const waveB = Math.abs(Math.sin(t * 0.61 + mirrored * 0.19));
  const waveC = Math.abs(Math.cos(t * 0.37 + mirrored * 0.11));
  const contour = 1.22 - (mirrored / half) * 0.35;
  return 14 + ((waveA * 58) + (waveB * 30) + (waveC * 14)) * contour * intensity;
}

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [] }) {
  let ctx = null;
  let analyser = null;
  let gainNode = null;
  let source = null;
  let data = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let running = false;
  let smoothMeter = 18;
  let boostStage = 0;
  let weakFrames = 0;
  let audioGraphReady = false;

  const setMeters = (value) => {
    smoothMeter = smoothMeter * 0.56 + clamp(value, 12, 98) * 0.44;
    applyMeters(leftMeters, smoothMeter, 'left');
    applyMeters(rightMeters, smoothMeter, 'right');
  };

  const renderIdle = () => {
    bars.forEach((bar, i) => setHeightPx(bar, fallbackValue(i, bars.length, 0.22)));
    setMeters(18);
  };

  const renderFallbackFrame = () => {
    const intensity = audio && !audio.paused ? 1.0 : 0.28;
    bars.forEach((bar, i) => setHeightPx(bar, fallbackValue(i, bars.length, intensity)));
    const meter = audio && !audio.paused
      ? 28 + Math.abs(Math.sin(Date.now() / 190)) * 62
      : 16 + Math.abs(Math.sin(Date.now() / 320)) * 20;
    setMeters(meter);
  };

  const startFallbackTimer = () => {
    if (fallbackTimer) return;
    renderFallbackFrame();
    fallbackTimer = window.setInterval(renderFallbackFrame, 95);
  };

  const stopFallbackTimer = () => {
    if (!fallbackTimer) return;
    window.clearInterval(fallbackTimer);
    fallbackTimer = 0;
  };

  const setupAudioGraph = () => {
    if (audioGraphReady) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !audio) throw new Error('AudioContext unavailable');

      ctx = ctx || new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = isMobileLike() ? 128 : 256;
      analyser.smoothingTimeConstant = isMobileLike() ? 0.82 : 0.78;
      data = new Uint8Array(analyser.frequencyBinCount);

      gainNode = ctx.createGain();
      gainNode.gain.value = BOOST_MULTIPLIERS[boostStage] || 1;

      source = ctx.createMediaElementSource(audio);
      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(ctx.destination);
      audioGraphReady = true;
      return true;
    } catch (err) {
      audioGraphReady = false;
      return false;
    }
  };

  const renderAnalyzerFrame = () => {
    if (!running) return;
    if (!analyser || !data) {
      startFallbackTimer();
      return;
    }

    analyser.getByteFrequencyData(data);

    const totalBars = bars.length;
    const halfBars = Math.max(1, Math.ceil(totalBars / 2));
    const analysisWindow = Math.max(8, Math.floor(data.length * 0.72));
    const values = [];
    let globalMax = 0;

    for (let i = 0; i < halfBars; i += 1) {
      const norm = i / Math.max(1, halfBars - 1);
      const start = Math.floor(Math.pow(norm, 1.72) * Math.max(1, analysisWindow - 2));
      const end = Math.min(analysisWindow, start + Math.max(2, Math.floor(analysisWindow / halfBars)));
      let total = 0;
      let count = 0;
      for (let j = start; j < end; j += 1) {
        total += data[j] || 0;
        count += 1;
      }
      const avg = count ? total / count : 0;
      globalMax = Math.max(globalMax, avg);
      const shaped = Math.pow(avg / 255, 0.66);
      const contour = 1.20 - norm * 0.32;
      values.push(14 + shaped * contour * (isMobileLike() ? 96 : 108));
    }

    weakFrames = globalMax < 8 ? weakFrames + 1 : 0;
    const useHybrid = weakFrames > 8;
    if (useHybrid) {
      startFallbackTimer();
    } else {
      stopFallbackTimer();
      for (let i = 0; i < totalBars; i += 1) {
        const mirrorIndex = i < halfBars ? i : totalBars - 1 - i;
        const analyzerPx = values[clamp(mirrorIndex, 0, values.length - 1)] || 14;
        // Explizite Spiegelung: rechts bekommt denselben verwertbaren Energieverlauf.
        setHeightPx(bars[i], Math.max(analyzerPx, fallbackValue(i, totalBars, 0.18)));
      }
      setMeters(16 + (globalMax / 255) * 84);
    }

    rafId = window.requestAnimationFrame(renderAnalyzerFrame);
  };

  const setBoostStage = (stage = 0) => {
    boostStage = clamp(Number(stage) || 0, 0, BOOST_MULTIPLIERS.length - 1);
    const target = BOOST_MULTIPLIERS[boostStage] || 1;

    if (gainNode && ctx) {
      try {
        const now = ctx.currentTime || 0;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(target, now + 0.12);
      } catch (err) {
        gainNode.gain.value = target;
      }
    }
    return boostStage;
  };

  renderIdle();

  return {
    start: async () => {
      running = true;
      stopFallbackTimer();
      const hasGraph = setupAudioGraph();
      if (hasGraph && ctx?.state === 'suspended') {
        try { await ctx.resume(); } catch (err) { /* Fallback darunter */ }
      }
      setBoostStage(boostStage);
      if (hasGraph && ctx?.state !== 'closed') {
        if (!rafId) renderAnalyzerFrame();
      } else {
        startFallbackTimer();
      }
    },
    stop: () => {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
      stopFallbackTimer();
      renderIdle();
    },
    setBoostStage,
    getBoostStage: () => boostStage,
    hasAudioGraph: () => audioGraphReady
  };
}
