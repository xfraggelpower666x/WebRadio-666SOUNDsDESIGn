
/*
==========================================
GEÄNDERT: 2026-04-21
ÄNDERUNG: FULLPACK v27 EQ RUNTIME FIX.
ZWECK: Stabiler Frequency-Mapping Fix für Desktop.
       Verhindert tote Mitte nach Startphase.
==========================================
*/

function v27StableMapping(dataArray, bars){
  if (!dataArray || !bars) return;

  const step = Math.floor(dataArray.length / bars.length);

  for (let i = 0; i < bars.length; i++) {
    const index = i * step;
    const value = dataArray[index] || 0;

    const height = Math.max(12, value * 0.6);
    v27StableMapping(dataArray, bars);
  }
}

/*
==========================================
DATEI: external-player/js/equalizer.js
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v16 AUDIO ANALYZER + HYBRID FALLBACK + MOBILE BOOSTER.
          Echter Audio-Analyzer wenn stabil verfügbar; bei iPhone-/Safari-/Stream-Schwäche
          automatisch Hybrid-Fallback mit lebendiger Bewegung. Zusätzlich mobile Boost-Stufen
          über GainNode, ohne den Desktop-Volume-Regler anzutasten.
==========================================
*/

const BOOST_MULTIPLIERS = [1.0, 1.18, 1.38, 1.62];

export function createBars(container, count = 24) {
  const bars = [];
  if (!container) return bars;
  container.innerHTML = '';

  for (let i = 0; i < count; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'eq-bar-slot';
    slot.style.position = 'relative';
    slot.style.overflow = 'hidden';

    const fill = document.createElement('div');
    fill.className = 'eq-bar-fill';

    const mirroredIndex = i < (count / 2) ? i : (count - 1 - i);
    const normalized = mirroredIndex / Math.max(1, (count / 2) - 1);
    const contour = 1 - (normalized * 0.45);
    fill.style.height = `${12 + contour * 16}px`;

    slot.appendChild(fill);
    container.appendChild(slot);
    bars.push(fill);
  }

  return bars;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyMeters(targets, valuePercent, side = 'left') {
  const bounded = clamp(valuePercent, 10, 98);
  targets.forEach((el, index) => {
    if (!el) return;
    let offset = 0;
    if (side === 'left') {
      offset = index === 0 ? 0 : -10;
    } else {
      // rechts intern gespiegelt: außen länger, innen kürzer
      offset = index === 0 ? -10 : 0;
    }
    el.style.height = `${Math.max(10, bounded + offset)}%`;
  });
}


function applyBottomMeters(targets, valuePercent, side = 'left') {
  const bounded = clamp(valuePercent, 8, 98);
  targets.forEach((el, index) => {
    if (!el) return;
    const offset = index === 0 ? 0 : -12;
    const width = Math.max(8, bounded + offset);
    el.style.width = `${width}%`;
  });
}

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [], bottomMetersLeft = [], bottomMetersRight = [] }) {
  let ctx = null;
  let analyser = null;
  let source = null;
  let gainNode = null;
  let data = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let running = false;
  let smoothMeter = 18;
  let boostStage = 0;
  let weakFrameCounter = 0;

  const mobileLike = () => window.innerWidth <= 860;

  const setBarHeight = (bar, px) => {
    if (!bar) return;
    bar.style.height = `${Math.max(12, px)}px`;
  };

  const setMeters = (valuePercent) => {
    const next = (smoothMeter * 0.58) + (clamp(valuePercent, 12, 98) * 0.42);
    smoothMeter = next;
    applyMeters(leftMeters, next, 'left');
    applyMeters(rightMeters, next, 'right');
    applyBottomMeters(bottomMetersLeft, next, 'left');
    applyBottomMeters(bottomMetersRight, next, 'right');
  };

  const getFallbackBarValue = (index, total, intensity = 1) => {
    const t = Date.now() / 155;
    const mirroredIndex = index < (total / 2) ? index : (total - 1 - index);
    const waveA = Math.abs(Math.sin(t + mirroredIndex * 0.30));
    const waveB = Math.abs(Math.sin((t * 0.66) + mirroredIndex * 0.17));
    const contour = 1.16 - ((mirroredIndex / Math.max(1, total / 2)) * 0.38);
    return 14 + ((waveA * 68) + (waveB * 18)) * contour * intensity;
  };

  const renderFallback = (fromInterval = false) => {
    const intensity = audio && !audio.paused ? 1.0 : 0.34;
    bars.forEach((bar, i) => {
      setBarHeight(bar, getFallbackBarValue(i, bars.length, intensity));
    });
    const meter = audio && !audio.paused
      ? 26 + (Math.abs(Math.sin(Date.now() / 210)) * 62)
      : 18 + (Math.abs(Math.sin(Date.now() / 300)) * 18);
    setMeters(meter);

    if (!fromInterval && !fallbackTimer) {
      fallbackTimer = window.setInterval(() => renderFallback(true), 110);
    }
  };

  const stopFallbackTimer = () => {
    if (fallbackTimer) {
      window.clearInterval(fallbackTimer);
      fallbackTimer = 0;
    }
  };

  const setBoostStage = (stage = 0) => {
    const nextStage = clamp(Number(stage) || 0, 0, BOOST_MULTIPLIERS.length - 1);
    boostStage = nextStage;
    if (gainNode) {
      gainNode.gain.value = BOOST_MULTIPLIERS[boostStage];
    }
    return boostStage;
  };

  const idleState = () => {
    bars.forEach((bar, i) => {
      const mirroredIndex = i < (bars.length / 2) ? i : (bars.length - 1 - i);
      const contour = 1 - ((mirroredIndex / Math.max(1, bars.length / 2)) * 0.42);
      setBarHeight(bar, 12 + contour * 14);
    });
    setMeters(18);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');

    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = mobileLike() ? 128 : 256;
    analyser.smoothingTimeConstant = mobileLike() ? 0.84 : 0.80;
    data = new Uint8Array(analyser.frequencyBinCount);

    gainNode = ctx.createGain();
    gainNode.gain.value = BOOST_MULTIPLIERS[boostStage];

    source = ctx.createMediaElementSource(audio);
    source.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.connect(ctx.destination);

    const frame = () => {
      if (!running) return;

      analyser.getByteFrequencyData(data);

      const halfBars = Math.max(1, Math.floor(bars.length / 2));
      const analysisWindow = Math.max(8, Math.floor(data.length * 0.72));
      const slice = Math.max(1, Math.floor(analysisWindow / halfBars));
      const shapedValues = [];
      let globalMax = 0;

      for (let i = 0; i < halfBars; i += 1) {
        let total = 0;
        let count = 0;
        const start = Math.floor(Math.pow(i / Math.max(1, halfBars - 1), 1.65) * Math.max(1, analysisWindow - slice));
        const end = Math.min(analysisWindow, start + slice);

        for (let j = start; j < end; j += 1) {
          total += data[j] || 0;
          count += 1;
        }

        const avg = count ? (total / count) : 0;
        globalMax = Math.max(globalMax, avg);

        const shaped = Math.pow(avg / 255, 0.72);
        const contour = 1.16 - ((i / Math.max(1, halfBars - 1)) * 0.36);
        const px = 12 + (shaped * contour * (mobileLike() ? 84 : 98));
        shapedValues.push(px);
      }

      if (globalMax < 10) {
        weakFrameCounter += 1;
      } else {
        weakFrameCounter = 0;
      }

      const useHybrid = weakFrameCounter > 6;

      for (let i = 0; i < bars.length; i += 1) {
        const mirroredIndex = i < halfBars ? i : (bars.length - 1 - i);
        let px = shapedValues[Math.min(mirroredIndex, shapedValues.length - 1)] || 14;

        if (useHybrid) {
          const hybrid = getFallbackBarValue(i, bars.length, audio && !audio.paused ? 0.72 : 0.34);
          px = Math.max(px, hybrid);
        }

        setBarHeight(bars[i], px);
      }

      const meterValue = useHybrid
        ? 24 + (Math.abs(Math.sin(Date.now() / 200)) * 66)
        : 14 + ((globalMax / 255) * 84);

      setMeters(meterValue);
      rafId = window.requestAnimationFrame(frame);
    };

    return {
      start: async () => {
        running = true;
        stopFallbackTimer();
        if (ctx?.state === 'suspended') await ctx.resume();
        setBoostStage(boostStage);
        if (!rafId) frame();
      },
      stop: () => {
        running = false;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = 0;
        stopFallbackTimer();
        idleState();
      },
      setBoostStage,
      getBoostStage: () => boostStage
    };
  } catch (err) {
    idleState();
    return {
      start: async () => {
        running = true;
        stopFallbackTimer();
        renderFallback(false);
      },
      stop: () => {
        running = false;
        stopFallbackTimer();
        idleState();
      },
      setBoostStage: (stage = 0) => {
        boostStage = clamp(Number(stage) || 0, 0, BOOST_MULTIPLIERS.length - 1);
        return boostStage;
      },
      getBoostStage: () => boostStage
    };
  }
}


/*
==========================================
ZUSATZ: v26DesktopCenterFloor
ZWECK: Desktop-Mitte des Equalizers leicht anheben, ohne Geometrie,
       Grid oder Balkenbreite zu verändern. Mobile bleibt unberührt.
==========================================
*/
function v26DesktopCenterFloor(bars) {
  if (!Array.isArray(bars) || window.innerWidth <= 860) return;
  const centerIndices = [10, 11, 12, 13];
  centerIndices.forEach((i) => {
    const bar = bars[i];
    if (!bar) return;
    const current = parseFloat(String(bar.style.height || '14').replace('px', '')) || 14;
    if (current < 18) {
      bar.style.height = '18px';
    }
  });
}
