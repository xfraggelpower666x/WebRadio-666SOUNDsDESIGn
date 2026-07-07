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
import { setText, markSourceButtons } from './controls.js?v=smfp-v177-version-core-20260519';
import { createBars, startVisualizer } from './equalizer.js?v=2026-06-19-repair2';
import { installResponsiveHelpers } from './responsive-ui.js?v=smfp-v177-version-core-20260519';
import { applyStatusChip } from './shared-status.js?v=smfp-v177-version-core-20260519';

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
const nowCover = document.getElementById('nowCover');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const leftMeters = [document.getElementById('leftMeterA'), document.getElementById('leftMeterB'), document.getElementById('leftMeterC')].filter(Boolean);
const rightMeters = [document.getElementById('rightMeterA'), document.getElementById('rightMeterB'), document.getElementById('rightMeterC')].filter(Boolean);
const bottomMeterSegments = Array.from(document.querySelectorAll('[data-bottom-meter-seg]'));
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const reconnectBtn = document.getElementById('reconnectBtn');
const mainBtn = document.getElementById('mainBtn');
const fallbackBtn = document.getElementById('fallbackBtn');
const statusStream = document.getElementById('statusStream');
const statusMeta = document.getElementById('statusMeta');
const statusSource = document.getElementById('statusSource');
const statusMain = document.getElementById('mainBtn');
const statusBackup = document.getElementById('fallbackBtn');
const volumeSlider = document.getElementById('volumeSlider');
const boostButtons = Array.from(document.querySelectorAll('[data-boost-stage]'));
const boostStepButtons = Array.from(document.querySelectorAll('[data-boost-step]'));
const boostLeds = Array.from(document.querySelectorAll('[data-boost-led]'));
let currentBoostStage = window.SMFPBoostCore ? window.SMFPBoostCore.loadStage() : 0;
const timelineProgress = document.getElementById('timelineProgress');
const currentTimeText = document.getElementById('currentTimeText');
const durationText = document.getElementById('durationText');

let currentSource = 'main';
let userStopped = false;
let audioSelfHealStopAt = 0;
let audioSelfHealDirtyReason = '';
let audioSelfHealLastResetAt = 0;
let metadataTimer = 0;
let historyItems = [];
let playRequestToken = 0;
let switchingStream = false;
const PLAY_START_TIMEOUT_MS = 6500;
const METADATA_TIMEOUT_MS = 4500;
const isMobileViewport = () => window.innerWidth <= 860;
const IDLE_TICKER_TEXT_V113 = '666SOUNDsDESIGn WebRadio';
const LIVE_TICKER_LOADING_TEXT_V113 = 'Loading live metadata ...';

function isDesktopTransportLiveV114() {
  try {
    if (userStopped) return false;
    const bodyState = document.body?.getAttribute('data-player-state') || '';
    const rootState = document.documentElement?.getAttribute('data-player-state') || '';
    if (bodyState === 'playing' || rootState === 'playing' || document.body?.classList.contains('is-playing')) return true;
    return !!(audio && !audio.paused && !audio.ended && (audio.currentSrc || audio.getAttribute('src')));
  } catch (err) {
    return false;
  }
}

const bars = createBars(document.getElementById('eqBars'), window.innerWidth <= 860 ? 20 : 28);
const visualizer = startVisualizer({ audio, bars, leftMeters, rightMeters, bottomMeterSegments });

/*
==========================================
GEÄNDERT: 2026-05-10
ÄNDERUNG: v109 PLAYER_AUDIO_SELFHEAL_MINIMAL
ZWECK:
- Stop→Play-Artefakte vermeiden, indem der MediaElement-Pfad vor erneutem Play sauber vorbereitet wird.
- iPhone/Systemsound-Unterbrechungen als unterbrochenen Play-Zustand behandeln, nicht als echten User-Stop.
- Kein neuer Timer, kein neuer Visualizer, kein Layout-Eingriff.
==========================================
*/
function markAudioSelfHealDirty(reason) {
  audioSelfHealDirtyReason = reason || 'dirty';
  try { document.documentElement.setAttribute('data-audio-selfheal-dirty', audioSelfHealDirtyReason); } catch (err) {}
}

function resumeKnownAudioContexts() {
  ['__radioAudioContext', '__mffAudioContext'].forEach((key) => {
    try {
      const ctx = window[key];
      if (ctx && ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (err) {}
  });
}

function prepareAudioElementForFreshPlay(target, reason = 'play') {
  if (!audio) return;
  const now = Date.now();
  const stopAge = audioSelfHealStopAt ? now - audioSelfHealStopAt : 0;
  const shouldHardReset = Boolean(audioSelfHealDirtyReason) || stopAge > 1500 || !audio.currentSrc || audio.getAttribute('src') !== target;

  resumeKnownAudioContexts();

  if (!shouldHardReset) return;
  if (now - audioSelfHealLastResetAt < 700 && audio.getAttribute('src') === target) return;
  audioSelfHealLastResetAt = now;

  try { visualizer.stop?.(); } catch (err) {}
  try { audio.pause(); } catch (err) {}
  try { audio.removeAttribute('src'); } catch (err) {}
  try { audio.load(); } catch (err) {}
  try { audio.src = target; } catch (err) {}
  try { audio.load(); } catch (err) {}

  audioSelfHealDirtyReason = '';
  try {
    document.documentElement.setAttribute('data-audio-selfheal-last', reason);
    document.documentElement.removeAttribute('data-audio-selfheal-dirty');
  } catch (err) {}
}

function recoverInterruptedAudio(reason = 'interrupted') {
  /* v109: this recovery is only allowed on mobile/iOS. On desktop it caused Play/Stop loops. */
  if (!isMobileViewport()) return;
  if (!audio || userStopped) return;
  const state = String(document.body.getAttribute('data-player-state') || document.documentElement.getAttribute('data-mff-transport') || '').toLowerCase();
  const expectedPlay = state.includes('play') || (!audio.paused && !!(audio.currentSrc || audio.src));
  if (!expectedPlay) return;
  markAudioSelfHealDirty(reason);
  const target = currentSource === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;
  prepareAudioElementForFreshPlay(target, reason);
  const p = audio.play?.();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

audio?.addEventListener('boost-diagnostic', (event) => updateBoostDiagnosticLabel(event.detail || {}));

/* AUDIT_REPAIR_v1.1.0:
 * Five unreferenced, immediate-return legacy mobile generator stubs were removed here.
 * The active mobile player is provided by the existing mff/phase10 systems; no call sites existed.
 */
installResponsiveHelpers(historyToggle, historyPanel);

function installV95DesktopHistoryRepair() {
  if (!historyToggle || !historyPanel) return;
  if (!historyPanel.querySelector('[data-history-close]')) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'history-overlay-close';
    close.setAttribute('data-history-close', '1');
    close.setAttribute('aria-label', 'Close history');
    close.textContent = '×';
    historyPanel.insertBefore(close, historyPanel.firstChild);
  }
  historyPanel.setAttribute('role', 'dialog');
  historyPanel.setAttribute('aria-modal', 'true');
  historyPanel.setAttribute('aria-label', 'Played history');
  historyPanel.addEventListener('click', (event) => {
    if (event.target?.closest?.('[data-history-close]')) {
      event.preventDefault();
      event.stopPropagation();
      historyPanel.classList.add('hidden');
      document.getElementById('historyOverlayBackdrop')?.classList.add('hidden');
      document.body.classList.remove('history-overlay-open');
      document.documentElement.classList.remove('history-overlay-open');
    }
  }, true);
}
installV95DesktopHistoryRepair();
applyStatusChip(statusSource, 'ok', 'Quelle aktiv');
applyStatusChip(statusStream, 'ok', 'Stream aktiv');
applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');
updateStreamPanelLeds(currentSource);
markSourceButtons(mainBtn, fallbackBtn, currentSource);
if (audio) audio.volume = Number(volumeSlider?.value || 0.75);

const BASE_MOBILE_VOLUME = 0.86;
const MOBILE_VOLUME_FALLBACK = [0.86, 0.94, 1.0, 1.0, 1.0, 1.0];
const BOOST_LABELS = (window.SMFPBoostCore && window.SMFPBoostCore.stages) ? window.SMFPBoostCore.stages.map((stage) => stage.label) : ['BST 0', 'BST 1', 'BST 2', 'BST 3', 'BST 4', 'BST 5'];

function applyMobileBoostFallback(stage) {
  const safeStage = window.SMFPBoostCore ? window.SMFPBoostCore.clampStage(stage) : Math.max(0, Math.min(5, Number(stage) || 0));

  // iOS/Safari kann WebAudio-Gain je nach Stream blockieren.
  // Dann bleibt wenigstens die native Lautstärke sauber auf Maximum, ohne Desktop zu stören.
  if (isMobileViewport()) {
    if (audio) audio.volume = Number.isFinite(MOBILE_VOLUME_FALLBACK[safeStage]) ? MOBILE_VOLUME_FALLBACK[safeStage] : 1.0;
  }

  if (streamState && isMobileViewport()) {
    streamState.textContent = BOOST_LABELS[safeStage] || ('BST ' + safeStage);
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
  currentBoostStage = window.SMFPBoostCore ? window.SMFPBoostCore.clampStage(stage) : Math.max(0, Math.min(5, Number(stage) || 0));

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
  const safeStage = window.SMFPBoostCore ? window.SMFPBoostCore.clampStage(stage) : Math.max(0, Math.min(5, Number(stage) || 0));
  const next = visualizer.setBoostStage ? visualizer.setBoostStage(safeStage) : safeStage;
  applyMobileBoostFallback(next);
  applyBoostButtons(next);
  try { if (window.SMFPBoostCore) { window.SMFPBoostCore.saveStage(next); window.SMFPBoostCore.publish(next, Number(audio?.dataset?.boostGain || window.SMFPBoostCore.getGain(next)), 'player-core'); } } catch (err) {}
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

window.SMFPPlayerBoost = {
  getStage: () => currentBoostStage,
  setStage: (stage) => setBoostStage(stage),
  changeStage: (delta) => changeBoostStage(delta)
};
document.addEventListener('s666:sound-boost', (event) => {
  setBoostStage(event.detail?.stage || 0);
});
setBoostStage(0);


function updateStreamPanelLeds(source) {
  const active = source === 'fallback' || source === 'backup' ? 'backup' : 'main';
  if (active === 'main') {
    applyStatusChip(statusMain, 'ok', 'Main stream active');
    applyStatusChip(statusBackup, 'empty', 'Backup stream inactive');
  } else {
    applyStatusChip(statusMain, 'empty', 'Main stream inactive');
    applyStatusChip(statusBackup, 'ok', 'Backup stream active');
  }
}



function setActivePanelLeds() {
  applyStatusChip(statusStream, 'ok', 'Stream aktiv');
  applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');
  applyStatusChip(statusSource, 'ok', 'Quelle aktiv');
  updateStreamPanelLeds(currentSource);
}

function setStoppedPanelLeds() {
  applyStatusChip(statusStream, 'stopped', 'Stream gestoppt');
  applyStatusChip(statusMeta, 'warn', 'Metadaten gestoppt');
  applyStatusChip(statusSource, 'warn', 'Quelle gestoppt');

  if (currentSource === 'fallback' || currentSource === 'backup') {
    applyStatusChip(statusMain, 'empty', 'Main stream inactive');
    applyStatusChip(statusBackup, 'stopped', 'Backup stream selected but stopped');
  } else {
    applyStatusChip(statusMain, 'stopped', 'Main stream selected but stopped');
    applyStatusChip(statusBackup, 'empty', 'Backup stream inactive');
  }
}

function syncStreamLedFromStatus(text) {
  const value = String(text || '').toLowerCase();
  if (value.includes('error') || value.includes('fehler') || value.includes('timeout')) {
    applyStatusChip(statusStream, 'warn', 'Stream Fehler');
  } else if (value.includes('stopped') || value.includes('stop') || value.includes('pause')) {
    applyStatusChip(statusStream, 'stopped', 'Stream nicht aktiv');
  } else {
    applyStatusChip(statusStream, 'ok', 'Stream aktiv');
  }
}

function setStatus(text) {
  setText(streamState, text);
  syncStreamLedFromStatus(text);
}

function setDesktopTransportState(state) {
  const normalized = state === 'play' || state === 'pause' || state === 'stop' ? state : 'stop';
  [playBtn, pauseBtn, stopBtn].filter(Boolean).forEach((btn) => {
    const id = btn.id || '';
    const active =
      (normalized === 'play' && id === 'playBtn') ||
      (normalized === 'pause' && id === 'pauseBtn') ||
      (normalized === 'stop' && id === 'stopBtn');
    btn.classList.toggle('is-active', active);
    btn.classList.toggle('transport-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.body?.setAttribute('data-transport-state', normalized);
  document.documentElement?.setAttribute('data-transport-state', normalized);
  try {
    document.body?.classList.toggle('is-stopped', normalized === 'stop');
    document.body?.classList.toggle('is-paused', normalized === 'pause');
    document.body?.classList.toggle('is-playing', normalized === 'play');
    document.body?.setAttribute('data-player-state', normalized === 'play' ? 'playing' : (normalized === 'pause' ? 'paused' : 'stopped'));
    document.documentElement?.setAttribute('data-player-state', normalized === 'play' ? 'playing' : (normalized === 'pause' ? 'paused' : 'stopped'));
  } catch (err) {}
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
    applyStatusChip(statusStream, 'ok', 'Stream aktiv');
  } else {
    applyStatusChip(statusStream, 'ok', 'Backup Stream aktiv');
  }
  if (userStopped) {
    setStoppedPanelLeds();
  } else {
    updateStreamPanelLeds(source);
  }
}


function isLoadingMetaText(text) {
  return String(text || '').toLowerCase().includes('metadaten werden geladen');
}

let lastAppliedCoverUrlV105 = '';
  let streamDefaultArtV106 = '';
  let coverFadeTimerV106 = 0;
  function updateNowCover(meta) {
    if (!nowCover) return;
    const FALLBACK = '/assets/logos/radiobot-ai-badge.png';
    const raw = String(meta?.cover || '').trim();
    const cover = raw || FALLBACK;

    // Capture station default art once (first valid non-fallback URL)
    if (!streamDefaultArtV106 && raw && !raw.includes('fallback')) {
      streamDefaultArtV106 = raw;
    }

    // v106: guard — skip if cover truly unchanged
    if (cover === lastAppliedCoverUrlV105 && nowCover.getAttribute('src') === cover) return;
    lastAppliedCoverUrlV105 = cover;

    // v106: smooth crossfade — fade out → swap src → fade in (no zapping)
    clearTimeout(coverFadeTimerV106);
    nowCover.style.transition = 'opacity 0.55s ease';
    nowCover.style.opacity = '0';
    coverFadeTimerV106 = setTimeout(() => {
      nowCover.src = cover;
      nowCover.onerror = () => { nowCover.src = FALLBACK; nowCover.onerror = null; nowCover.style.opacity = '1'; };
      nowCover.onload  = () => { nowCover.style.opacity = '1'; nowCover.onload = null; };
      setTimeout(() => { nowCover.style.opacity = '1'; }, 140); // safety for cached images
    }, 560);
  }

function normalizeNowPlayingDuplicateFallback() {
  if (!nowPlayingTicker || !metaLine) return;
  if (isLoadingMetaText(nowPlayingTicker.textContent) && isLoadingMetaText(metaLine.textContent)) {
    nowPlayingTicker.textContent = '';
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
  return 'LYVRA DJ';
}

function normalizeDjName(raw) {
  const fallback = 'LYVRA DJ';
  const value = String(raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!value) return fallback;
  const lowered = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!lowered || [
    'no dj', 'nodj', 'no dj status', 'unknown', 'offline', 'none', 'null', 'undefined',
    'n a', 'na', 'dj 666', '666 dj', '666soundsdesign dj', '666 sounds design dj', 'lyvra dj'
  ].includes(lowered) || lowered.includes('auto dj') || lowered.includes('autodj')) return fallback;
  return value;
}

function normalizeMetadataTitleV22(value) {
  let text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/^\s*(?:unknown title|no dj|loading metadata|metadaten werden geladen|metadata unavailable)\s*(?:[-:|–—·•]+\s*)*/i, '')
    .replace(/(?:\s*[-–—|·•]\s*){2,}/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-:|–—·•]+\s*|\s*[-:|–—·•]+\s*$/g, '')
    .trim();
  text = text.replace(/666\s*sounds?\s*design/ig, '666SOUNDsDESIGn').replace(/\blyvra\b/ig, 'LYVRA');
  const segments = text.split(/\s+(?:-|–|—|\||·|•)\s+/).map(part => part.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const segment of segments) {
    const key = segment.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(segment);
  }
  return unique.length ? unique.join(' - ') : text;
}

function cleanNowPlayingText(raw) {
  return normalizeMetadataTitleV22(raw);
}

function hasBroadcastIdentityV123(value) {
  return /(?:fraggle(?:\s*power)?(?:\s*666)?|fraggel(?:\s*power)?(?:\s*666)?|666\s*sounds?\s*design|666soundsdesign|666\s*sound\s*system|666soundsystem|l\.?\s*y\.?\s*v\.?\s*r\.?\s*a\.?|\blyvra\b)/i.test(String(value || ''));
}

function normalizeBroadcastDisplayTitleV123(rawTitle, rawArtist = '') {
  const prefix = 'LYVRA is alive · 666SOUNDsDESIGn · ';
  const title = normalizeMetadataTitleV22(rawTitle);
  if (!title) return '';
  const artist = normalizeMetadataTitleV22(rawArtist);
  let candidate = title;
  if (artist && hasBroadcastIdentityV123(artist) && !title.toLowerCase().includes(artist.toLowerCase())) {
    candidate = normalizeMetadataTitleV22(`${artist} - ${title}`);
  }
  return hasBroadcastIdentityV123(candidate) ? candidate : `${prefix}${candidate}`;
}

function setDesktopTickerIdleV113() {
  setText(nowPlayingTicker, IDLE_TICKER_TEXT_V113);
  setText(metaLine, IDLE_TICKER_TEXT_V113);
  try { document.documentElement.setAttribute('data-ticker-state', 'idle'); } catch (err) {}
}

function setDesktopTickerLoadingV113() {
  setText(nowPlayingTicker, LIVE_TICKER_LOADING_TEXT_V113);
  setText(metaLine, LIVE_TICKER_LOADING_TEXT_V113);
  try { document.documentElement.setAttribute('data-ticker-state', 'live-loading'); } catch (err) {}
}

function setDesktopTickerLiveV113(title) {
  const text = normalizeMetadataTitleV22(title);
  if (!text) return;
  setText(nowPlayingTicker, text);
  setText(metaLine, text);
  try { document.documentElement.setAttribute('data-ticker-state', 'live'); } catch (err) {}
}

function firstMetadataText(...values) {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) return text;
    }
    if (value && typeof value === 'object') {
      const nested = value.display_title ?? value.normalized_title ?? value.text ?? value.title ?? value.name ?? value.songtitle ?? value.song ?? value.current ?? value.now_playing ?? value.nowPlaying;
      if (nested !== value) {
        const text = firstMetadataText(nested);
        if (text) return text;
      }
    }
  }
  return '';
}

function coverCandidateToUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = coverCandidateToUrl(item);
      if (found) return found;
    }
  }
  if (typeof value === 'object') {
    return coverCandidateToUrl(value.url || value.src || value.href || value.image || value.cover || value.art || value.artwork);
  }
  return '';
}

function extractCoverUrl(payload) {
  const song = payload?.now_playing?.song || payload?.song || payload?.current_song || payload?.currentSong || payload?.track || {};
  const candidates = [
    payload?.cover,
    payload?.cover_url,
    payload?.coverUrl,
    payload?.art,
    payload?.album_art,
    payload?.albumArt,
    payload?.artwork,
    payload?.artwork_url,
    payload?.artworkUrl,
    payload?.image,
    payload?.image_url,
    payload?.imageUrl,
    payload?.picture,
    payload?.thumbnail,
    payload?.station?.image,
    payload?.station?.logo,
    payload?.live?.art,
    payload?.live?.image,
    payload?.now_playing?.cover,
    payload?.now_playing?.image,
    payload?.now_playing?.art,
    payload?.now_playing?.artwork,
    song?.art,
    song?.album_art,
    song?.albumArt,
    song?.cover,
    song?.image,
    song?.artwork,
    song?.thumbnail
  ];

  for (const candidate of candidates) {
    const url = coverCandidateToUrl(candidate);
    if (url) return url;
  }
  return '';
}

function parseMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      title: '',
      listeners: '0 / 250',
      bitrate: 'Unknown',
      dj: getDefaultDjName(),
      cover: ''
    };
  }

  const song = payload?.now_playing?.song || payload?.song || payload?.current_song || payload?.currentSong || payload?.track || {};
  const servedTitle = firstMetadataText(payload.display_title, payload.normalized_title, payload.title_display);
  const rawTitle = firstMetadataText(
    payload.title,
    payload.current_title,
    payload.currentTitle,
    payload.nowplaying,
    payload.nowPlaying,
    payload.currenttrack,
    payload.currentTrack,
    payload.currentSong,
    payload.current_song,
    payload.songtitle,
    payload.song,
    payload.track,
    payload.stream_title,
    payload.streamTitle,
    song.title,
    song.text,
    song.name,
    song.songtitle
  );
  const rawArtist = firstMetadataText(payload.artist, song.artist, song.artist_name);

  const listeners = payload.listeners || payload.currentlisteners || payload.currentListeners || payload.listener_count || 0;
  const bitrate = payload.bitrate || payload.stream_bitrate || payload.streamBitrate || 'Unknown';
  const max = payload.maxlisteners || payload.maxListeners || payload.listener_capacity || 250;
  const rawDj = firstMetadataText(
    payload.dj_display, payload.dj, payload.djusername, payload.djstatus, payload.presenter,
    payload.live_dj, payload.streamer, payload.client,
    payload.live?.streamer_name, payload.live?.streamer, payload.live?.name
  );
  const dj = normalizeDjName(rawDj);
  const finalTitle = servedTitle
    ? normalizeMetadataTitleV22(servedTitle)
    : normalizeBroadcastDisplayTitleV123(rawTitle, rawArtist);

  return {
    title: finalTitle,
    listeners: `${listeners} / ${max}`,
    bitrate: String(bitrate),
    dj,
    cover: extractCoverUrl(payload)
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
    if (userStopped) {
      setStoppedPanelLeds();
      setDesktopTickerIdleV113();
      return;
    }
    updateNowCover(data);
    setDesktopTickerLiveV113(data.title || '');
    setText(listenersText, data.listeners);
    setText(bitrateText, data.bitrate);
    setText(djText, data.dj);
    applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');
updateHistory(data.title);
    normalizeNowPlayingDuplicateFallback();
  } catch (err) {
    const fallbackTitle = (nowPlayingTicker?.textContent || metaLine?.textContent || '').trim();
    if (fallbackTitle && !/metadata|metadaten|loading|laden|error|fehler/i.test(fallbackTitle)) {
      if (!userStopped) setDesktopTickerLiveV113(fallbackTitle);
    }
    applyStatusChip(statusMeta, 'warn', 'Metadaten aktuell nicht erreichbar');
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
  try {
    document.body?.classList.remove('is-playing','is-paused');
    document.body?.classList.add('is-stopped');
    document.body?.setAttribute('data-player-state','stopped');
    document.documentElement?.setAttribute('data-player-state','stopped');
  } catch (err) {}
  audioSelfHealStopAt = Date.now();
  markAudioSelfHealDirty('user-stop');
  audio.pause();
  audio.removeAttribute('src');
  audio.src = '';
  try { audio.load(); } catch (err) {}
  visualizer.stop?.();
  window.clearInterval(metadataTimer);
  setStatus(status);
  setDesktopTransportState('stop');
  setStoppedPanelLeds();
  setDesktopTickerIdleV113();
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
  try {
    document.body?.classList.remove('is-stopped','is-paused');
    document.body?.classList.add('is-playing');
    document.body?.setAttribute('data-player-state','playing');
    document.documentElement?.setAttribute('data-player-state','playing');
  } catch (err) {}
  const token = ++playRequestToken;
  setDesktopTickerLoadingV113();
  const target = currentSource === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;

  setStatus(currentSource === 'main' ? 'STARTING MAIN' : 'STARTING BACKUP');
  setActivePanelLeds();
  prepareAudioElementForFreshPlay(target, audioSelfHealStopAt ? 'stop-to-play' : 'fresh-play');
  if (audio.getAttribute('src') !== target) audio.src = target;
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
    setDesktopTransportState('play');
    setActivePanelLeds();
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
        prepareAudioElementForFreshPlay(ENDPOINTS.fallback, 'main-to-backup-retry');
        if (audio.getAttribute('src') !== ENDPOINTS.fallback) audio.src = ENDPOINTS.fallback;
        audio.load();
        await playAudioWithTimeout(retryToken);
        if (retryToken !== playRequestToken || userStopped) return;
        await visualizer.start?.();
        setBoostStage(currentBoostStage);
        setStatus('PLAYING BACKUP');
        setDesktopTransportState('play');
        setActivePanelLeds();
        startMetadataLoop();
      } catch (err2) {
        keepControlsUnlocked();
        applyStatusChip(statusStream, 'warn', 'Audio-Start hängt oder Stream nicht erreichbar');
        setStatus('AUDIO TIMEOUT');
        visualizer.stop?.();
      } finally {
        switchingStream = false;
      }
    } else {
      applyStatusChip(statusStream, 'warn', 'Audio-Start hängt oder Stream nicht erreichbar');
      setStatus('AUDIO TIMEOUT');
      visualizer.stop?.();
    }
  } finally {
    keepControlsUnlocked();
  }
}
async function healthPing() {
  if (userStopped) {
    setStoppedPanelLeds();
    return;
  }
  try {
    const response = await fetch(`${ENDPOINTS.health}?t=${Date.now()}`, { cache: 'no-store' });
    await response.text().catch(() => {}); // v107: Body auslesen, sonst hängt der Tab-Ladekreis ewig
    if (!response.ok) throw new Error('health_http_error');
    applyStatusChip(statusSource, 'ok', 'Quelle aktiv');
  } catch (err) {
    applyStatusChip(statusSource, 'warn', 'Externer Hauptplayer meldet Fehler');
  }
}

setDesktopTickerIdleV113();
try {
  document.body?.classList.add('is-stopped');
  document.body?.setAttribute('data-player-state','stopped');
  document.documentElement?.setAttribute('data-player-state','stopped');
} catch (err) {}
playBtn?.addEventListener('click', async () => { await playCurrent(); });
pauseBtn?.addEventListener('click', () => {
  // v112: Pause is a real network break, same as Stop, but keeps PAUSED state.
  // Reason: mobile data users must not keep consuming stream data silently.
  playRequestToken += 1;
  userStopped = true;
  audioSelfHealStopAt = Date.now();
  markAudioSelfHealDirty('user-pause');
  try {
    document.body?.classList.remove('is-playing','is-stopped');
    document.body?.classList.add('is-paused');
    document.body?.setAttribute('data-player-state','paused');
    document.documentElement?.setAttribute('data-player-state','paused');
  } catch (err) {}
  try { audio.pause(); } catch (err) {}
  try { audio.removeAttribute('src'); } catch (err) {}
  try { audio.src = ''; } catch (err) {}
  try { audio.load(); } catch (err) {}
  window.clearInterval(metadataTimer);
  lockVisualStage();
  visualizer.stop?.();
  setStatus('PAUSED');
  setDesktopTickerIdleV113();
  setDesktopTransportState('pause');
  setStoppedPanelLeds();
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
  if (audio) audio.volume = Number(volumeSlider.value);
});
audio?.addEventListener('error', async () => {
  if (userStopped) return;
  if (currentSource === 'main') {
    setSource('fallback');
    await playCurrent();
  } else {
    applyStatusChip(statusStream, 'warn', 'Streamfehler auf Main und Backup');
    setStatus('STREAM ERROR');
  }
});
audio?.addEventListener('playing', async () => {
  lockVisualStage();
  await visualizer.start?.();
  setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
  setDesktopTransportState('play');
  setActivePanelLeds();
});
audio?.addEventListener('timeupdate', updateTimeline);
audio?.addEventListener('loadedmetadata', updateTimeline);

lockVisualStage();
healthPing();
fetchMetadata();
startMetadataLoop();
updateTimeline();
setDesktopTransportState('stop');


audio?.addEventListener('pause', () => {
  if (!userStopped) {
    visualizer.stop?.();
    markAudioSelfHealDirty('unexpected-pause');
  }
});

audio?.addEventListener('stalled', () => { markAudioSelfHealDirty('stalled'); setTimeout(() => recoverInterruptedAudio('stalled'), 350); });
audio?.addEventListener('suspend', () => { markAudioSelfHealDirty('suspend'); setTimeout(() => recoverInterruptedAudio('suspend'), 350); });
window.addEventListener('focus', () => setTimeout(() => recoverInterruptedAudio('focus'), 220), { passive: true });
window.addEventListener('pageshow', () => setTimeout(() => recoverInterruptedAudio('pageshow'), 220), { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => recoverInterruptedAudio('visibility'), 220); });

audio?.addEventListener('ended', () => {
  visualizer.stop?.();
  setStatus('STOPPED');
  setDesktopTransportState('stop');
});


// v34.4 CONTROL UNLOCK WATCHDOG: egal ob Stream/API hängt, die UI bleibt bedienbar.
window.setInterval(keepControlsUnlocked, 1500);
window.addEventListener('pageshow', keepControlsUnlocked);
window.addEventListener('focus', keepControlsUnlocked);

/* MOBILE_RUNTIME_CACHE_BUST_PROOF_v1 */
try {
  document.documentElement.setAttribute('data-player-core-runtime-proof','mobile-runtime-cache-bust-proof-v1-20260426');
  console.info('[666SOUNDsDESIGn] player-core runtime proof:', 'mobile-runtime-cache-bust-proof-v1-20260426');
} catch (err) {}


// ==========================================================
// 666SOUNDsDESIGn — v77 PC Boost Meta Glow Ticker Fix
// Zweck:
// - PC-Boost ruft echte vorhandene setBoostStage/changeBoostStage Logik auf.
// - PC-Ticker übernimmt robuste Mobile-Logik: aus metaLine/title/nowPlaying/lastGood synchronisieren.
// - Metadata/Ticker bleiben bei Fetch-Ausfall auf letzter gültiger Anzeige.
// ==========================================================
(function installV77PcBoostMetaGlowTickerFix(){
  if(window.__v77PcBoostMetaGlowTickerFixInstalled)return;window.__v77PcBoostMetaGlowTickerFixInstalled=true;
  const qs=id=>document.getElementById(id);let lastAudioTime=0,lastAudioMoveAt=Date.now(),lastRecoverAt=0,lastGoodMeta='',lastMetaOkAt=0;
  function clamp(v){return window.SMFPBoostCore?window.SMFPBoostCore.clampStage(v):(Number.isFinite(Number(v))?Math.max(0,Math.min(5,Math.round(Number(v)))):0)}
  function level(){const raw=window.__boostLevel??document.body.getAttribute('data-boost-level')??document.documentElement.style.getPropertyValue('--boost-level')??0;return clamp(String(raw).replace(/[^\d.-]/g,''))}
  function mirror(lv){const safe=clamp(lv);window.__boostLevel=safe;document.body.setAttribute('data-boost-level',String(safe));document.body.setAttribute('data-mobile-boost',String(safe));document.documentElement.style.setProperty('--boost-level',String(safe));document.documentElement.style.setProperty('--player-boost-level',String(safe));const gain=window.SMFPBoostCore?window.SMFPBoostCore.getGain(safe):(1+(safe*.10));document.documentElement.style.setProperty('--player-boost-gain',gain.toFixed(2));const label=qs('pcBoostLabel');if(label)(label.querySelector('.status-code')||label).textContent='BST '+safe;try{if(window.SMFPBoostCore){window.SMFPBoostCore.saveStage(safe);window.SMFPBoostCore.publish(safe,gain,'player-core-v77');}}catch(e){}window.dispatchEvent(new CustomEvent('playerboostchange',{detail:{level:safe,gain}}));return safe}
  function applyBoost(lv){const safe=clamp(lv);let applied=safe;try{if(typeof setBoostStage==='function'){const r=setBoostStage(safe);applied=clamp(typeof r==='number'?r:safe)}else if(typeof changeBoostStage==='function'){const r=changeBoostStage(safe-level());applied=clamp(typeof r==='number'?r:safe)}}catch(err){document.body.setAttribute('data-boost-error',String(err&&err.message||err))}mirror(applied);syncPanel()}
  function boostControls(){const minus=qs('pcBoostMinus'),plus=qs('pcBoostPlus');if(minus&&!minus.__v77BoostBound){minus.__v77BoostBound=true;minus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();applyBoost(level()-1);},true)}if(plus&&!plus.__v77BoostBound){plus.__v77BoostBound=true;plus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();applyBoost(level()+1);},true)}}
  function audioEl(){return document.querySelector('audio')}
  function setLed(el,state,active){if(!el)return;el.classList.remove('state-main','state-api','state-external','state-backup','state-off','is-active','is-idle','is-error','state-error');el.classList.add(state||'state-off');if(active)el.classList.add('is-active')}
  function backupActive(){const fb=qs('fallbackBtn'),mb=qs('mainBtn');if(fb&&(fb.classList.contains('is-active')||fb.getAttribute('aria-pressed')==='true'))return true;if(mb&&(mb.classList.contains('is-active')||mb.getAttribute('aria-pressed')==='true'))return false;return /back|backup|fallback/i.test(document.body.getAttribute('data-source')||document.body.getAttribute('data-stream-source')||'')}
  function valid(t){const v=String(t||'').trim();return v&&!/metadata|metadaten|loading|laden|error|fehler/i.test(v)?v:''}
  function readMetaLikeMobile(){const ids=['metaLine','nowPlayingTicker','nowTitle','trackTitle','currentTitle','songTitle'];for(const id of ids){const el=qs(id);const v=valid(el&&el.textContent);if(v)return v}const dataTitle=document.body.getAttribute('data-current-title')||document.body.getAttribute('data-now-playing')||'';return valid(dataTitle)}
  function syncTicker(){const ticker=qs('nowPlayingTicker');const metaLine=qs('metaLine');if(!ticker)return;if(!isDesktopTransportLiveV114()){lastGoodMeta='';const idle='666SOUNDsDESIGn WebRadio';if(ticker.textContent.trim()!==idle){ticker.textContent=idle;ticker.setAttribute('data-ticker-live','false')}if(metaLine&&metaLine.textContent.trim()!==idle)metaLine.textContent=idle;return}const visible=readMetaLikeMobile();if(visible){lastGoodMeta=visible;lastMetaOkAt=Date.now()}const text=visible||lastGoodMeta||'666SOUNDsDESIGn WebRadio';if(ticker.textContent.trim()!==text){ticker.textContent=text;ticker.setAttribute('data-ticker-live','true')}if(metaLine&&lastGoodMeta&&!valid(metaLine.textContent))metaLine.textContent=lastGoodMeta}
  function syncPanel(){const a=audioEl();const playing=!!a&&!a.paused&&!document.body.classList.contains('is-stopped')&&document.body.getAttribute('data-player-state')!=='stopped';setLed(qs('statusStream'),playing?'state-main':'state-off',playing);setLed(qs('statusSource'),playing?'state-external':'state-off',playing);const metaFresh=lastMetaOkAt&&(Date.now()-lastMetaOkAt<45000);setLed(qs('statusMeta'),metaFresh?'state-api':(playing?'state-error':'state-off'),!!metaFresh);const b=backupActive();setLed(qs('mainBtn'),(!b&&playing)?'state-main':'state-off',!b&&playing);setLed(qs('fallbackBtn'),(b&&playing)?'state-backup':'state-off',b&&playing);const active=level()>0;setLed(qs('pcBoostMinus'),active?'state-api':'state-off',active);setLed(qs('pcBoostPlus'),active?'state-api':'state-off',active);setLed(qs('pcBoostLabel'),active?'state-api':'state-off',active)}
  function installHistory(){const toggle=qs('historyToggle'),panel=qs('historyPanel');if(!toggle||!panel)return;let backdrop=qs('historyOverlayBackdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.id='historyOverlayBackdrop';backdrop.className='history-overlay-backdrop hidden';document.body.appendChild(backdrop)}if(panel.parentElement!==document.body)document.body.appendChild(panel);panel.classList.add('history-overlay-panel','hidden');const open=()=>{panel.classList.remove('hidden');backdrop.classList.remove('hidden');document.documentElement.classList.add('history-overlay-open');document.body.classList.add('history-overlay-open')};const close=()=>{panel.classList.add('hidden');backdrop.classList.add('hidden');document.documentElement.classList.remove('history-overlay-open');document.body.classList.remove('history-overlay-open')};const click=e=>{e.preventDefault();e.stopPropagation();panel.classList.contains('hidden')?open():close()};if(toggle.__v77HistoryHandler)toggle.removeEventListener('click',toggle.__v77HistoryHandler);toggle.__v77HistoryHandler=click;toggle.addEventListener('click',click);backdrop.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},{passive:true});document.addEventListener('click',e=>{if(panel.classList.contains('hidden'))return;if(panel.contains(e.target)||toggle.contains(e.target))return;close()},true)}
  function mark(a){const c=Number(a.currentTime||0);if(Math.abs(c-lastAudioTime)>.05){lastAudioTime=c;lastAudioMoveAt=Date.now()}}
  function shouldPlay(){const a=audioEl();return !!a&&!a.paused&&!document.body.classList.contains('is-stopped')&&document.body.getAttribute('data-player-state')!=='stopped'}
  function recover(reason){document.body.setAttribute('data-last-audio-recover-disabled',reason||'pc-watchdog-disabled')}
  function audioWatchdog(){const a=audioEl();if(!a)return;mark(a);if(!shouldPlay()){lastAudioTime=Number(a.currentTime||0);lastAudioMoveAt=Date.now();return}syncPanel()}
  function boot(){boostControls();mirror(level());installHistory();syncTicker();const observerTarget=qs('metaLine');if(observerTarget&&window.MutationObserver)new MutationObserver(syncTicker).observe(observerTarget,{childList:true,characterData:true,subtree:true});const a=audioEl();if(a){['timeupdate','playing','canplay','loadeddata'].forEach(n=>a.addEventListener(n,()=>{mark(a);syncPanel()},{passive:true}));['waiting','stalled','suspend','emptied'].forEach(n=>a.addEventListener(n,()=>setTimeout(audioWatchdog,1800),{passive:true}));a.addEventListener('error',()=>setTimeout(()=>recover('audio-error'),1000),{passive:true})}setInterval(()=>{boostControls();syncTicker();audioWatchdog();mirror(level());syncPanel()},900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// END v77 PC Boost Meta Glow Ticker Fix


// ==========================================================
// 666SOUNDsDESIGn — v79 PC History Glow Boost Ticker Rebuild
// ==========================================================
(function installV79PcHistoryGlowBoostTickerRebuild(){
  if(window.__v79PcHistoryGlowBoostTickerRebuildInstalled)return;window.__v79PcHistoryGlowBoostTickerRebuildInstalled=true;
  const qs=id=>document.getElementById(id);let lastTicker='';
  function valid(t){const v=String(t||'').trim();return v&&!/metadata|metadaten|loading|laden|error|fehler/i.test(v)?v:''}
  function removePcTickerBoxes(){document.querySelectorAll('#historyTickerLane,.history-ticker-lane').forEach(el=>el.remove())}
  function ensurePcTicker(){removePcTickerBoxes();return null}
  function readSource(){for(const id of ['metaLine','nowPlayingTicker','nowTitle','trackTitle','currentTitle','songTitle']){const el=qs(id);const v=valid(el&&el.textContent);if(v)return v}return valid(document.body.getAttribute('data-current-title'))||valid(document.body.getAttribute('data-now-playing'))||lastTicker||'666SOUNDsDESIGn WebRadio'}
  function syncPcTicker(){ensurePcTicker();const src=readSource();if(valid(src))lastTicker=src}
  function syncBoostLabel(){const label=qs('pcBoostLabel');if(!label)return;const raw=window.__boostLevel??document.body.getAttribute('data-boost-level')??document.documentElement.style.getPropertyValue('--boost-level')??0;const clean=String(raw).replace(/[^\d.-]/g,'')||'0';const code=label.querySelector('.status-code')||label;const wanted='BST '+clean;if(code.textContent.trim()!==wanted)code.textContent=wanted}
  function hardenHistoryModal(){const toggle=qs('historyToggle'),panel=qs('historyPanel');if(!toggle||!panel)return;let back=qs('historyOverlayBackdrop');if(!back){back=document.createElement('div');back.id='historyOverlayBackdrop';back.className='history-overlay-backdrop hidden';document.body.appendChild(back)}if(panel.parentElement!==document.body)document.body.appendChild(panel);panel.classList.add('history-overlay-panel');const open=()=>{panel.classList.remove('hidden');back.classList.remove('hidden');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');document.body.classList.add('history-overlay-open');document.documentElement.classList.add('history-overlay-open')};const close=()=>{panel.classList.add('hidden');back.classList.add('hidden');document.body.classList.remove('history-overlay-open');document.documentElement.classList.remove('history-overlay-open')};const handler=e=>{e.preventDefault();e.stopPropagation();panel.classList.contains('hidden')?open():close()};if(toggle.__v79HistoryHandler)toggle.removeEventListener('click',toggle.__v79HistoryHandler);toggle.__v79HistoryHandler=handler;toggle.addEventListener('click',handler);back.onclick=close}
  function boot(){ensurePcTicker();syncPcTicker();syncBoostLabel();hardenHistoryModal();const meta=qs('metaLine');if(meta&&window.MutationObserver)new MutationObserver(syncPcTicker).observe(meta,{childList:true,characterData:true,subtree:true});setInterval(()=>{syncPcTicker();syncBoostLabel()},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// END v79 PC History Glow Boost Ticker Rebuild


// ==========================================================
// 666SOUNDsDESIGn — v80 Stream Stability MB LED Repair
// Zweck:
// - Stream-Stopp PC/iPhone stabilisieren: resume first, reconnect nur sehr selten.
// - Große Main/Backup-Umschalter nicht verwenden; kompakte M/B-Chips mit vorhandener Logik.
// - Keine zweite Audioquelle, kein Dauer-Cachebuster.
// ==========================================================
(function installV80StreamStabilityMbLedRepair(){
  if(window.__v80StreamStabilityMbLedRepairInstalled)return;
  window.__v80StreamStabilityMbLedRepairInstalled=true;

  const qs=id=>document.getElementById(id);
  let lastTime=0;
  let lastMoveAt=Date.now();
  let lastResumeAt=0;
  let lastReconnectAt=0;
  let userStarted=false;

  function audio(){return document.querySelector('audio');}

  function setChipLabels(){
    const main=qs('mainBtn'), back=qs('fallbackBtn');
    if(main){
      const code=main.querySelector('.status-code')||main;
      if(code.textContent.trim()!=='M')code.textContent='M';
      main.title='Mainstream';
      main.setAttribute('aria-label','Mainstream');
      main.classList.add('source-mini-chip-v80');
    }
    if(back){
      const code=back.querySelector('.status-code')||back;
      if(code.textContent.trim()!=='B')code.textContent='B';
      back.title='Backup Stream';
      back.setAttribute('aria-label','Backup Stream');
      back.classList.add('source-mini-chip-v80');
    }
  }

  function clickMain(){
    const main=qs('mainBtn');
    if(main&&!main.__v80MainClickBound){
      main.__v80MainClickBound=true;
      main.addEventListener('click',()=>{userStarted=true;},true);
    }
    const back=qs('fallbackBtn');
    if(back&&!back.__v80BackClickBound){
      back.__v80BackClickBound=true;
      back.addEventListener('click',()=>{userStarted=true;},true);
    }
  }

  function markMove(a){
    const t=Number(a.currentTime||0);
    if(Math.abs(t-lastTime)>0.04){
      lastTime=t;
      lastMoveAt=Date.now();
    }
  }

  function wantsPlayback(){
    const a=audio();
    if(!a)return false;
    if(document.body.classList.contains('is-stopped'))return false;
    const ps = document.body.getAttribute('data-player-state');
    if(ps==='stopped' || ps==='paused')return false;
    return userStarted || (!a.paused && !!(a.currentSrc||a.src));
  }

  function safePlay(reason){document.body.setAttribute('data-last-safe-play-disabled',reason||'pc-watchdog-disabled')}

  function rareReconnect(reason){document.body.setAttribute('data-last-rare-reconnect-disabled',reason||'pc-watchdog-disabled')}

  function watchdog(){
    const a=audio();
    if(!a){setChipLabels();return;}
    markMove(a);

    if(!wantsPlayback()){
      lastTime=Number(a.currentTime||0);
      lastMoveAt=Date.now();
      setChipLabels();
      clickMain();
      return;
    }

    const stalledFor=Date.now()-lastMoveAt;
    const weak=a.readyState<2 || a.networkState===3;

    /* v110: PC watchdog darf keine Wiedergabe mehr starten/stoppen/reconnecten.
       Der Haupt-Transport ist alleinige Audio-Steuerung. */
    if(stalledFor>8000 || (weak && stalledFor>5500)){
      document.body.setAttribute('data-pc-watchdog-stall-seen', weak?'weak-state':'stall');
    }

    setChipLabels();
    clickMain();
  }

  function boot(){
    const a=audio();
    if(a){
      ['play','playing'].forEach(ev=>{
        a.addEventListener(ev,()=>{
          userStarted=true;
          markMove(a);
        },{passive:true});
      });
      ['timeupdate','canplay','loadeddata'].forEach(ev=>{
        a.addEventListener(ev,()=>{ markMove(a); },{passive:true});
      });
      ['pause','ended'].forEach(ev=>{
        a.addEventListener(ev,()=>{
          const ps=document.body.getAttribute('data-player-state');
          if(ps==='paused'||ps==='stopped') userStarted=false;
        },{passive:true});
      });
      ['pause'].forEach(ev=>{
        a.addEventListener(ev,()=>{}, {passive:true});
      });
      ['waiting','stalled','suspend'].forEach(ev=>{
        a.addEventListener(ev,()=>setTimeout(watchdog,2500),{passive:true});
      });
      a.addEventListener('error',()=>setTimeout(()=>rareReconnect('audio-error'),1500),{passive:true});
    }

    setChipLabels();
    clickMain();
    setInterval(watchdog,4000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
// END v80 Stream Stability MB LED Repair


// ==========================================================
// 666SOUNDsDESIGn — v81 PC Layout Ticker Meter Repair
// ==========================================================
(function installV81PcLayoutTickerMeterRepair(){
  if(window.__v81PcLayoutTickerMeterRepairInstalled)return;window.__v81PcLayoutTickerMeterRepairInstalled=true;
  const qs=id=>document.getElementById(id);let lastTicker='';
  function valid(t){const v=String(t||'').trim();return v&&!/metadata|metadaten|loading|laden|error|fehler/i.test(v)?v:''}
  function setMbChips(){const main=qs('mainBtn'),back=qs('fallbackBtn'),ver=qs('pcVersionBadge');if(main){const code=main.querySelector('.status-code')||main;if(code.textContent.trim()!=='H')code.textContent='H';main.title='Hauptstream';main.setAttribute('aria-label','Hauptstream');main.classList.add('source-mini-chip-v80')}if(back){const code=back.querySelector('.status-code')||back;if(code.textContent.trim()!=='B')code.textContent='B';back.title='Backup Stream';back.setAttribute('aria-label','Backup Stream');back.classList.add('source-mini-chip-v80')}if(ver){const code=ver.querySelector('.status-code')||ver;if(code.textContent.trim()!=='v81')code.textContent='v81'}}
  function readTickerSource(){if(!isDesktopTransportLiveV114())return '666SOUNDsDESIGn WebRadio';for(const id of ['metaLine','nowPlayingTicker','nowTitle','trackTitle','currentTitle','songTitle']){const el=qs(id);const v=valid(el&&el.textContent);if(v)return v}return valid(document.body.getAttribute('data-current-title'))||valid(document.body.getAttribute('data-now-playing'))||lastTicker||'666SOUNDsDESIGn WebRadio'}
  function ensureSingleTicker(){document.querySelectorAll('#historyTickerLane,.history-ticker-lane').forEach(el=>el.remove());let lane=qs('pcTickerRebuildLane'),text=qs('pcTickerRebuildText');if(!lane||!text){lane=document.createElement('div');lane.id='pcTickerRebuildLane';lane.className='pc-ticker-rebuild-lane';lane.setAttribute('aria-label','PC Laufschrift');text=document.createElement('span');text.id='pcTickerRebuildText';text.className='pc-ticker-rebuild-text';text.textContent=lastTicker||'666SOUNDsDESIGn WebRadio';lane.appendChild(text)}const history=qs('historyToggle');const nowBox=history?history.parentElement:(document.querySelector('.now-playing')||document.querySelector('.now-card')||document.body);if(nowBox&&lane.parentElement!==nowBox)nowBox.appendChild(lane);return{lane,text}}
  function syncTicker(){const t=ensureSingleTicker();const src=readTickerSource();if(!isDesktopTransportLiveV114()){lastTicker='';const idle='666SOUNDsDESIGn WebRadio';if(t.text.textContent.trim()!==idle){t.text.textContent=idle;t.text.setAttribute('data-ticker-live','false')}return}if(valid(src))lastTicker=src;const finalText=lastTicker||src||'666SOUNDsDESIGn WebRadio';if(t.text.textContent.trim()!==finalText){t.text.textContent=finalText;t.text.setAttribute('data-ticker-live','true')}}
  function fixNowPlayingLabel(){document.querySelectorAll('.now-label,.now-playing-label,.now-playing .label,.now-playing [class*="label"]').forEach(el=>{const txt=String(el.textContent||'').trim();if(/no\s*playing/i.test(txt)||(/now\s*playing/i.test(txt)&&txt!=='NOW PLAYING'))el.textContent='NOW PLAYING'})}
  function hardenHistoryClose(){const toggle=qs('historyToggle'),panel=qs('historyPanel');let backdrop=qs('historyOverlayBackdrop');if(!toggle||!panel)return;if(!backdrop){backdrop=document.createElement('div');backdrop.id='historyOverlayBackdrop';backdrop.className='history-overlay-backdrop hidden';document.body.appendChild(backdrop)}if(panel.parentElement!==document.body)document.body.appendChild(panel);panel.classList.add('history-overlay-panel');function open(){panel.classList.remove('hidden');backdrop.classList.remove('hidden');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');document.body.classList.add('history-overlay-open');document.documentElement.classList.add('history-overlay-open')}function close(){panel.classList.add('hidden');backdrop.classList.add('hidden');document.body.classList.remove('history-overlay-open');document.documentElement.classList.remove('history-overlay-open');backdrop.style.pointerEvents='auto';backdrop.style.opacity=''}const handler=e=>{e.preventDefault();e.stopPropagation();panel.classList.contains('hidden')?open():close()};if(toggle.__v81HistoryHandler)toggle.removeEventListener('click',toggle.__v81HistoryHandler);toggle.__v81HistoryHandler=handler;toggle.addEventListener('click',handler,true);backdrop.onclick=e=>{e.preventDefault();e.stopPropagation();close()};document.addEventListener('click',e=>{if(panel.classList.contains('hidden'))return;if(panel.contains(e.target)||toggle.contains(e.target))return;close()},true);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},{passive:true})}
  function boot(){setMbChips();fixNowPlayingLabel();ensureSingleTicker();syncTicker();hardenHistoryClose();const meta=qs('metaLine');if(meta&&window.MutationObserver)new MutationObserver(syncTicker).observe(meta,{childList:true,characterData:true,subtree:true});setInterval(()=>{setMbChips();fixNowPlayingLabel();syncTicker()},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// END v81 PC Layout Ticker Meter Repair


// ==========================================================
// 666SOUNDsDESIGn — v82 Restore iPhone PC Only Isolation
// Zweck: PC-only Helper dürfen Mobile/iPhone nicht verbiegen.
// ==========================================================
(function installV82RestoreIphonePcOnlyIsolation(){
  if(window.__v82RestoreIphonePcOnlyIsolationInstalled)return;
  window.__v82RestoreIphonePcOnlyIsolationInstalled=true;
  const isMobile=()=>window.matchMedia&&window.matchMedia('(max-width: 760px)').matches;

  function restoreMobile(){
    if(!isMobile())return;
    document.documentElement.classList.add('iphone-restore-v82');
    document.body.classList.add('iphone-restore-v82');

    document.querySelectorAll('#pcTickerRebuildLane,.pc-ticker-rebuild-lane').forEach(el=>{
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
    });

    document.querySelectorAll('.stream-choice-row,.source-choice-row,.main-back-row,.mainstream-backup-row,.source-switch-row,.stream-source-row,.mobile-stream-row,.mobile-source-row,.mobile-status-row,.mobile-boost-row,.mobile-history-row').forEach(el=>{
      el.style.display='flex';
      el.style.visibility='visible';
      el.removeAttribute('hidden');
      el.setAttribute('data-v82-mobile-restored','true');
    });

    const history=document.getElementById('historyToggle');
    if(history){
      history.style.position='static';
      history.style.top='auto';
      history.style.right='auto';
      history.style.zIndex='auto';
    }
  }

  function desktopGuard(){
    if(isMobile())restoreMobile();
    else{
      document.documentElement.classList.remove('iphone-restore-v82');
      document.body.classList.remove('iphone-restore-v82');
    }
  }

  function boot(){
    restoreMobile();
    desktopGuard();
    window.addEventListener('resize',desktopGuard,{passive:true});
    window.addEventListener('orientationchange',restoreMobile,{passive:true});
    setInterval(restoreMobile,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
// END v82 Restore iPhone PC Only Isolation



/*
==========================================
GEÄNDERT: 2026-05-07
ÄNDERUNG: MOBILE_AUDIO_RECOVERY_PATCH_v84
ZWECK:
- iOS Audio-Unterbrechungen automatisch recovern.
- Kein echter Stop bei Systemton/Benachrichtigung.
==========================================
*/
let __userStopped = false;

function attemptMobileRecovery(reason = 'unknown') {
  try {
    // v112: legacy add-on recovery must not run on desktop and must not resume after user Pause/Stop.
    if (!isMobileViewport()) return;
    const ps = String(document.body?.getAttribute('data-player-state') || document.documentElement?.getAttribute('data-player-state') || '').toLowerCase();
    if (ps === 'paused' || ps === 'stopped') return;
    if (__userStopped || userStopped) return;
    if (!audio) return;

    const resumePromise = window.__radioAudioContext?.resume?.();
    if (resumePromise && typeof resumePromise.catch === 'function') {
      resumePromise.catch(() => {});
    }

    if (audio.paused && currentSource) {
      try {
        const target = currentSource === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;
        prepareAudioElementForFreshPlay(target, 'mobile-recovery-' + reason);
      } catch (err) {}
      const playPromise = audio.play?.();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }

    document.body?.setAttribute('data-audio-recovery', reason);
  } catch (err) {
    console.warn('mobile recovery failed', err);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) setTimeout(() => attemptMobileRecovery('visibility'), 180);
});

window.addEventListener('focus', () => {
  setTimeout(() => attemptMobileRecovery('focus'), 120);
});

window.addEventListener('pageshow', () => {
  setTimeout(() => attemptMobileRecovery('pageshow'), 120);
});

audio?.addEventListener('pause', () => {
  if (!__userStopped) {
    setTimeout(() => attemptMobileRecovery('pause'), 250);
  }
});

audio?.addEventListener('stalled', () => {
  setTimeout(() => attemptMobileRecovery('stalled'), 250);
});

audio?.addEventListener('suspend', () => {
  setTimeout(() => attemptMobileRecovery('suspend'), 250);
});

playBtn?.addEventListener('click', () => { __userStopped = false; });
reconnectBtn?.addEventListener('click', () => { __userStopped = false; });
mainBtn?.addEventListener('click', () => { if (String(document.body?.getAttribute('data-player-state') || '').toLowerCase() === 'playing') __userStopped = false; });
fallbackBtn?.addEventListener('click', () => { if (String(document.body?.getAttribute('data-player-state') || '').toLowerCase() === 'playing') __userStopped = false; });
pauseBtn?.addEventListener('click', () => { __userStopped = true; });
stopBtn?.addEventListener('click', () => { __userStopped = true; });

