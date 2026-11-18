import { getLanguage } from './i18n.js';

// Nur Pegeldaten des freigegebenen MiniPlayers; kein zweiter Audiostream.
const miniPlayer = document.getElementById('dashboardMiniPlayer');
const frames = miniPlayer ? [miniPlayer] : [];
const origin = miniPlayer ? new URL(miniPlayer.src).origin : location.origin;
const panel = document.querySelector('#audio-neon-controls');
const layer = document.querySelector('#audio-neon-layer');
if (panel && layer) {
  const toggle = panel.querySelector('button');
  const status = panel.querySelector('[data-neon-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map();
  const bands = Object.fromEntries(['bass','mid','high'].map(key => [key, panel.querySelector(`[data-neon-band="${key}"]`)]));
  const orbits = [...layer.querySelectorAll('.audio-neon-orbit')];
  const edge = layer.querySelector('.audio-neon-edge');
  const words = {
    de: { title: 'Klang wird Licht.', off: 'Neon-Effekte einschalten', on: 'Neon-Effekte ausschalten', idle: 'Effekte aus', waiting: 'Bereit · Starte den MiniPlayer', active: 'Audioreaktiv · echtes Audiosignal', synthetic: 'iPhone/iPad · simulierte Audioeffekte', paused: 'Kein aktuelles Audiosignal', missing: 'Keine Audio-Pegeldaten vom Radio empfangen · Stream-Analyse prüfen', reduced: 'Reduzierte Bewegung · Effekte pausiert', note: 'Bass, Mitten und Höhen steuern das Neonlicht. Keine Mikrofonfreigabe, keine Audioaufzeichnung.' },
    en: { title: 'Sound becomes light.', off: 'Enable neon effects', on: 'Disable neon effects', idle: 'Effects off', waiting: 'Ready · Start the MiniPlayer', active: 'Audio reactive · real audio signal', synthetic: 'iPhone/iPad · simulated audio effects', paused: 'No current audio signal', missing: 'No audio level data received from radio · check stream analysis', reduced: 'Reduced motion · effects paused', note: 'Bass, mids and highs control the neon light. No microphone access or audio recording.' }
  };
  let enabled = false, userOverride = false, timer = null, mode = 'idle', subscribedAt = 0, lastLevelsAt = 0;
  const reference = { bass:null, mid:null, high:null, energy:null };
  const display = { bass:0, mid:0, high:0, energy:0 };
  function labels() {
    const text = words[getLanguage()] || words.de;
    panel.querySelector('h3').textContent = text.title;
    panel.querySelector('[data-neon-note]').textContent = text.note;
    toggle.textContent = enabled ? text.on : text.off;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.disabled = motion.matches;
    status.textContent = text[motion.matches ? 'reduced' : mode];
  }
  function setMode(next) { if (mode !== next) { mode = next; labels(); } }
  function reset() {
    for (const key of ['bass', 'mid', 'high', 'energy']) { layer.style.setProperty(`--audio-${key}`, '0'); display[key]=0; reference[key]=null; }
    layer.dataset.active = 'false';
    Object.values(bands).forEach(b => b?.style.setProperty('--neon-level','0'));
    orbits.forEach(o => { o.style.transform='scale(1)'; o.style.opacity='0.15'; });
    if(edge) edge.style.opacity='0.12';
  }
  function subscribe(frame) {
    frame.contentWindow?.postMessage({ type: 'lyvra:audio:subscribe', version: 1, enabled: !document.hidden }, origin);
  }
  function render() {
    const now = performance.now();
    const candidates = [...states.values()].filter(s => s.playing && now - s.received < 1500);
    if (!enabled || motion.matches || document.hidden || !candidates.length) {
      reset();
      if (enabled) setMode(states.size ? 'paused' : (now - subscribedAt >= 7000 ? 'missing' : 'waiting'));
      return;
    }
    const signal = candidates.reduce((a, b) => a.energy >= b.energy ? a : b);
    // Adaptive, display-only response to actual incoming audio levels.
    // Track the local baseline so continuous mastered music never pins all bars at 100%.
    // No oscillator, fabricated beat, or audio-gain change.
    const shown = {};
    for (const key of ['bass', 'mid', 'high', 'energy']) {
      const raw = signal[key];
      const old = reference[key];
      reference[key] = old == null ? raw : old + (raw - old) * (raw > old ? .035 : .016);
      const delta = raw - reference[key];
      const target = Math.max(.045, Math.min(.91, .30 + delta * 2.3 + (raw - .5) * .19));
      display[key] += (target - display[key]) * (target > display[key] ? .57 : .32);
      shown[key] = display[key];
      layer.style.setProperty(`--audio-${key}`, String(shown[key]));
    }
    const { bass, mid, high } = shown;
    layer.dataset.active = signal.energy > 0.005 ? 'true' : 'false';
    for (const [key, value] of Object.entries({bass, mid, high})) bands[key]?.style.setProperty('--neon-level', String(value));
    if (orbits[0]) { orbits[0].style.transform = `scale(${1 + bass * .35})`; orbits[0].style.opacity = String(.16 + bass * .77); }
    if (orbits[1]) { orbits[1].style.transform = `scale(${1 + mid * .28})`; orbits[1].style.opacity = String(.14 + mid * .76); }
    if (edge) edge.style.opacity = String(.12 + high * .78);
    setMode(signal.energy > 0.005 ? signal.mode === 'synthetic' ? 'synthetic' : 'active' : 'paused');
  }
  function configure() {
    if (timer !== null) { clearInterval(timer); timer = null; }
    frames.forEach(subscribe);
    reset();
    subscribedAt = performance.now(); lastLevelsAt = 0;
    mode = enabled ? 'waiting' : 'idle';
    if (enabled && !motion.matches && !document.hidden) timer = setInterval(render, 500);
    labels();
  }
  window.addEventListener('message', event => {
    const frame = frames.find(f => f.contentWindow === event.source);
    if (document.hidden || event.origin !== origin || !frame) return;
    const data = event.data;
    const real = data?.type === 'lyvra:audio:levels';
    const synthetic = data?.type === 'lyvra:audio:visual-fallback' && data.mode === 'synthetic' && window.S666AudioMeterPolicy?.isAppleMobile;
    if ((!real && !synthetic) || data.version !== 1 || typeof data.playing !== 'boolean' || !Number.isSafeInteger(data.sequence) || data.sequence < 0) return;
    if (!['bass', 'mid', 'high', 'energy'].every(k => typeof data[k] === 'number' && Number.isFinite(data[k]) && data[k] >= 0 && data[k] <= 1)) return;
    const previous = states.get(frame);
    if (previous && data.sequence <= previous.sequence) return;
    // Die Dashboard-Effekte starten beim ersten Signal, bis der Nutzer sie manuell schaltet.
    if (!enabled && !userOverride && data.playing) { enabled = true; configure(); }
    lastLevelsAt = performance.now();
    const source = real ? 'real' : 'synthetic';
    states.set(frame, { ...data, mode: source, received: lastLevelsAt });
    document.documentElement.dataset.mffPlaying = data.playing ? '1' : '0';
    window.__MeterBus = {
      ts: Date.now(), source: data.playing ? source : 'unavailable',
      low: data.bass, mid: data.mid, high: data.high, level: data.energy
    };
    render();
  });
  function resetSignal() {
    states.clear();
    document.documentElement.dataset.mffPlaying = '0';
    delete window.__MeterBus;
  }
  frames.forEach(frame => frame.addEventListener('load', () => { resetSignal(); subscribe(frame); render(); }));
  toggle.addEventListener('click', () => { userOverride = true; enabled = !enabled; configure(); });
  motion.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => { resetSignal(); configure(); });
  document.addEventListener('lyvra:languagechange', labels);
  window.addEventListener('pagehide', () => { enabled = false; resetSignal(); frames.forEach(frame => frame.contentWindow?.postMessage({ type: 'lyvra:audio:subscribe', version: 1, enabled: false }, origin)); });
  reset(); labels();
  // Listen passively for the first authentic Play event; no fabricated activity.
  frames.forEach(subscribe);
}
