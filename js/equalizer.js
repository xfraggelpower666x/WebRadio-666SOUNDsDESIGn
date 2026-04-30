/* BOOST_DIAGNOSTIC_PATCH_v1: Boost-Diagnosewerte + boost-diagnostic Event. */

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
ÄNDERUNG: FULLPACK v34.8 PC VISUALIZER RECOVERY. Schwache/fehlende Analyzer-Daten schalten schneller in sichtbaren Hybrid-Fallback.
ÄNDERUNG: FULLPACK v34.7 REAL MOBILE BOOSTER. Boost-Stufen 0-3 sind hörbarer abgestuft und schreiben Gain-Diagnose in das Audio-Element.
GEÄNDERT: 2026-04-21
ZWECK: Equalizer- und Seitenmeter-Visualisierung.
ÄNDERUNG: FULLPACK v16 AUDIO ANALYZER + HYBRID FALLBACK + MOBILE BOOSTER.
          Echter Audio-Analyzer wenn stabil verfügbar; bei iPhone-/Safari-/Stream-Schwäche
          automatisch Hybrid-Fallback mit lebendiger Bewegung. Zusätzlich mobile Boost-Stufen
          über GainNode, ohne den Desktop-Volume-Regler anzutasten.
==========================================
*/

const BOOST_MULTIPLIERS = [1.0, 1.35, 1.75, 2.20];

/*
==========================================
GEÄNDERT: 2026-04-25
ÄNDERUNG: MOBILE_LEVELMETER_GESTURE_GUARD_PATCH_v1
ZWECK:
- Zentrale Audio-Level-CSS-Variablen für Side-Meter und Bottom-Center-Out-Meter.
- Keine neue DSP-Kette, kein Stream-/Worker-Umbau.
==========================================
*/
const writeMobileHudLevelVars = (level = 0, peak = 0) => {
  const safeLevel = Math.max(0, Math.min(1, Number(level) || 0));
  const safePeak = Math.max(0, Math.min(1, Number(peak) || safeLevel));
  const root = document.documentElement;
  root.style.setProperty('--audio-level', safeLevel.toFixed(3));
  root.style.setProperty('--audio-peak', safePeak.toFixed(3));
  root.style.setProperty('--meter-left', safeLevel.toFixed(3));
  root.style.setProperty('--meter-right', safeLevel.toFixed(3));
  root.style.setProperty('--meter-bottom-left', safePeak.toFixed(3));
  root.style.setProperty('--meter-bottom-right', safePeak.toFixed(3));
  document.body?.setAttribute('data-mobile-meter-live', safeLevel > 0.015 ? '1' : '0');
};


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


function applyBottomMeterFromSideDynamics(segments, valuePercent) {
  if (!Array.isArray(segments) || !segments.length) return;
  const bounded = clamp(valuePercent, 10, 98);
  const center = (segments.length - 1) / 2;
  const activeWidth = (bounded / 100);
  segments.forEach((el, index) => {
    if (!el) return;
    const dist = Math.abs(index - center) / Math.max(1, center);
    const active = dist <= activeWidth;
    el.classList.toggle('is-on', active);
    el.style.opacity = active ? String(0.45 + (bounded / 100) * 0.55) : '0.18';
    el.style.transform = `scaleY(${0.52 + (bounded / 100) * 0.48})`;
    el.style.setProperty('--v', String((bounded / 100).toFixed(3)));
  });
}

function recoverDesktopCenterBars(bars, levelPercent, playing = true) {
  if (!Array.isArray(bars) || window.innerWidth <= 860) return;
  const total = bars.length;
  if (!total) return;
  const center = (total - 1) / 2;
  const dynamic = Math.max(22, 22 + (clamp(levelPercent, 10, 98) * 0.78));
  bars.forEach((bar, index) => {
    const distance = Math.abs(index - center);
    if (distance > Math.max(3, total * 0.18)) return;
    const current = parseFloat(String(bar.style.height || '0').replace('px', '')) || 0;
    const localShape = 1 - (distance / Math.max(1, total * 0.20));
    const movement = Math.abs(Math.sin((Date.now() / 160) + index * 0.31)) * 15;
    const target = playing ? dynamic * (0.72 + localShape * 0.30) + movement : 18 + localShape * 8;
    if (current < target) {
      bar.style.height = `${Math.min(132, target)}px`;
    }
  });
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

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [], bottomMeterSegments = [] }) {
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
    applyBottomMeterFromSideDynamics(bottomMeterSegments, next);
    document.documentElement.style.setProperty('--pc-audio-energy', String((next / 100).toFixed(3)));
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
    recoverDesktopCenterBars(bars, meter, audio && !audio.paused);

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

    const targetGain = BOOST_MULTIPLIERS[boostStage];
    let graphState = gainNode ? 'GRAPH_OK' : 'GRAPH_WAIT';
    let appliedGain = targetGain;

    if (gainNode) {
      const now = ctx?.currentTime || 0;

      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.08);
      } catch (err) {
        try {
          gainNode.gain.value = targetGain;
        } catch (err2) {
          graphState = 'GRAPH_FAIL';
        }
      }

      try {
        appliedGain = Number(gainNode.gain.value || targetGain);
      } catch (err) {
        appliedGain = targetGain;
      }
    }

    if (audio) {
      audio.dataset.boostStage = String(boostStage);
      audio.dataset.boostGain = String(targetGain);
      audio.dataset.boostAppliedGain = String(appliedGain);
      audio.dataset.boostGraph = graphState;
      audio.dataset.boostContext = ctx?.state || 'NO_CONTEXT';

      try {
        audio.dispatchEvent(new CustomEvent('boost-diagnostic', {
          detail: {
            stage: boostStage,
            gain: targetGain,
            appliedGain,
            graph: graphState,
            context: ctx?.state || 'NO_CONTEXT'
          }
        }));
      } catch (err) {}
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
    recoverDesktopCenterBars(bars, 18, false);
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

      const useHybrid = weakFrameCounter > 3;

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
      recoverDesktopCenterBars(bars, meterValue, audio && !audio.paused);
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
        if (audio) {
          audio.dataset.boostStage = String(boostStage);
          audio.dataset.boostGain = String(BOOST_MULTIPLIERS[boostStage]);
        }
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


/* MOBILE_LEVELMETER_GESTURE_GUARD_PATCH_v1_LEVEL_WRITE
   Fallback-Levelwriter: nutzt vorhandenes audio dataset, falls der Visualizer-Loop keine CSS-Level schreibt.
*/
setInterval(() => {
  try {
    const audioEl = document.querySelector('audio');
    const live = audioEl && !audioEl.paused && audioEl.readyState > 1;
    const stage = Number(audioEl?.dataset?.boostStage || 0);
    const syntheticIdle = live ? 0.08 + (stage * 0.015) : 0;
    writeMobileHudLevelVars(syntheticIdle, syntheticIdle);
  } catch (err) {}
}, 220);

/* MOBILE_HUD_DOM_METER_REPAIR_v1_LEVEL_VISIBILITY */
setInterval(()=>{try{const a=document.querySelector('audio');const v=Number(getComputedStyle(document.documentElement).getPropertyValue('--audio-level'))||0;if(a&&!a.paused&&a.readyState>1&&v<.035){const st=Number(a.dataset?.boostStage||0);const safe=.10+(st*.02);if(typeof writeMobileHudLevelVars==='function')writeMobileHudLevelVars(safe,safe);}}catch(e){}},360);
