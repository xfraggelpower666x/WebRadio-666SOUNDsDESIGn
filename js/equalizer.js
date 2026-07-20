/*
 * 666SOUNDsDESIGn canonical audio visualizer authority.
 * One WebAudio graph, one RAF writer for EQ, side meters and bottom meter.
 * Desktop reactivity repair: continuous center, faster attack, controlled release.
 */

const BOOST_MULTIPLIERS = (window.SMFPBoostCore && window.SMFPBoostCore.stages)
  ? window.SMFPBoostCore.stages.map((stage) => stage.gain)
  : [1.0, 1.40, 1.70, 1.90, 2.00, 2.20];

const SMFP_REAL_EQ_BANDS = [
  { key: 'low', type: 'lowshelf', freq: 90, q: 0.70 },
  { key: 'lowMid', type: 'peaking', freq: 260, q: 0.95 },
  { key: 'mid', type: 'peaking', freq: 1000, q: 1.05 },
  { key: 'highMid', type: 'peaking', freq: 3400, q: 0.95 },
  { key: 'high', type: 'highshelf', freq: 9000, q: 0.70 }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampEqDb(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-12, Math.min(12, Math.round(n)));
}

function loadRealEqState() {
  const state = { low: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem('smfp_real_eq_v154') || '{}');
    Object.keys(state).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) state[key] = clampEqDb(parsed[key]);
    });
  } catch (_) {}
  return state;
}

const smfpRealEqState = loadRealEqState();
let smfpRealEqNodes = [];

function saveRealEqState() {
  try { localStorage.setItem('smfp_real_eq_v154', JSON.stringify(smfpRealEqState)); } catch (_) {}
}

function createRealEqNodes(ctx) {
  smfpRealEqNodes = SMFP_REAL_EQ_BANDS.map((band) => {
    const node = ctx.createBiquadFilter();
    node.type = band.type;
    node.frequency.value = band.freq;
    if (node.Q) node.Q.value = band.q;
    node.gain.value = clampEqDb(smfpRealEqState[band.key]);
    return node;
  });
  return smfpRealEqNodes;
}

function applyRealEqToNodes() {
  if (!smfpRealEqNodes.length) return;
  const ctx = smfpRealEqNodes[0]?.context;
  const now = ctx?.currentTime || 0;
  smfpRealEqNodes.forEach((node, index) => {
    const key = SMFP_REAL_EQ_BANDS[index]?.key;
    const target = clampEqDb(smfpRealEqState[key]);
    try {
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(target, now, 0.035);
    } catch (_) {
      try { node.gain.value = target; } catch (_) {}
    }
  });
  document.documentElement.setAttribute('data-smfp-real-eq', 'active');
  document.documentElement.setAttribute('data-smfp-real-eq-state', JSON.stringify(smfpRealEqState));
}

function bindRealEqPanel() {
  const panel = document.getElementById('pcRealEqPanel');
  if (!panel || panel.dataset.eqBound === '1') return;
  panel.dataset.eqBound = '1';
  panel.querySelectorAll('[data-smfp-eq]').forEach((input) => {
    const key = input.getAttribute('data-smfp-eq');
    if (Object.prototype.hasOwnProperty.call(smfpRealEqState, key)) input.value = String(smfpRealEqState[key]);
    const out = document.getElementById(`${input.id}Val`);
    const update = (event) => {
      event.stopPropagation();
      smfpRealEqState[key] = clampEqDb(input.value);
      if (out) out.textContent = String(smfpRealEqState[key]);
      saveRealEqState();
      applyRealEqToNodes();
    };
    if (out) out.textContent = String(clampEqDb(input.value));
    input.addEventListener('input', update, { passive: true });
    input.addEventListener('change', update, { passive: true });
    input.addEventListener('pointerdown', (event) => event.stopPropagation(), { capture: true });
    input.addEventListener('click', (event) => event.stopPropagation(), { capture: true });
  });
  applyRealEqToNodes();
}

function setRealEqState(next = {}) {
  Object.keys(smfpRealEqState).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(next, key)) smfpRealEqState[key] = clampEqDb(next[key]);
  });
  saveRealEqState();
  applyRealEqToNodes();
  return { ...smfpRealEqState };
}

window.__smfpRealEqApply = applyRealEqToNodes;
window.__smfpRealEqBind = bindRealEqPanel;
window.SMFPRealEq = {
  bands: SMFP_REAL_EQ_BANDS.map((band) => ({ key: band.key, freq: band.freq, type: band.type })),
  getState: () => ({ ...smfpRealEqState }),
  setState: setRealEqState,
  setBand: (key, value) => setRealEqState({ [key]: value })
};
document.addEventListener('s666:sound-eq', (event) => setRealEqState(event.detail?.values || {}));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindRealEqPanel, { passive: true });
else bindRealEqPanel();
window.addEventListener('load', bindRealEqPanel, { passive: true });

const writeMobileHudLevelVars = (level = 0, peak = level) => {
  const safeLevel = clamp(level, 0, 1);
  const safePeak = clamp(peak, 0, 1);
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
  for (let index = 0; index < count; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'eq-bar-slot';
    slot.style.position = 'relative';
    slot.style.overflow = 'hidden';
    const fill = document.createElement('div');
    fill.className = 'eq-bar-fill';
    fill.style.height = '18px';
    slot.appendChild(fill);
    container.appendChild(slot);
    bars.push(fill);
  }
  return bars;
}

function applyMeters(targets, values, side) {
  targets.forEach((element, index) => {
    if (!element) return;
    const source = Array.isArray(values) ? values[index % values.length] : values;
    const offset = side === 'left'
      ? (index === 0 ? 0 : index === 1 ? -5 : -10)
      : (index === 2 ? 0 : index === 1 ? -5 : -10);
    const value = clamp((Number(source) || 0) * 100 + offset, 6, 100);
    element.style.height = `${value.toFixed(1)}%`;
    element.style.opacity = (0.30 + value / 142).toFixed(2);
    element.style.filter = `brightness(${(1 + value / 128).toFixed(2)}) saturate(${(1 + value / 115).toFixed(2)})`;
  });
}

function applyBottomMeter(segments, level, peak, pulse) {
  if (!Array.isArray(segments) || !segments.length) return;
  const center = (segments.length - 1) / 2;
  const energy = clamp(level * 0.62 + peak * 0.26 + pulse * 0.12, 0, 1);
  const width = Math.max(1.2, energy * (center + 0.6));
  segments.forEach((element, index) => {
    if (!element) return;
    const distance = Math.abs(index - center);
    const active = distance <= width;
    const local = active ? clamp(1 - distance / Math.max(1, width), 0, 1) : 0;
    const value = active ? clamp(0.22 + local * 0.58 + pulse * 0.20, 0, 1) : 0.04;
    element.classList.toggle('is-on', active);
    element.style.opacity = (0.12 + value * 0.88).toFixed(2);
    element.style.transform = `scaleY(${(0.34 + value * 0.74).toFixed(3)})`;
    element.style.filter = `brightness(${(1 + value * 0.94).toFixed(2)}) saturate(${(1 + value * 0.82).toFixed(2)})`;
    element.style.setProperty('--v', value.toFixed(3));
  });
}

export function startVisualizer({ audio, bars, leftMeters = [], rightMeters = [], bottomMeterSegments = [] }) {
  let ctx = null;
  let analyser = null;
  let gainNode = null;
  let limiterNode = null;
  let data = null;
  let timeData = null;
  let rafId = 0;
  let fallbackTimer = 0;
  let running = false;
  let boostStage = 0;
  let weakFrames = 0;
  let meterEnvelope = 0.14;
  let peakEnvelope = 0.16;
  let previousEnvelope = 0.14;
  let bandEnvelope = [];

  const mobileLike = () => window.innerWidth <= 860;
  const slotHeight = (bar) => {
    const measured = bar?.parentElement?.clientHeight || bar?.parentElement?.getBoundingClientRect?.().height || 0;
    return Math.max(mobileLike() ? 96 : 150, measured || (mobileLike() ? 112 : 190));
  };
  const setBar = (bar, normalized) => {
    if (!bar) return;
    const maxHeight = Math.max(26, slotHeight(bar) - 4);
    const value = clamp(normalized, 0, 1);
    bar.style.height = `${(16 + value * (maxHeight - 16)).toFixed(1)}px`;
    bar.style.opacity = (0.38 + value * 0.62).toFixed(2);
    bar.style.filter = `brightness(${(1 + value * 0.88).toFixed(2)}) saturate(${(1 + value * 0.96).toFixed(2)})`;
  };

  const setMeters = (level, peak, low, mid, high) => {
    const target = clamp(level, 0, 1);
    meterEnvelope += (target - meterEnvelope) * (target > meterEnvelope ? 0.72 : 0.20);
    peakEnvelope = Math.max(clamp(peak, 0, 1), peakEnvelope * 0.91);
    const pulse = clamp(Math.max(0, meterEnvelope - previousEnvelope) * 5.8 + Math.abs(target - previousEnvelope) * 2.2, 0, 1);
    previousEnvelope = meterEnvelope;
    const left = [
      clamp(meterEnvelope * 0.50 + low * 0.50, 0, 1),
      clamp(meterEnvelope * 0.48 + mid * 0.52, 0, 1),
      clamp(meterEnvelope * 0.42 + pulse * 0.58, 0, 1)
    ];
    const right = [
      clamp(meterEnvelope * 0.48 + high * 0.52, 0, 1),
      clamp(meterEnvelope * 0.46 + mid * 0.54, 0, 1),
      clamp(meterEnvelope * 0.38 + peakEnvelope * 0.62, 0, 1)
    ];
    applyMeters(leftMeters, left, 'left');
    applyMeters(rightMeters, right, 'right');
    applyBottomMeter(bottomMeterSegments, meterEnvelope, peakEnvelope, pulse);
    document.documentElement.style.setProperty('--pc-audio-energy', meterEnvelope.toFixed(3));
    document.documentElement.style.setProperty('--pc-audio-peak', peakEnvelope.toFixed(3));
    if (mobileLike()) writeMobileHudLevelVars(meterEnvelope, peakEnvelope);
    return { pulse, left, right };
  };

  const publish = (level, peak, sourceType, eq, meterState) => {
    window.__MeterBus = {
      ts: Date.now(),
      level: clamp(level, 0, 1),
      peak: clamp(peak, 0, 1),
      source: sourceType,
      synthetic: sourceType === 'synthetic',
      hybrid: sourceType === 'hybrid',
      left: meterState.left,
      right: meterState.right,
      pulse: meterState.pulse,
      eq: eq.map((value) => clamp(value, 0, 1))
    };
  };

  const fallbackValue = (index, total, intensity) => {
    const half = Math.max(1, Math.floor(total / 2));
    const mirrored = index < half ? index : total - 1 - index;
    const t = Date.now() / 155;
    const a = Math.abs(Math.sin(t + mirrored * 0.31));
    const b = Math.abs(Math.sin(t * 0.63 + mirrored * 0.18));
    const broad = Math.abs(Math.sin(t * 0.41 + mirrored * 0.08));
    return clamp((0.10 + a * 0.53 + b * 0.19 + broad * 0.12) * intensity, 0.04, 1);
  };

  const renderFallback = (fromInterval = false) => {
    const live = !!(audio && !audio.paused && !audio.ended);
    const intensity = live ? 1 : 0.28;
    const eq = bars.map((bar, index) => {
      const value = fallbackValue(index, bars.length, intensity);
      setBar(bar, value);
      return value;
    });
    const level = live ? 0.28 + Math.abs(Math.sin(Date.now() / 225)) * 0.58 : 0.10 + Math.abs(Math.sin(Date.now() / 340)) * 0.12;
    const peak = clamp(level * 1.15, 0, 1);
    const low = eq.length ? eq.slice(0, Math.ceil(eq.length * 0.35)).reduce((a, b) => a + b, 0) / Math.ceil(eq.length * 0.35) : level;
    const mid = level;
    const high = eq.length ? eq.slice(Math.floor(eq.length * 0.65)).reduce((a, b) => a + b, 0) / Math.max(1, eq.length - Math.floor(eq.length * 0.65)) : level;
    const meters = setMeters(level, peak, low, mid, high);
    publish(level, peak, 'synthetic', eq, meters);
    if (!fromInterval && !fallbackTimer) fallbackTimer = window.setInterval(() => renderFallback(true), 90);
  };

  const stopFallback = () => {
    if (!fallbackTimer) return;
    window.clearInterval(fallbackTimer);
    fallbackTimer = 0;
  };

  const setBoostStage = (stage = 0) => {
    boostStage = window.SMFPBoostCore
      ? window.SMFPBoostCore.clampStage(stage)
      : clamp(stage, 0, BOOST_MULTIPLIERS.length - 1);
    const targetGain = window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage];
    let graphState = gainNode ? 'GRAPH_OK' : 'GRAPH_WAIT';
    let appliedGain = targetGain;
    if (gainNode) {
      const now = ctx?.currentTime || 0;
      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.08);
      } catch (_) {
        try { gainNode.gain.value = targetGain; } catch (_) { graphState = 'GRAPH_FAIL'; }
      }
      appliedGain = Number(gainNode.gain.value || targetGain);
    }
    if (audio) {
      audio.dataset.boostStage = String(boostStage);
      audio.dataset.boostGain = String(targetGain);
      audio.dataset.boostAppliedGain = String(appliedGain);
      audio.dataset.boostGraph = graphState;
      audio.dataset.boostContext = ctx?.state || 'NO_CONTEXT';
      try {
        audio.dispatchEvent(new CustomEvent('boost-diagnostic', {
          detail: { stage: boostStage, gain: targetGain, appliedGain, graph: graphState, context: ctx?.state || 'NO_CONTEXT' }
        }));
      } catch (_) {}
    }
    try {
      if (window.SMFPBoostCore) {
        window.SMFPBoostCore.saveStage(boostStage);
        window.SMFPBoostCore.publish(boostStage, targetGain, 'equalizer');
      }
    } catch (_) {}
    return boostStage;
  };

  const idleState = () => {
    bars.forEach((bar, index) => setBar(bar, 0.07 + fallbackValue(index, bars.length, 0.12)));
    const meters = setMeters(0.08, 0.10, 0.08, 0.08, 0.08);
    publish(0.08, 0.10, 'synthetic', bars.map(() => 0.08), meters);
  };

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');
    ctx = new AudioCtx();
    analyser = ctx.createAnalyser();
    analyser.fftSize = mobileLike() ? 128 : 512;
    analyser.smoothingTimeConstant = mobileLike() ? 0.82 : 0.62;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -18;
    data = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
    gainNode = ctx.createGain();
    gainNode.gain.value = window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage];
    const eqNodes = createRealEqNodes(ctx);
    limiterNode = ctx.createDynamicsCompressor();
    limiterNode.threshold.value = -1;
    limiterNode.knee.value = 3;
    limiterNode.ratio.value = 20;
    limiterNode.attack.value = 0.001;
    limiterNode.release.value = 0.10;
    const source = ctx.createMediaElementSource(audio);
    source.connect(gainNode);
    if (eqNodes.length) {
      gainNode.connect(eqNodes[0]);
      for (let index = 0; index < eqNodes.length - 1; index += 1) eqNodes[index].connect(eqNodes[index + 1]);
      eqNodes[eqNodes.length - 1].connect(limiterNode);
    } else gainNode.connect(limiterNode);
    limiterNode.connect(analyser);
    analyser.connect(ctx.destination);
    applyRealEqToNodes();

    const frame = () => {
      if (!running) return;
      analyser.getByteFrequencyData(data);
      analyser.getByteTimeDomainData(timeData);
      const halfBars = Math.max(1, Math.floor(bars.length / 2));
      const analysisWindow = Math.max(12, Math.floor(data.length * 0.86));
      const rawBands = [];
      let globalMax = 0;
      let globalTotal = 0;
      for (let index = 0; index < analysisWindow; index += 1) globalTotal += data[index] || 0;
      const globalMean = globalTotal / analysisWindow;
      for (let index = 0; index < halfBars; index += 1) {
        const n0 = index / Math.max(1, halfBars - 1);
        const n1 = (index + 1) / Math.max(1, halfBars);
        const start = Math.floor(Math.pow(n0, 1.72) * Math.max(1, analysisWindow - 2));
        const end = Math.max(start + 2, Math.floor(Math.pow(n1, 1.72) * analysisWindow));
        let total = 0;
        let count = 0;
        for (let bin = start; bin < Math.min(analysisWindow, end + 2); bin += 1) {
          total += data[bin] || 0;
          count += 1;
        }
        const local = count ? total / count : 0;
        globalMax = Math.max(globalMax, local);
        const neighbor = index ? rawBands[index - 1] : local;
        const blended = local * 0.68 + neighbor * 0.14 + globalMean * 0.18;
        rawBands.push(blended);
      }
      weakFrames = globalMax < 8 ? weakFrames + 1 : 0;
      const useHybrid = weakFrames > 4;
      if (bandEnvelope.length !== halfBars) bandEnvelope = new Array(halfBars).fill(0.08);
      const halfValues = rawBands.map((value, index) => {
        const spectral = Math.pow(clamp(value / 255, 0, 1), 0.62);
        const centerSupport = 0.07 + Math.pow(globalMean / 255, 0.72) * (0.18 + index / Math.max(1, halfBars - 1) * 0.12);
        let target = clamp(spectral * 1.20 + centerSupport, 0.04, 1);
        if (useHybrid) target = Math.max(target, fallbackValue(index, halfBars * 2, audio.paused ? 0.25 : 0.66));
        const previous = bandEnvelope[index] || 0;
        bandEnvelope[index] = previous + (target - previous) * (target > previous ? 0.76 : 0.23);
        return bandEnvelope[index];
      });
      const eq = [];
      bars.forEach((bar, index) => {
        const mirrored = index < halfBars ? index : bars.length - 1 - index;
        const value = halfValues[Math.min(mirrored, halfValues.length - 1)] || 0.06;
        setBar(bar, value);
        eq.push(value);
      });
      let sumSq = 0;
      let samplePeak = 0;
      timeData.forEach((sample) => {
        const value = (sample - 128) / 128;
        sumSq += value * value;
        samplePeak = Math.max(samplePeak, Math.abs(value));
      });
      const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));
      const level = useHybrid
        ? clamp(0.22 + Math.abs(Math.sin(Date.now() / 310)) * 0.34, 0, 1)
        : clamp(rms * 2.25, 0, 1);
      const peak = useHybrid ? clamp(level * 1.16, 0, 1) : clamp(Math.max(samplePeak * 1.08, level), 0, 1);
      const sliceAverage = (start, end, fallback) => {
        const slice = halfValues.slice(start, end);
        return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : fallback;
      };
      const low = sliceAverage(0, Math.max(1, Math.ceil(halfValues.length * 0.35)), level);
      const mid = sliceAverage(Math.floor(halfValues.length * 0.25), Math.max(2, Math.ceil(halfValues.length * 0.72)), level);
      const high = sliceAverage(Math.floor(halfValues.length * 0.62), halfValues.length, level);
      const meters = setMeters(level, peak, low, mid, high);
      publish(level, peak, useHybrid ? 'hybrid' : 'real', eq, meters);
      rafId = window.requestAnimationFrame(frame);
    };

    return {
      start: async () => {
        running = true;
        stopFallback();
        if (ctx?.state === 'suspended') await ctx.resume();
        setBoostStage(boostStage);
        if (!rafId) frame();
      },
      stop: () => {
        running = false;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = 0;
        stopFallback();
        idleState();
      },
      setBoostStage,
      getBoostStage: () => boostStage
    };
  } catch (_) {
    idleState();
    return {
      start: async () => {
        running = true;
        stopFallback();
        renderFallback(false);
      },
      stop: () => {
        running = false;
        stopFallback();
        idleState();
      },
      setBoostStage: (stage = 0) => {
        boostStage = clamp(stage, 0, BOOST_MULTIPLIERS.length - 1);
        if (audio) {
          audio.dataset.boostStage = String(boostStage);
          audio.dataset.boostGain = String(window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage]);
        }
        return boostStage;
      },
      getBoostStage: () => boostStage
    };
  }
}

/* Mobile-only visibility guard. Desktop has no secondary interval writer. */
window.setInterval(() => {
  if (window.innerWidth > 860) return;
  try {
    const audio = document.querySelector('audio');
    if (!audio || audio.paused || audio.readyState <= 1) return;
    const current = Number(getComputedStyle(document.documentElement).getPropertyValue('--audio-level')) || 0;
    if (current < 0.035) {
      const stage = Number(audio.dataset?.boostStage || 0);
      const safe = 0.10 + stage * 0.02;
      writeMobileHudLevelVars(safe, safe);
    }
  } catch (_) {}
}, 360);
