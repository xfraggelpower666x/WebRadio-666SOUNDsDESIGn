/*
==========================================
DATEI: external-player/js/equalizer.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v13 MOBILE EQ REAL FIX. Mobile/kleine Viewports bekommen jetzt
          einen echten, über die volle Breite lebendigen EQ mit logarithmischer
          Bandverteilung und fester Slot-Basis. Zusätzlich bleibt ein Fallback
          aktiv, falls der Browser keinen AudioContext bereitstellt.
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

    // Startzustand: kleine sichtbare Grundhöhe, damit der EQ nie komplett leer wirkt.
    const centerDistance = Math.abs(((i / Math.max(1, count - 1)) * 2) - 1);
    const base = 16 + (1 - centerDistance) * 6;
    fill.style.height = `${base}px`;

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
  let smoothedBars = new Array(bars.length).fill(22);

  const setMeters = (valuePercent) => {
    const next = (smoothMeter * 0.58) + (Math.max(12, Math.min(98, valuePercent)) * 0.42);
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
      const t = Date.now() / 210;

      bars.forEach((bar, i) => {
        const norm = i / Math.max(1, bars.length - 1);
        const mirrored = 1 - Math.abs((norm * 2) - 1);
        const pulseA = Math.abs(Math.sin(t + i * 0.31));
        const pulseB = Math.abs(Math.sin((t * 0.58) + i * 0.17));
        const px = 14 + (pulseA * 64) + (pulseB * 18) + (mirrored * 12);
        setBarHeight(bar, px);
      });

      const v = 26 + Math.abs(Math.sin(Date.now() / 240)) * 68;
      setMeters(v);
    }, 90);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');

    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.86;

    data = new Uint8Array(analyser.frequencyBinCount);
    source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    const frame = () => {
      analyser.getByteFrequencyData(data);

      let globalMax = 0;
      const usableBins = Math.max(8, Math.floor(data.length * 0.78));

      bars.forEach((bar, i) => {
        // Logarithmische Bandverteilung: mehr nutzbare Energie auch in der rechten Hälfte.
        const startNorm = Math.pow(i / bars.length, 1.65);
        const endNorm = Math.pow((i + 1) / bars.length, 1.65);
        const start = Math.max(0, Math.floor(startNorm * usableBins));
        const end = Math.max(start + 1, Math.floor(endNorm * usableBins));

        let total = 0;
        let count = 0;
        for (let idx = start; idx < end; idx += 1) {
          total += data[idx];
          count += 1;
        }

        const avg = count > 0 ? total / count : 0;
        globalMax = Math.max(globalMax, avg);

        const norm = i / Math.max(1, bars.length - 1);
        const mirrored = 1 - Math.abs((norm * 2) - 1);
        const shaped = Math.pow(avg / 255, 0.72);
        const floorBoost = 0.12 + (mirrored * 0.10);
        const liveHeight = 14 + ((shaped + floorBoost) * (72 + mirrored * 18));

        // Glättung pro Balken, damit nichts springt und die rechte Hälfte nicht einbricht.
        smoothedBars[i] = (smoothedBars[i] * 0.60) + (liveHeight * 0.40);
        setBarHeight(bar, smoothedBars[i]);
      });

      setMeters(16 + (globalMax / 255) * 82);
      rafId = requestAnimationFrame(frame);
    };

    const ensureRunning = async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      if (!rafId) frame();
    };

    return {
      start: ensureRunning,
      stop: () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
  } catch (err) {
    renderFallback();
    return {
      start: async () => {},
      stop: () => {
        if (fallbackTimer) window.clearInterval(fallbackTimer);
      }
    };
  }
}
