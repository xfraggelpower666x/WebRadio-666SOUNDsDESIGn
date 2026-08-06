/*
 * 666SOUNDsDESIGn canonical audio visualizer authority V14 · proportional repair V15.
 * One WebAudio graph and one RAF writer for EQ, side meters and bottom meter.
 * Twenty-four independent logarithmic real-frequency bands with proportional volume/boost response and balanced peak headroom.
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
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-12, Math.min(12, Math.round(numeric)));
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
    const output = document.getElementById(`${input.id}Val`);
    const update = (event) => {
      event.stopPropagation();
      smfpRealEqState[key] = clampEqDb(input.value);
      if (output) output.textContent = String(smfpRealEqState[key]);
      saveRealEqState();
      applyRealEqToNodes();
    };
    if (output) output.textContent = String(clampEqDb(input.value));
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
  root.style.setProperty('--mff-level', safeLevel.toFixed(3));
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
    fill.style.height = '100%';
    fill.style.setProperty('--eq-scale', '0.08');
    slot.appendChild(fill);
    container.appendChild(slot);
    bars.push(fill);
  }
  return bars;
}

const meterRenderCache = new WeakMap();
const bottomRenderCache = new WeakMap();

function applyMeters(targets, values) {
  targets.forEach((element, index) => {
    if (!element) return;
    const source = Array.isArray(values) ? values[index % Math.max(1, values.length)] : values;
    const value = clamp((Number(source) || 0) * 100, 1.5, 100);
    const quantized = Math.round(value * 10) / 10;
    if (meterRenderCache.get(element) === quantized) return;
    meterRenderCache.set(element, quantized);
    element.style.height = `${quantized.toFixed(1)}%`;
    element.style.opacity = (0.18 + quantized / 122).toFixed(2);
    element.style.filter = `brightness(${(1 + quantized / 170).toFixed(2)}) saturate(${(1 + quantized / 145).toFixed(2)})`;
    element.dataset.level = (quantized / 100).toFixed(3);
  });
}

function applyBottomMeter(segments, level, peak, pulse) {
  if (!Array.isArray(segments) || !segments.length) return;
  const center = (segments.length - 1) / 2;
  const energy = clamp(level * 0.60 + peak * 0.28 + pulse * 0.12, 0, 1);
  const width = Math.max(1.2, energy * (center + 0.6));
  segments.forEach((element, index) => {
    if (!element) return;
    const distance = Math.abs(index - center);
    const active = distance <= width;
    const local = active ? clamp(1 - distance / Math.max(1, width), 0, 1) : 0;
    const value = active ? clamp(0.20 + local * 0.60 + pulse * 0.20, 0, 1) : 0.04;
    const quantized = Math.round(value * 25) / 25;
    const cacheKey = `${active ? 1 : 0}:${quantized.toFixed(2)}`;
    if (bottomRenderCache.get(element) === cacheKey) return;
    bottomRenderCache.set(element, cacheKey);
    element.classList.toggle('is-on', active);
    element.style.opacity = (0.12 + quantized * 0.88).toFixed(2);
    element.style.transform = `scaleY(${(0.34 + quantized * 0.74).toFixed(3)})`;
    element.style.setProperty('--v', quantized.toFixed(3));
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
  let fallbackRafId = 0;
  let running = false;
  let boostStage = 0;
  let meterEnvelope = 0.14;
  let peakEnvelope = 0.16;
  let previousEnvelope = 0.14;
  let bandEnvelope = [];
  let bandReference = [];

  const mobileLike = () => window.innerWidth <= 860;

  const refreshVisualizerTargets = () => {
    if (!mobileLike()) return;
    const mobileBars = Array.from(document.querySelectorAll('#mffEqBars i'));
    if (mobileBars.length && (bars.length !== mobileBars.length || bars[0] !== mobileBars[0])) {
      bars.splice(0, bars.length, ...mobileBars);
      bandEnvelope = new Array(mobileBars.length).fill(0.012);
      bandReference = new Array(mobileBars.length).fill(24);
    }
    const mobileBottom = Array.from(document.querySelectorAll('#mffBottomBars i'));
    if (mobileBottom.length && (bottomMeterSegments.length !== mobileBottom.length || bottomMeterSegments[0] !== mobileBottom[0])) {
      bottomMeterSegments.splice(0, bottomMeterSegments.length, ...mobileBottom);
    }
  };

  window.__S666VisualizerRefreshTargets = refreshVisualizerTargets;

  const setBar = (bar, normalized) => {
    if (!bar) return;
    const value = clamp(normalized, 0, 1);
    const scale = clamp(0.075 + value * 0.925, 0.075, 1);
    const quantized = Math.round(scale * 1000) / 1000;
    if (bar.__s666EqScale === quantized) return;
    bar.__s666EqScale = quantized;
    bar.style.setProperty('--eq-scale', quantized.toFixed(3));
    bar.style.opacity = (0.42 + value * 0.58).toFixed(2);
  };

  const setMeters = (level, peak, low, mid, high) => {
    const target = clamp(level, 0, 1);
    meterEnvelope += (target - meterEnvelope) * (target > meterEnvelope ? 0.82 : 0.13);
    peakEnvelope = Math.max(clamp(peak, 0, 1), peakEnvelope * 0.86);
    const pulse = clamp(Math.max(0, meterEnvelope - previousEnvelope) * 5.4 + Math.abs(target - previousEnvelope) * 2.0, 0, 1);
    previousEnvelope = meterEnvelope;

    const left = [
      clamp(meterEnvelope * 0.46 + peakEnvelope * 0.54, 0, 1),
      clamp(meterEnvelope * 0.50 + mid * 0.50, 0, 1),
      clamp(meterEnvelope * 0.50 + low * 0.50, 0, 1)
    ];
    const right = [
      clamp(meterEnvelope * 0.50 + high * 0.50, 0, 1),
      clamp(meterEnvelope * 0.50 + mid * 0.50, 0, 1),
      clamp(meterEnvelope * 0.46 + peakEnvelope * 0.54, 0, 1)
    ];

    applyMeters(leftMeters, left);
    applyMeters(rightMeters, right);
    applyBottomMeter(bottomMeterSegments, meterEnvelope, peakEnvelope, pulse);
    document.documentElement.style.setProperty('--pc-audio-energy', meterEnvelope.toFixed(3));
    document.documentElement.style.setProperty('--pc-audio-peak', peakEnvelope.toFixed(3));
    if (mobileLike()) writeMobileHudLevelVars(meterEnvelope, peakEnvelope);
    return { pulse, left, right };
  };

  const publish = (level, peak, sourceType, eq, meterState, bands = {}) => {
    window.__MeterBus = {
      ts: Date.now(),
      level: clamp(level, 0, 1),
      peak: clamp(peak, 0, 1),
      source: sourceType,
      synthetic: sourceType === 'synthetic',
      hybrid: false,
      frequencyScale: 'logarithmic',
      highFrequencyCompensation: true,
      visualHeadroom: 'balanced',
      visualCeiling: 'peak-dependent',
      volume: clamp(audio?.volume ?? 1, 0, 1),
      boostGain: Math.max(1, Number(gainNode?.gain?.value || 1)),
      eqState: { ...smfpRealEqState },
      left: meterState.left,
      right: meterState.right,
      pulse: meterState.pulse,
      low: clamp(bands.low ?? level, 0, 1),
      mid: clamp(bands.mid ?? level, 0, 1),
      high: clamp(bands.high ?? level, 0, 1),
      eq: eq.map((value) => clamp(value, 0, 1))
    };
  };

  const renderFallbackFrame = () => {
  if (!running) return;
  refreshVisualizerTargets();
  const eq = bars.map((bar) => {
    const value = 0.025;
    setBar(bar, value);
    return value;
  });
  const meters = setMeters(0.015, 0.02, 0.015, 0.015, 0.015);
  publish(0.015, 0.02, 'unavailable', eq, meters, { low:0.015, mid:0.015, high:0.015 });
};

const startFallback = () => {
  renderFallbackFrame();
};

const stopFallback = () => {
  if (fallbackRafId) window.cancelAnimationFrame(fallbackRafId);
  fallbackRafId = 0;
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
        gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.16);
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
  refreshVisualizerTargets();
  const eq = bars.map((bar) => {
    const value = 0.025;
    setBar(bar, value);
    return value;
  });
  const meters = setMeters(0.015, 0.02, 0.015, 0.015, 0.015);
  publish(0.015, 0.02, 'idle', eq, meters, { low:0.015, mid:0.015, high:0.015 });
};

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !audio) throw new Error('no_audio_context');
    const centralGraph = window.SMFPBoostCore?.graphFor?.(audio) || null;
    let source = null;
    let graphOwner = 'equalizer';

    if (centralGraph?.source) {
      if (!centralGraph.context || !centralGraph.analyser) throw new Error('existing_audio_source_without_analyser');
      ctx = centralGraph.context;
      source = centralGraph.source;
      analyser = centralGraph.analyser;
      gainNode = centralGraph.gains?.[0] || null;
      limiterNode = centralGraph.limiter || null;
      smfpRealEqNodes = (centralGraph.filters || []).slice(0, SMFP_REAL_EQ_BANDS.length);
      graphOwner = centralGraph.createdByCore ? 'central-boost-core' : 'registered-existing';
    } else {
      ctx = new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = mobileLike() ? 128 : 1024;
      analyser.smoothingTimeConstant = mobileLike() ? 0.78 : 0.48;
      analyser.minDecibels = -92;
      analyser.maxDecibels = -18;
      gainNode = ctx.createGain();
      gainNode.gain.value = window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage];
      const eqNodes = createRealEqNodes(ctx);
      limiterNode = ctx.createDynamicsCompressor();
      limiterNode.threshold.value = -1;
      limiterNode.knee.value = 3;
      limiterNode.ratio.value = 20;
      limiterNode.attack.value = 0.001;
      limiterNode.release.value = 0.10;

      source = ctx.createMediaElementSource(audio);
      source.connect(gainNode);
      if (eqNodes.length) {
        gainNode.connect(eqNodes[0]);
        for (let index = 0; index < eqNodes.length - 1; index += 1) eqNodes[index].connect(eqNodes[index + 1]);
        eqNodes[eqNodes.length - 1].connect(analyser);
      } else {
        gainNode.connect(analyser);
      }
      analyser.connect(limiterNode);
      limiterNode.connect(ctx.destination);
      try {
        window.SMFPBoostCore?.registerEngine?.(audio, {
          context: ctx,
          source,
          gainNode,
          eqNodes,
          limiterNode,
          analyser
        });
      } catch (_) {}
    }

    if (!analyser || !ctx) throw new Error('visualizer_graph_incomplete');
    if (!analyser.fftSize || analyser.frequencyBinCount < 16) analyser.fftSize = mobileLike() ? 128 : 1024;
    data = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
    applyRealEqToNodes();
    audio.dataset.visualizerGraph = 'GRAPH_OK';
    audio.dataset.visualizerGraphOwner = graphOwner;
    audio.dataset.visualizerError = '';
    document.documentElement.setAttribute('data-visualizer-graph', 'ok');
    document.documentElement.setAttribute('data-visualizer-owner', graphOwner);
    try { window.dispatchEvent(new CustomEvent('s666:visualizer-graph', { detail: { ok: true, owner: graphOwner } })); } catch (_) {}

    const frame = (timestamp = performance.now()) => {
      if (!running) return;
      refreshVisualizerTargets();
      analyser.getByteFrequencyData(data);
      analyser.getByteTimeDomainData(timeData);

      let sumSq = 0;
      let samplePeak = 0;
      for (let index = 0; index < timeData.length; index += 1) {
        const sample = (timeData[index] - 128) / 128;
        sumSq += sample * sample;
        samplePeak = Math.max(samplePeak, Math.abs(sample));
      }
      const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));
      const volume = clamp(audio?.volume ?? 1, 0, 1);
      const boostGain = Math.max(1, Number(gainNode?.gain?.value || (window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage]) || 1));
      // Visual-only response guard: keep real analyser dynamics readable without
      // making meter motion grow with Boost or collapse at normal listening volume.
      const visualGainCompensation = Math.pow(boostGain, -0.18);
      const visualVolumeScale = 0.72 + Math.pow(volume, 0.85) * 0.28;
      const visualSignalScale = clamp(visualGainCompensation * visualVolumeScale, 0.62, 1);

      const bandCount = Math.max(1, bars.length);
      const nyquist = Math.max(1, ctx.sampleRate / 2);
      const minFrequency = mobileLike() ? 70 : 45;
      const maxFrequency = Math.min(mobileLike() ? 15000 : 17000, nyquist * 0.92);
      const frequencyRatio = Math.max(1.01, maxFrequency / minFrequency);
      const rawBands = [];
      let globalMax = 0;

      for (let index = 0; index < bandCount; index += 1) {
        const startFrequency = minFrequency * Math.pow(frequencyRatio, index / bandCount);
        const endFrequency = minFrequency * Math.pow(frequencyRatio, (index + 1) / bandCount);
        const start = Math.floor(clamp((startFrequency / nyquist) * data.length, 0, data.length - 1));
        const end = Math.max(start + 1, Math.min(data.length, Math.ceil((endFrequency / nyquist) * data.length)));
        let total = 0;
        let count = 0;
        let localPeak = 0;
        for (let bin = start; bin < end; bin += 1) {
const sample = data[bin] || 0;
total += sample;
localPeak = Math.max(localPeak, sample);
count += 1;
        }
        const average = count ? total / count : 0;
        const local = (average * 0.72 + localPeak * 0.28) * visualSignalScale;
        globalMax = Math.max(globalMax, localPeak, local);
        rawBands.push(local);
      }

      const signalPresent = globalMax >= 3 || rms > 0.004;
      if (bandEnvelope.length !== bandCount) bandEnvelope = new Array(bandCount).fill(0.012);
      if (bandReference.length !== bandCount) bandReference = new Array(bandCount).fill(24);

      const values = rawBands.map((value, index) => {
        const before = rawBands[Math.max(0, index - 1)] ?? value;
        const after = rawBands[Math.min(rawBands.length - 1, index + 1)] ?? value;
        const local = value * 0.86 + before * 0.07 + after * 0.07;
        const position = index / Math.max(1, bandCount - 1);
        const absolute = clamp(local / 255, 0, 1);
        const localGate = clamp((local - 6) / 26, 0, 1);
        const currentReference = bandReference[index] || 24;
        const desiredReference = Math.max(14, local);
        bandReference[index] = desiredReference > currentReference
? currentReference + (desiredReference - currentReference) * 0.025
: Math.max(14, currentReference * 0.9994);
        const relative = clamp(local / Math.max(14, bandReference[index]), 0, 1);
        const visualTilt = 1 + Math.pow(position, 1.24) * 0.34;
        const spectral = Math.pow(absolute, 0.74) * visualTilt;
        const spectralResponse = spectral * (0.20 + localGate * 0.80);
        const adaptiveResponse = Math.pow(relative, 0.82) * 0.065 * localGate;
        const transient = clamp((localPeak - average) / 255, 0, 1);
        const transientResponse = Math.pow(transient, 0.72) * 0.14 * localGate;
        const energy = spectralResponse * 0.68 + adaptiveResponse + transientResponse;
        const peakHeadroom = 0.78 + clamp(localPeak / 255, 0, 1) * 0.22;
        const target = signalPresent && localGate > 0
? clamp(energy, 0.012, peakHeadroom)
: 0.012;
        const previous = bandEnvelope[index] || 0.012;
        const attack = 0.62 + position * 0.08;
        const release = 0.13 + position * 0.02;
        bandEnvelope[index] = previous + (target - previous) * (target > previous ? attack : release);
        return bandEnvelope[index];
      });

      const eq = [];
      bars.forEach((bar, index) => {
        const value = values[index] || 0.012;
        setBar(bar, value);
        eq.push(value);
      });

      const level = clamp(rms * visualSignalScale * 2.40, 0, 1);
      const peak = clamp(Math.max(samplePeak * visualSignalScale * 1.08, level), 0, 1);
      const sliceAverage = (start, end, fallback) => {
        const slice = values.slice(start, end);
        return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : fallback;
      };
      const low = sliceAverage(0, Math.max(1, Math.ceil(values.length * 0.34)), level);
      const mid = sliceAverage(Math.floor(values.length * 0.25), Math.max(2, Math.ceil(values.length * 0.72)), level);
      const high = sliceAverage(Math.floor(values.length * 0.62), values.length, level);
      const meters = setMeters(level, peak, low, mid, high);
      publish(level, peak, 'real', eq, meters, { low, mid, high });
      rafId = window.requestAnimationFrame(frame);
    };

    return {
      start: async () => {
        running = true;
        stopFallback();
        if (ctx?.state === 'suspended') await ctx.resume();
        setBoostStage(boostStage);
        if (!rafId) rafId = window.requestAnimationFrame(frame);
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
  } catch (error) {
    var visualizerError = String(error?.message || error || 'visualizer_graph_error').slice(0, 160);
    if (audio) {
      audio.dataset.visualizerGraph = 'GRAPH_FAIL';
      audio.dataset.visualizerError = visualizerError;
    }
    document.documentElement.setAttribute('data-visualizer-graph', 'fail');
    document.documentElement.setAttribute('data-visualizer-error', visualizerError);
    try { window.dispatchEvent(new CustomEvent('s666:visualizer-graph', { detail: { ok: false, error: visualizerError } })); } catch (_) {}
    idleState();
    return {
      start: async () => {
        running = true;
        startFallback();
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

/* Mobile visuals consume the canonical MeterBus; no secondary synthetic writer is allowed. */
