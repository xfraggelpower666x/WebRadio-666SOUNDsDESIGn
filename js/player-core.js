/* BOOST_DIAGNOSTIC_PATCH_v1: BST zeigt Boost-Stufe und Graphzustand. */
/*
==========================================
DATEI: external-player/js/player-core.js
ÄNDERUNG: FULLPACK v34.8 PC VISUALIZER RECOVERY. Booster-Initialisierung repariert, damit PC-Visualizer wieder startet.
ÄNDERUNG: FULLPACK v34.7 REAL MOBILE BOOSTER. Booster setzt WebAudio-Gain neu nach Play und nutzt iPhone-Volume-Fallback.
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ÄNDERUNG: FULLPACK v34.4 CONTROL UNLOCK. Play darf die Oberfläche nicht mehr blockieren; Audio-Start bekommt Timeout/Token-Schutz, Stop/Pause bleiben klickbar, Metadaten-Fetch bekommt Timeout.
ÄNDERUNG: FULLPACK v14.2 UNKNOWN TITLE CLEANUP. Now Playing und Ticker bereinigen führende Platzhalter wie "Unknown title -" und ähnliche Rohpräfixe konsequent.
ZWECK: Hauptlogik des externen Players mit bestehenden Worker-Endpunkten.
ÄNDERUNG: FULLPACK v11 MOBILE POSITION + DJ LABEL. Für kleine Viewports wird der DJ-Fallback kompakter als DJ666 angezeigt; Desktop behält 666SOUNDsDESIGn. Audio/Layout-Entkopplung aus v10 bleibt bestehen.
HINWEIS: Audio, Metadaten und Fallback weiter nur über bestehende Worker-Routen.
==========================================
*/
import { setText, markSourceButtons } from './controls.js';
import { createBars, startVisualizer } from './equalizer.js';
import { installResponsiveHelpers } from './responsive-ui.js';
import { applyStatusChip } from './shared-status.js';

const ENDPOINTS = {
  main: '/stream',
  fallback: '/fallback-stream',
  metadata: '/api/nowplaying',
  health: '/health'
};

const POLL_MS = 8000;
const audio = document.getElementById('radio');
const nowPlayingTicker = document.getElementById('nowPlayingTicker');
const metaLine = document.getElementById('metaLine');
const listenersText = document.getElementById('listenersText');
const bitrateText = document.getElementById('bitrateText');
const djText = document.getElementById('djText');
const streamState = document.getElementById('streamState');
const historyList = document.getElementById('historyList');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const leftMeters = [document.getElementById('leftMeterA'), document.getElementById('leftMeterB')].filter(Boolean);
const rightMeters = [document.getElementById('rightMeterA'), document.getElementById('rightMeterB')].filter(Boolean);
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const reconnectBtn = document.getElementById('reconnectBtn');
const mainBtn = document.getElementById('mainBtn');
const fallbackBtn = document.getElementById('fallbackBtn');
const statusStream = document.getElementById('statusStream');
const statusMeta = document.getElementById('statusMeta');
const statusSource = document.getElementById('statusSource');
const volumeSlider = document.getElementById('volumeSlider');
const boostButtons = Array.from(document.querySelectorAll('[data-boost-stage]'));
const boostStepButtons = Array.from(document.querySelectorAll('[data-boost-step]'));
const boostLeds = Array.from(document.querySelectorAll('[data-boost-led]'));
let currentBoostStage = 0;
const timelineProgress = document.getElementById('timelineProgress');
const currentTimeText = document.getElementById('currentTimeText');
const durationText = document.getElementById('durationText');

let currentSource = 'main';
let userStopped = false;
let metadataTimer = 0;
let historyItems = [];
let playRequestToken = 0;
let switchingStream = false;
const PLAY_START_TIMEOUT_MS = 6500;
const METADATA_TIMEOUT_MS = 4500;
const isMobileViewport = () => window.innerWidth <= 860;

const bars = createBars(document.getElementById('eqBars'), window.innerWidth <= 860 ? 20 : 28);
const visualizer = startVisualizer({ audio, bars, leftMeters, rightMeters });
audio?.addEventListener('boost-diagnostic', (event) => updateBoostDiagnosticLabel(event.detail || {}));
setBoostStage(0);

/*
==========================================
GEÄNDERT: 2026-04-25
ÄNDERUNG: MOBILE_TOUCH_CONTROLS_REPAIR_v1
ZWECK: Zusätzliche Touch-Delegation für Play/Pause/Stop/Boost.
==========================================
*/
function installMobileTouchControlsRepair() {
  const root = document;

  const nearestActionTarget = (target) => target?.closest?.('button, [role="button"], .control-btn, .transport-btn, .player-btn, .boost-btn, .round-btn');

  const detectAction = (el) => {
    const text = (el?.textContent || '').trim().toLowerCase();
    const id = (el?.id || '').toLowerCase();
    const cls = (el?.className || '').toString().toLowerCase();
    const data = (el?.dataset?.action || el?.dataset?.control || el?.dataset?.cmd || '').toLowerCase();
    const label = (el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || '').toLowerCase();
    const hay = `${id} ${cls} ${data} ${label} ${text}`;

    if (hay.includes('play') || hay.includes('▶')) return 'play';
    if (hay.includes('pause') || hay.includes('⏸')) return 'pause';
    if (hay.includes('stop') || hay.includes('■') || hay.includes('square')) return 'stop';
    if (hay === '+' || hay.includes('plus') || hay.includes('boost-up')) return 'boost-up';
    if (hay === '-' || hay.includes('minus') || hay.includes('boost-down')) return 'boost-down';
    if (hay.includes('boost') || hay.includes('bst')) return 'boost-up';
    return '';
  };

  const runAction = async (action) => {
    if (action === 'play' && typeof startPlayback === 'function') {
      await startPlayback();
      return true;
    }
    if (action === 'pause' && audio) {
      audio.pause();
      if (typeof setState === 'function') setState('paused');
      return true;
    }
    if (action === 'stop' && audio) {
      audio.pause();
      try { audio.currentTime = 0; } catch (err) {}
      if (typeof setState === 'function') setState('stopped');
      return true;
    }
    if (action === 'boost-up' && typeof setBoostStage === 'function') {
      const nextStage = Math.min(3, (Number(currentBoostStage) || 0) + 1);
      currentBoostStage = setBoostStage(nextStage);
      return true;
    }
    if (action === 'boost-down' && typeof setBoostStage === 'function') {
      const nextStage = Math.max(0, (Number(currentBoostStage) || 0) - 1);
      currentBoostStage = setBoostStage(nextStage);
      return true;
    }
    return false;
  };

  const handler = async (event) => {
    const el = nearestActionTarget(event.target);
    if (!el) return;
    const action = detectAction(el);
    if (!action) return;
    const handled = await runAction(action);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  root.addEventListener('touchend', handler, { passive: false, capture: true });
  root.addEventListener('click', handler, { passive: false, capture: true });
  document.body?.setAttribute('data-mobile-touch-repair', 'v1');
}

installMobileTouchControlsRepair();

/*
==========================================
GEÄNDERT: 2026-04-25
ÄNDERUNG: MOBILE_LEVELMETER_GESTURE_GUARD_PATCH_v1
ZWECK:
- Mobile-Gesten-Schutzstatus setzen.
- Unterer Center-Out-Levelmeter bleibt unter Player und nicht im iPhone-Gestenbereich.
==========================================
*/
function installMobileLevelmeterGestureGuard() {
  const apply = () => {
    const isMobile = window.matchMedia?.('(max-width: 760px)').matches || window.innerWidth <= 760;
    document.body?.setAttribute('data-gesture-guard', isMobile ? 'mobile' : 'desktop');
    document.documentElement.style.setProperty('--gesture-guard-height', isMobile ? '76px' : '34px');
  };
  apply();
  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', apply, { passive: true });
}

installMobileLevelmeterGestureGuard();

/* MOBILE_HUD_DOM_METER_REPAIR_v1: echte DOM-Meter + Mobile-Transportleiste. */
function installMobileHudDomMeterRepair() {
  if (document.getElementById('mobileHudDomMeterRepair')) return;

  const shell = document.createElement('div');
  shell.id = 'mobileHudDomMeterRepair';
  shell.className = 'mobile-hud-dom-meter-repair';
  shell.setAttribute('aria-hidden', 'true');
  shell.innerHTML = '<div class="mobile-dom-side-meter mobile-dom-side-meter-left"><i></i></div><div class="mobile-dom-side-meter mobile-dom-side-meter-right"><i></i></div><div class="mobile-dom-bottom-guard"><div class="mobile-dom-bottom-track"><i class="mobile-dom-bottom-left"></i><i class="mobile-dom-bottom-right"></i></div></div>';
  document.body.appendChild(shell);

  const controls = document.createElement('div');
  controls.id = 'mobileTransportRepair';
  controls.className = 'mobile-transport-repair';
  controls.innerHTML = '<button type="button" class="mobile-repair-btn" data-mobile-repair-action="play" aria-label="Play">▶</button><button type="button" class="mobile-repair-btn" data-mobile-repair-action="pause" aria-label="Pause">Ⅱ</button><button type="button" class="mobile-repair-btn" data-mobile-repair-action="stop" aria-label="Stop">■</button><button type="button" class="mobile-repair-btn" data-mobile-repair-action="boost-down" aria-label="Boost weniger">−</button><button type="button" class="mobile-repair-btn mobile-repair-boost" data-mobile-repair-action="boost-up" aria-label="Boost mehr">BST +</button>';

  const anchor = document.querySelector('.boost-panel, .mobile-boost-core, .mobile-shell, main');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(controls, anchor.nextSibling);
  else document.body.appendChild(controls);

  const setMobileHudState = () => {
    const mobile = (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) || window.innerWidth <= 760;
    document.body.setAttribute('data-mobile-dom-meter-repair', mobile ? 'on' : 'off');
    document.documentElement.style.setProperty('--mobile-dom-guard-height', mobile ? '78px' : '0px');
  };

  const run = async (action) => {
    try {
      if (action === 'play' && typeof startPlayback === 'function') return await startPlayback();
      if (action === 'pause' && audio) { audio.pause(); if (typeof setState === 'function') setState('paused'); return; }
      if (action === 'stop' && audio) { audio.pause(); try { audio.currentTime = 0; } catch(e) {} if (typeof setState === 'function') setState('stopped'); return; }
      if (action === 'boost-up' && typeof setBoostStage === 'function') { currentBoostStage = setBoostStage(Math.min(3, (Number(currentBoostStage)||0)+1)); return; }
      if (action === 'boost-down' && typeof setBoostStage === 'function') { currentBoostStage = setBoostStage(Math.max(0, (Number(currentBoostStage)||0)-1)); return; }
    } catch (err) { console.warn('[MOBILE_HUD_DOM_METER_REPAIR_v1]', action, err); }
  };

  const handler = (event) => {
    const btn = event.target.closest && event.target.closest('[data-mobile-repair-action]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    run(btn.dataset.mobileRepairAction);
  };
  controls.addEventListener('click', handler, {capture:true});
  controls.addEventListener('touchend', handler, {passive:false, capture:true});

  setMobileHudState();
  window.addEventListener('resize', setMobileHudState, {passive:true});
  window.addEventListener('orientationchange', setMobileHudState, {passive:true});
}

installMobileHudDomMeterRepair();
installResponsiveHelpers(historyToggle, historyPanel);
applyStatusChip(statusSource, 'external', 'Externer Hauptplayer aktiv');
applyStatusChip(statusStream, 'main', 'Main Stream aktiv');
applyStatusChip(statusMeta, 'api', 'Metadaten über API aktiv');
markSourceButtons(mainBtn, fallbackBtn, currentSource);
audio.volume = Number(volumeSlider?.value || 0.75);

const BASE_MOBILE_VOLUME = 0.86;
const MOBILE_VOLUME_FALLBACK = [0.86, 0.94, 1.0, 1.0];
const BOOST_LABELS = ['BST 0', 'BST 1', 'BST 2', 'BST 3'];

function applyMobileBoostFallback(stage) {
  const safeStage = Math.max(0, Math.min(3, Number(stage) || 0));

  // iOS/Safari kann WebAudio-Gain je nach Stream blockieren.
  // Dann bleibt wenigstens die native Lautstärke sauber auf Maximum, ohne Desktop zu stören.
  if (isMobileViewport()) {
    audio.volume = MOBILE_VOLUME_FALLBACK[safeStage];
  }

  if (streamState && isMobileViewport()) {
    streamState.textContent = BOOST_LABELS[safeStage];
  }

  document.body?.setAttribute('data-mobile-boost', String(safeStage));
  return safeStage;
}

function updateBoostDiagnosticLabel(detail = {}) {
  const stage = Number(detail.stage ?? audio?.dataset?.boostStage ?? currentBoostStage ?? 0);
  const gain = detail.gain ?? audio?.dataset?.boostGain ?? '1';
  const graph = detail.graph ?? audio?.dataset?.boostGraph ?? 'GRAPH_WAIT';
  const context = detail.context ?? audio?.dataset?.boostContext ?? 'NO_CONTEXT';

  document.body?.setAttribute('data-boost-graph', String(graph));
  document.body?.setAttribute('data-boost-stage', String(stage));

  if (streamState) {
    const shortGraph = String(graph).replace('GRAPH_', '');
    streamState.textContent = `BST ${stage} ${shortGraph}`;
    streamState.title = `Boost Diagnose: Stage ${stage}, Gain ${gain}, Graph ${graph}, AudioContext ${context}`;
    streamState.dataset.tooltip = `Boost Diagnose: Stage ${stage}, Gain ${gain}, Graph ${graph}, AudioContext ${context}`;
  }
}



function applyBoostButtons(stage) {
  currentBoostStage = Math.max(0, Math.min(3, Number(stage) || 0));

  boostButtons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.boostStage) === currentBoostStage);
  });

  boostLeds.forEach((led) => {
    const ledStage = Number(led.dataset.boostLed);
    led.classList.toggle('is-active', ledStage <= currentBoostStage);
    led.classList.toggle('is-current', ledStage === currentBoostStage);
  });
}

function setBoostStage(stage) {
  const safeStage = Math.max(0, Math.min(3, Number(stage) || 0));
  const next = visualizer.setBoostStage ? visualizer.setBoostStage(safeStage) : safeStage;
  applyMobileBoostFallback(next);
  applyBoostButtons(next);
  updateBoostDiagnosticLabel({
    stage: next,
    gain: audio?.dataset?.boostGain || '1',
    graph: audio?.dataset?.boostGraph || 'GRAPH_WAIT',
    context: audio?.dataset?.boostContext || 'NO_CONTEXT'
  });
  return next;
}

function changeBoostStage(delta) {
  return setBoostStage(currentBoostStage + Number(delta || 0));
}

function setStatus(text) {
  setText(streamState, text);
}

function lockVisualStage() {
  const targets = [document.documentElement, document.body, document.querySelector('.frame-stage'), document.querySelector('.player-shell')].filter(Boolean);
  const forbidden = ['playing','is-playing','live','is-live','active','is-active','visual-live','play-mode','is-booted'];
  targets.forEach((el) => {
    forbidden.forEach((cls) => el.classList.remove(cls));
    el.setAttribute('data-visual-mode', 'static-frame');
  });
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateTimeline() {
  const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  setText(currentTimeText, formatTime(current));
  setText(durationText, duration > 0 ? formatTime(duration) : 'LIVE');
  const progress = duration > 0 ? Math.max(0, Math.min(100, (current / duration) * 100)) : 34;
  if (timelineProgress) timelineProgress.style.width = `${progress}%`;
}

function setSource(source) {
  currentSource = source;
  audio.src = source === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;
  markSourceButtons(mainBtn, fallbackBtn, source);
  if (source === 'main') {
    applyStatusChip(statusStream, 'main', 'Main Stream aktiv');
  } else {
    applyStatusChip(statusStream, 'backup', 'Backup Stream aktiv');
  }
}

function updateHistory(title) {
  if (!title || historyItems[0] === title) return;
  historyItems.unshift(title);
  historyItems = historyItems.slice(0, 8);
  historyList.innerHTML = '';
  historyItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    historyList.appendChild(li);
  });
}


function getDefaultDjName() {
  return window.innerWidth <= 860 ? 'DJ666' : '666SOUNDsDESIGn';
}

function normalizeDjName(raw) {
  const fallback = getDefaultDjName();
  const value = String(raw || '').trim();
  if (!value) return fallback;
  const lowered = value.toLowerCase();
  if (lowered === 'no dj' || lowered === 'nodj' || lowered === 'no-dj' || lowered === '-') return fallback;
  return value;
}


function normalizeMetadataTitleV22(value) {
  let text = String(value || '').trim();
  text = text.replace(/^\s*unknown\s*title\s*[-:|–—]*\s*/i, '');
  text = text.replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '');
  text = text.replace(/^\s*loading metadata\s*[-:|–—]*\s*/i, '');
  text = text.replace(/^\s*metadata unavailable\s*[-:|–—]*\s*/i, '');
  text = text.replace(/\s{2,}/g, ' ').trim();
  text = text.replace(/^[-:|–—\s]+/, '').replace(/[-:|–—\s]+$/, '').trim();
  if (!text) return 'Live Stream';
  return text;
}

function cleanNowPlayingText(raw) {
  let value = String(raw || '').trim();
  if (!value) return 'Live Stream';

  value = value.replace(/^\s*unknown\s*title\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*666soundsdesign\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*artist\s*[-:|–—]*\s*track\s*[-:|–—]*\s*/i, '');
  value = value.replace(/\s+[-:|–—]\s+[-:|–—]\s+/g, ' - ');
  value = value.replace(/^\s*[-:|–—]+\s*/, '');
  value = value.replace(/\s{2,}/g, ' ').trim();

  if (!value || /^unknown\s*title$/i.test(value)) return 'Live Stream';
  return value;
}


function parseMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      title: 'Unknown title',
      listeners: '0 / 250',
      bitrate: 'Unknown',
      dj: getDefaultDjName()
    };
  }

  const rawTitle = payload.title || payload.now_playing || payload.song || payload.currenttrack || payload.currentSong || '';
  const rawArtist = payload.artist || payload.dj || payload.djusername || '';
  const listeners = payload.listeners || payload.currentlisteners || payload.listener_count || 0;
  const bitrate = payload.bitrate || payload.stream_bitrate || 'Unknown';
  const max = payload.maxlisteners || payload.listener_capacity || 250;
  const dj = normalizeDjName(payload.dj || payload.djusername || rawArtist || '');

  const cleanedTitle = normalizeMetadataTitleV22(cleanNowPlayingText(rawTitle));
  const cleanedArtist = cleanNowPlayingText(rawArtist);
  const finalTitle = cleanedArtist && !cleanedTitle.toLowerCase().includes(cleanedArtist.toLowerCase())
    ? `${cleanedArtist} - ${cleanedTitle}`
    : cleanedTitle;

  return {
    title: finalTitle,
    listeners: `${listeners} / ${max}`,
    bitrate: String(bitrate),
    dj
  };
}

async function fetchMetadata() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);
  try {
    const response = await fetch(`${ENDPOINTS.metadata}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error('metadata_http_error');
    const raw = await response.json();
    const data = parseMetadata(raw);
    setText(metaLine, data.title);
    setText(nowPlayingTicker, data.title);
    setText(listenersText, data.listeners);
    setText(bitrateText, data.bitrate);
    setText(djText, data.dj);
    applyStatusChip(statusMeta, 'api', 'Metadaten über API aktiv');
    updateHistory(data.title);
  } catch (err) {
    setText(metaLine, 'Metadaten gerade nicht erreichbar');
    applyStatusChip(statusMeta, 'error', 'Metadaten aktuell nicht erreichbar');
  } finally {
    window.clearTimeout(timer);
    keepControlsUnlocked();
  }
}
function startMetadataLoop() {
  window.clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = window.setInterval(fetchMetadata, POLL_MS);
}

function stopPlayback(status = 'STOPPED') {
  playRequestToken += 1;
  userStopped = true;
  audio.pause();
  audio.removeAttribute('src');
  audio.src = '';
  try { audio.load(); } catch (err) {}
  visualizer.stop?.();
  setStatus(status);
  updateTimeline();
  keepControlsUnlocked();
}


function withTimeout(promise, timeoutMs, label = 'timeout') {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(label)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

async function playAudioWithTimeout(token) {
  const playPromise = audio.play();
  await withTimeout(playPromise, PLAY_START_TIMEOUT_MS, 'audio_play_timeout');
  if (token !== playRequestToken || userStopped) {
    audio.pause();
    throw new Error('stale_play_request');
  }
}

function keepControlsUnlocked() {
  [playBtn, pauseBtn, stopBtn, reconnectBtn, mainBtn, fallbackBtn, historyToggle, volumeSlider, ...boostStepButtons, ...boostButtons].filter(Boolean).forEach((el) => {
    el.disabled = false;
    el.removeAttribute('aria-disabled');
    el.style.pointerEvents = 'auto';
  });
}

async function playCurrent() {
  keepControlsUnlocked();
  userStopped = false;
  const token = ++playRequestToken;
  const target = currentSource === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;

  setStatus(currentSource === 'main' ? 'STARTING MAIN' : 'STARTING BACKUP');
  audio.src = target;
  audio.load();

  try {
    lockVisualStage();
    await playAudioWithTimeout(token);
    if (token !== playRequestToken || userStopped) return;
    await visualizer.start?.();
    setBoostStage(currentBoostStage);
    window.setTimeout(() => {
      if (!audio.paused) {
        visualizer.start?.();
        setBoostStage(currentBoostStage);
      }
    }, 450);
    setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
    startMetadataLoop();
  } catch (err) {
    keepControlsUnlocked();
    if (token !== playRequestToken || userStopped) return;

    if (currentSource === 'main' && !switchingStream) {
      switchingStream = true;
      setSource('fallback');
      setStatus('MAIN TIMEOUT → BACKUP');
      try {
        const retryToken = ++playRequestToken;
        audio.src = ENDPOINTS.fallback;
        audio.load();
        await playAudioWithTimeout(retryToken);
        if (retryToken !== playRequestToken || userStopped) return;
        await visualizer.start?.();
        setBoostStage(currentBoostStage);
        setStatus('PLAYING BACKUP');
        startMetadataLoop();
      } catch (err2) {
        keepControlsUnlocked();
        applyStatusChip(statusStream, 'error', 'Audio-Start hängt oder Stream nicht erreichbar');
        setStatus('AUDIO TIMEOUT');
        visualizer.stop?.();
      } finally {
        switchingStream = false;
      }
    } else {
      applyStatusChip(statusStream, 'error', 'Audio-Start hängt oder Stream nicht erreichbar');
      setStatus('AUDIO TIMEOUT');
      visualizer.stop?.();
    }
  } finally {
    keepControlsUnlocked();
  }
}
async function healthPing() {
  try {
    const response = await fetch(`${ENDPOINTS.health}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('health_http_error');
    applyStatusChip(statusSource, 'external', 'Externer Hauptplayer aktiv');
  } catch (err) {
    applyStatusChip(statusSource, 'error', 'Externer Hauptplayer meldet Fehler');
  }
}

playBtn?.addEventListener('click', async () => { await playCurrent(); });
pauseBtn?.addEventListener('click', () => {
  playRequestToken += 1;
  audio.pause();
  lockVisualStage();
  visualizer.stop?.();
  setStatus('PAUSED');
  keepControlsUnlocked();
});
stopBtn?.addEventListener('click', () => {
  userStopped = true;
  lockVisualStage();
  visualizer.stop?.();
  stopPlayback('STOPPED');
});
reconnectBtn?.addEventListener('click', async () => {
  stopPlayback('RECONNECT');
  userStopped = false;
  await playCurrent();
});
mainBtn?.addEventListener('click', async () => {
  setSource('main');
  if (!userStopped) await playCurrent();
});
fallbackBtn?.addEventListener('click', async () => {
  setSource('fallback');
  if (!userStopped) await playCurrent();
});

boostStepButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    changeBoostStage(Number(btn.dataset.boostStep || 0));
  });
});

volumeSlider?.addEventListener('input', () => {
  audio.volume = Number(volumeSlider.value);
});
audio?.addEventListener('error', async () => {
  if (userStopped) return;
  if (currentSource === 'main') {
    setSource('fallback');
    await playCurrent();
  } else {
    applyStatusChip(statusStream, 'error', 'Streamfehler auf Main und Backup');
    setStatus('STREAM ERROR');
  }
});
audio?.addEventListener('playing', async () => {
  lockVisualStage();
  await visualizer.start?.();
  setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
});
audio?.addEventListener('timeupdate', updateTimeline);
audio?.addEventListener('loadedmetadata', updateTimeline);

lockVisualStage();
healthPing();
fetchMetadata();
startMetadataLoop();
updateTimeline();


audio?.addEventListener('pause', () => {
  if (!userStopped) {
    visualizer.stop?.();
  }
});

audio?.addEventListener('ended', () => {
  visualizer.stop?.();
  setStatus('STOPPED');
});


// v34.4 CONTROL UNLOCK WATCHDOG: egal ob Stream/API hängt, die UI bleibt bedienbar.
window.setInterval(keepControlsUnlocked, 1500);
window.addEventListener('pageshow', keepControlsUnlocked);
window.addEventListener('focus', keepControlsUnlocked);
