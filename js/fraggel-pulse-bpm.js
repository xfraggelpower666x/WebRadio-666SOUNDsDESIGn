/*
 * 666SOUNDsDESIGn — FRAGGEL PULSE BPM v1.0.2
 * Display-only tempo estimator for the existing Fraggel Pulse HUD.
 * Uses existing metadata / MeterBus signals only; never creates or rewires an audio graph.
 */
(() => {
  'use strict';
  if (window.S666FraggelPulseBpm?.version) return;

  const VERSION = '1.0.2';
  const FALLBACK_BPM = 145;
  const MIN_BPM = 120;
  const MAX_BPM = 180;
  const SAMPLE_MS = 50;
  const MIN_PEAK_GAP_MS = 220;
  const HISTORY_MS = 18000;
  const MIN_INTERVALS = 8;
  const bpmTarget = () => document.querySelector('.pc-addon-module-beat .pc-addon-beat p b');
  const state = { peaks: [], lastPeakAt: 0, smooth: 0, baseline: 0, armed: true, value: FALLBACK_BPM, source: 'fallback' };

  const normalizeBpm = raw => {
    let bpm = Number(raw);
    if (!Number.isFinite(bpm) || bpm <= 0) return null;
    while (bpm < MIN_BPM && bpm * 2 <= MAX_BPM) bpm *= 2;
    while (bpm > MAX_BPM && bpm / 2 >= MIN_BPM) bpm /= 2;
    if (bpm < MIN_BPM || bpm > MAX_BPM) return null;
    return bpm;
  };

  const metadataBpm = () => {
    for (const node of [document.documentElement, document.body]) {
      if (!node) continue;
      for (const attr of ['data-bpm', 'data-track-bpm', 'data-tempo']) {
        const value = normalizeBpm(node.getAttribute?.(attr));
        if (value) return value;
      }
    }
    for (const node of [document.querySelector('#nowPlayingTicker'), document.querySelector('#metaLine')]) {
      if (!node) continue;
      const text = String(node.textContent || '');
      const match = text.match(/\b(\d{2,3}(?:\.\d)?)\s*BPM\b/i);
      const value = normalizeBpm(match?.[1]);
      if (value) return value;
    }
    return null;
  };

  const estimateFromPeaks = () => {
    const now = Date.now();
    state.peaks = state.peaks.filter(t => now - t <= HISTORY_MS);
    if (state.peaks.length < MIN_INTERVALS + 1) return null;
    const intervals = [];
    for (let i = 1; i < state.peaks.length; i += 1) {
      const ms = state.peaks[i] - state.peaks[i - 1];
      if (ms >= 250 && ms <= 1000) intervals.push(ms);
    }
    if (intervals.length < MIN_INTERVALS) return null;
    const bpms = intervals.map(ms => normalizeBpm(60000 / ms)).filter(Boolean).sort((a, b) => a - b);
    if (bpms.length < MIN_INTERVALS) return null;
    const median = bpms[Math.floor(bpms.length / 2)];
    const close = bpms.filter(v => Math.abs(v - median) <= 5);
    if (close.length / bpms.length < 0.58) return null;
    return close.reduce((sum, v) => sum + v, 0) / close.length;
  };

  const publish = (bpm, source) => {
    const value = normalizeBpm(bpm) || FALLBACK_BPM;
    state.value = value;
    state.source = source || 'fallback';
    const target = bpmTarget();
    if (target) target.textContent = value.toFixed(1);
    document.documentElement.setAttribute('data-fraggel-pulse-bpm', value.toFixed(1));
    document.documentElement.setAttribute('data-fraggel-pulse-bpm-source', state.source);
  };

  const sample = () => {
    const explicit = metadataBpm();
    if (explicit) {
      publish(explicit, 'metadata');
      return;
    }

    const bus = window.__MeterBus;
    const fresh = !!(bus && bus.source === 'real' && Number.isFinite(Number(bus.level)) && Date.now() - Number(bus.ts || 0) < 1000);
    if (!fresh) {
      state.armed = true;
      if (state.source !== 'fallback') publish(FALLBACK_BPM, 'fallback');
      return;
    }

    const level = Math.max(0, Math.min(1, Number(bus.level) || 0));
    state.smooth = state.smooth * 0.58 + level * 0.42;
    state.baseline = state.baseline * 0.97 + state.smooth * 0.03;
    const now = Date.now();
    const thresholdHigh = Math.max(0.10, state.baseline + 0.085);
    const thresholdLow = Math.max(0.06, state.baseline + 0.035);

    if (state.smooth <= thresholdLow) state.armed = true;
    if (state.armed && state.smooth >= thresholdHigh && now - state.lastPeakAt >= MIN_PEAK_GAP_MS) {
      state.armed = false;
      state.lastPeakAt = now;
      state.peaks.push(now);
    }

    const detected = estimateFromPeaks();
    if (detected) publish(detected, 'meterbus');
    else if (state.source === 'fallback') publish(FALLBACK_BPM, 'fallback');
  };

  const boot = () => {
    publish(FALLBACK_BPM, 'fallback');
    window.setInterval(sample, SAMPLE_MS);
  };

  window.S666FraggelPulseBpm = Object.freeze({ version: VERSION, fallbackBpm: FALLBACK_BPM, normalizeBpm, sample });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
