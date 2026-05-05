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
import { setText, markSourceButtons } from './controls.js?v=smfp-v80-stream-stability-mb-led-repair-20260505-0045';
import { createBars, startVisualizer } from './equalizer.js?v=smfp-v80-stream-stability-mb-led-repair-20260505-0045';
import { installResponsiveHelpers } from './responsive-ui.js?v=smfp-v80-stream-stability-mb-led-repair-20260505-0045';
import { applyStatusChip } from './shared-status.js?v=smfp-v80-stream-stability-mb-led-repair-20260505-0045';

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
const leftMeters = [document.getElementById('leftMeterA'), document.getElementById('leftMeterB')].filter(Boolean);
const rightMeters = [document.getElementById('rightMeterA'), document.getElementById('rightMeterB')].filter(Boolean);
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
const visualizer = startVisualizer({ audio, bars, leftMeters, rightMeters, bottomMeterSegments });
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
/*
   * STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR:
   * Alter mobiler Generator physisch deaktiviert.
   * Keine DOM-Erzeugung, keine alten Bottom-/Transport-/Boost-Layer.
   */
  document.documentElement.setAttribute('data-old-mobile-generator-disabled', 'STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR');
  return;
}
/* STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR: installMobileTouchControlsRepair call removed. */
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
/*
   * STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR:
   * Alter mobiler Generator physisch deaktiviert.
   * Keine DOM-Erzeugung, keine alten Bottom-/Transport-/Boost-Layer.
   */
  document.documentElement.setAttribute('data-old-mobile-generator-disabled', 'STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR');
  return;
}
/* STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR: installMobileLevelmeterGestureGuard call removed. */
/* MOBILE_HUD_DOM_METER_REPAIR_v1: echte DOM-Meter + Mobile-Transportleiste. */
function installMobileHudDomMeterRepair() {
/*
   * STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR:
   * Alter mobiler Generator physisch deaktiviert.
   * Keine DOM-Erzeugung, keine alten Bottom-/Transport-/Boost-Layer.
   */
  document.documentElement.setAttribute('data-old-mobile-generator-disabled', 'STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR');
  return;
}
/* STRICT_MOBILE_FRONTEND_PURGE_v6: installMobileHudDomMeterRepair disabled. */
/* MOBILE_TRANSPORT_PIN_REPAIR_v1: Mobile Play/Pause/Stop/Boost-Leiste sichtbar pinnen. */
function installMobileTransportPinRepair() {
/*
   * STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR:
   * Alter mobiler Generator physisch deaktiviert.
   * Keine DOM-Erzeugung, keine alten Bottom-/Transport-/Boost-Layer.
   */
  document.documentElement.setAttribute('data-old-mobile-generator-disabled', 'STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR');
  return;
}
/* STRICT_MOBILE_FRONTEND_PURGE_v6: installMobileTransportPinRepair disabled. */
/* MOBILE_TOP_CONTROLS_IN_BOOST_PANEL_v1 */
function installMobileTopControlsInBoostPanel(){
/*
   * STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR:
   * Alter mobiler Generator physisch deaktiviert.
   * Keine DOM-Erzeugung, keine alten Bottom-/Transport-/Boost-Layer.
   */
  document.documentElement.setAttribute('data-old-mobile-generator-disabled', 'STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR');
  return;
}
/* STRICT_MOBILE_FRONTEND_PURGE_v80_STREAM_STABILITY_MB_LED_REPAIR: installMobileTopControlsInBoostPanel call removed. */
installResponsiveHelpers(historyToggle, historyPanel);
applyStatusChip(statusSource, 'ok', 'Quelle aktiv');
applyStatusChip(statusStream, 'ok', 'Stream aktiv');
applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');
updateStreamPanelLeds(currentSource);
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

function updateNowCover(meta) {
  if (!nowCover) return;
  const cover = meta?.cover || '/assets/images/fallback-cover.png';

  if (nowCover.getAttribute('src') !== cover) {
    nowCover.src = cover;
  }
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
  text = text.replace(/^\s*loading\s*metadata\s*[-:|–—]*\s*/i, '');
  text = text.replace(/^\s*metadaten\s*werden\s*geladen\s*[-:|–—]*\s*/i, '');
  text = text.replace(/^\s*metadata\s*unavailable\s*[-:|–—]*\s*/i, '');
  text = text.replace(/\s{2,}/g, ' ').trim();
  text = text.replace(/^[-:|–—\s]+/, '').replace(/[-:|–—\s]+$/, '').trim();
  if (!text) return '';
  return text;
}

function cleanNowPlayingText(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';

  value = value.replace(/^\s*unknown\s*title\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*loading\s*metadata\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*metadaten\s*werden\s*geladen\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*666soundsdesign\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*artist\s*[-:|–—]*\s*track\s*[-:|–—]*\s*/i, '');
  value = value.replace(/\s+[-:|–—]\s+[-:|–—]\s+/g, ' - ');
  value = value.replace(/^\s*[-:|–—]+\s*/, '');
  value = value.replace(/\s{2,}/g, ' ').trim();

  if (!value || /^unknown\s*title$/i.test(value)) return '';
  return value;
}



function firstMetadataText(...values) {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) return text;
    }

    if (value && typeof value === 'object') {
      const nested = value.title || value.text || value.name || value.songtitle || value.song || value.current || value.now_playing;
      if (typeof nested === 'string' || typeof nested === 'number') {
        const text = String(nested).trim();
        if (text) return text;
      }
      if (nested && typeof nested === 'object') {
        const deep = nested.title || nested.text || nested.name || nested.songtitle;
        if (typeof deep === 'string' || typeof deep === 'number') {
          const text = String(deep).trim();
          if (text) return text;
        }
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
  const rawTitle = firstMetadataText(
    payload.title,
    payload.now_playing,
    payload.currenttrack,
    payload.currentTrack,
    payload.currentSong,
    payload.current_song,
    payload.songtitle,
    payload.song,
    song.title,
    song.text,
    song.name,
    song.songtitle
  );
  const rawArtist = firstMetadataText(
    payload.artist,
    payload.dj,
    payload.djusername,
    payload.presenter,
    song.artist,
    song.artist_name,
    song.dj
  );

  const listeners = payload.listeners || payload.currentlisteners || payload.currentListeners || payload.listener_count || 0;
  const bitrate = payload.bitrate || payload.stream_bitrate || payload.streamBitrate || 'Unknown';
  const max = payload.maxlisteners || payload.maxListeners || payload.listener_capacity || 250;
  const dj = normalizeDjName(payload.dj || payload.djusername || payload.presenter || rawArtist || '');

  const cleanedTitle = normalizeMetadataTitleV22(cleanNowPlayingText(rawTitle));
  const cleanedArtist = normalizeMetadataTitleV22(cleanNowPlayingText(rawArtist));
  const finalTitle = cleanedArtist && cleanedTitle && !cleanedTitle.toLowerCase().includes(cleanedArtist.toLowerCase())
    ? `${cleanedArtist} - ${cleanedTitle}`
    : cleanedTitle;

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
      return;
    }
    updateNowCover(data);
    setText(metaLine, data.title || '');
    setText(nowPlayingTicker, data.title || '');
    setText(listenersText, data.listeners);
    setText(bitrateText, data.bitrate);
    setText(djText, data.dj);
    applyStatusChip(statusMeta, 'ok', 'Metadaten aktiv');
updateHistory(data.title);
    normalizeNowPlayingDuplicateFallback();
  } catch (err) {
    const fallbackTitle = (nowPlayingTicker?.textContent || metaLine?.textContent || '').trim();
    if (fallbackTitle && !/metadata|metadaten|loading|laden|error|fehler/i.test(fallbackTitle)) {
      setText(metaLine, fallbackTitle);
      setText(nowPlayingTicker, fallbackTitle);
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
  audio.pause();
  audio.removeAttribute('src');
  audio.src = '';
  try { audio.load(); } catch (err) {}
  visualizer.stop?.();
  window.clearInterval(metadataTimer);
  setStatus(status);
  setStoppedPanelLeds();
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
  setActivePanelLeds();
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
        audio.src = ENDPOINTS.fallback;
        audio.load();
        await playAudioWithTimeout(retryToken);
        if (retryToken !== playRequestToken || userStopped) return;
        await visualizer.start?.();
        setBoostStage(currentBoostStage);
        setStatus('PLAYING BACKUP');
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
    if (!response.ok) throw new Error('health_http_error');
    applyStatusChip(statusSource, 'ok', 'Quelle aktiv');
  } catch (err) {
    applyStatusChip(statusSource, 'warn', 'Externer Hauptplayer meldet Fehler');
  }
}

playBtn?.addEventListener('click', async () => { await playCurrent(); });
pauseBtn?.addEventListener('click', () => {
  playRequestToken += 1;
  audio.pause();
  lockVisualStage();
  visualizer.stop?.();
  setStatus('PAUSED');
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
  audio.volume = Number(volumeSlider.value);
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
  setActivePanelLeds();
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
  function clamp(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(3,Math.round(n))):0}
  function level(){const raw=window.__boostLevel??document.body.getAttribute('data-boost-level')??document.documentElement.style.getPropertyValue('--boost-level')??0;return clamp(String(raw).replace(/[^\d.-]/g,''))}
  function mirror(lv){const safe=clamp(lv);window.__boostLevel=safe;document.body.setAttribute('data-boost-level',String(safe));document.body.setAttribute('data-mobile-boost',String(safe));document.documentElement.style.setProperty('--boost-level',String(safe));document.documentElement.style.setProperty('--player-boost-level',String(safe));const gain=1+(safe*.10);document.documentElement.style.setProperty('--player-boost-gain',gain.toFixed(2));const label=qs('pcBoostLabel');if(label)(label.querySelector('.status-code')||label).textContent='BST '+safe;window.dispatchEvent(new CustomEvent('playerboostchange',{detail:{level:safe,gain}}));return safe}
  function applyBoost(lv){const safe=clamp(lv);let applied=safe;try{if(typeof setBoostStage==='function'){const r=setBoostStage(safe);applied=clamp(typeof r==='number'?r:safe)}else if(typeof changeBoostStage==='function'){const r=changeBoostStage(safe-level());applied=clamp(typeof r==='number'?r:safe)}}catch(err){document.body.setAttribute('data-boost-error',String(err&&err.message||err))}mirror(applied);syncPanel()}
  function boostControls(){const minus=qs('pcBoostMinus'),plus=qs('pcBoostPlus');if(minus&&!minus.__v77BoostBound){minus.__v77BoostBound=true;minus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();applyBoost(level()-1);},true)}if(plus&&!plus.__v77BoostBound){plus.__v77BoostBound=true;plus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();applyBoost(level()+1);},true)}}
  function audioEl(){return document.querySelector('audio')}
  function setLed(el,state,active){if(!el)return;el.classList.remove('state-main','state-api','state-external','state-backup','state-off','is-active','is-idle','is-error','state-error');el.classList.add(state||'state-off');if(active)el.classList.add('is-active')}
  function backupActive(){const fb=qs('fallbackBtn'),mb=qs('mainBtn');if(fb&&(fb.classList.contains('is-active')||fb.getAttribute('aria-pressed')==='true'))return true;if(mb&&(mb.classList.contains('is-active')||mb.getAttribute('aria-pressed')==='true'))return false;return /back|backup|fallback/i.test(document.body.getAttribute('data-source')||document.body.getAttribute('data-stream-source')||'')}
  function valid(t){const v=String(t||'').trim();return v&&!/metadata|metadaten|loading|laden|error|fehler/i.test(v)?v:''}
  function readMetaLikeMobile(){const ids=['metaLine','nowPlayingTicker','nowTitle','trackTitle','currentTitle','songTitle'];for(const id of ids){const el=qs(id);const v=valid(el&&el.textContent);if(v)return v}const dataTitle=document.body.getAttribute('data-current-title')||document.body.getAttribute('data-now-playing')||'';return valid(dataTitle)}
  function syncTicker(){const ticker=qs('nowPlayingTicker');const metaLine=qs('metaLine');if(!ticker)return;const visible=readMetaLikeMobile();if(visible){lastGoodMeta=visible;lastMetaOkAt=Date.now()}const text=visible||lastGoodMeta||'666SOUNDsDESIGn WebRadio';if(ticker.textContent.trim()!==text){ticker.textContent=text;ticker.setAttribute('data-ticker-live','true')}if(metaLine&&lastGoodMeta&&!valid(metaLine.textContent))metaLine.textContent=lastGoodMeta}
  function syncPanel(){const a=audioEl();const playing=!!a&&!a.paused&&!document.body.classList.contains('is-stopped')&&document.body.getAttribute('data-player-state')!=='stopped';setLed(qs('statusStream'),playing?'state-main':'state-off',playing);setLed(qs('statusSource'),playing?'state-external':'state-off',playing);const metaFresh=lastMetaOkAt&&(Date.now()-lastMetaOkAt<45000);setLed(qs('statusMeta'),metaFresh?'state-api':(playing?'state-error':'state-off'),!!metaFresh);const b=backupActive();setLed(qs('mainBtn'),(!b&&playing)?'state-main':'state-off',!b&&playing);setLed(qs('fallbackBtn'),(b&&playing)?'state-backup':'state-off',b&&playing);const active=level()>0;setLed(qs('pcBoostMinus'),active?'state-api':'state-off',active);setLed(qs('pcBoostPlus'),active?'state-api':'state-off',active);setLed(qs('pcBoostLabel'),active?'state-api':'state-off',active)}
  function installHistory(){const toggle=qs('historyToggle'),panel=qs('historyPanel');if(!toggle||!panel)return;let backdrop=qs('historyOverlayBackdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.id='historyOverlayBackdrop';backdrop.className='history-overlay-backdrop hidden';document.body.appendChild(backdrop)}if(panel.parentElement!==document.body)document.body.appendChild(panel);panel.classList.add('history-overlay-panel','hidden');const open=()=>{panel.classList.remove('hidden');backdrop.classList.remove('hidden');document.documentElement.classList.add('history-overlay-open');document.body.classList.add('history-overlay-open')};const close=()=>{panel.classList.add('hidden');backdrop.classList.add('hidden');document.documentElement.classList.remove('history-overlay-open');document.body.classList.remove('history-overlay-open')};const click=e=>{e.preventDefault();e.stopPropagation();panel.classList.contains('hidden')?open():close()};if(toggle.__v77HistoryHandler)toggle.removeEventListener('click',toggle.__v77HistoryHandler);toggle.__v77HistoryHandler=click;toggle.addEventListener('click',click);backdrop.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},{passive:true});document.addEventListener('click',e=>{if(panel.classList.contains('hidden'))return;if(panel.contains(e.target)||toggle.contains(e.target))return;close()},true)}
  function mark(a){const c=Number(a.currentTime||0);if(Math.abs(c-lastAudioTime)>.05){lastAudioTime=c;lastAudioMoveAt=Date.now()}}
  function shouldPlay(){const a=audioEl();return !!a&&!a.paused&&!document.body.classList.contains('is-stopped')&&document.body.getAttribute('data-player-state')!=='stopped'}
  function recover(reason){const a=audioEl();if(!a)return;const now=Date.now();if(now-lastRecoverAt<12000)return;lastRecoverAt=now;try{const src=a.currentSrc||a.src;if(!src)return;const vol=a.volume,muted=a.muted;a.pause();a.src=src.includes('?')?src+'&r='+now:src+'?r='+now;a.load();a.volume=vol;a.muted=muted;const p=a.play();if(p&&typeof p.catch==='function')p.catch(()=>{});document.body.setAttribute('data-last-audio-recover',reason||'stall')}catch(err){document.body.setAttribute('data-last-audio-recover-error',String(err&&err.message||err))}}
  function audioWatchdog(){const a=audioEl();if(!a)return;mark(a);if(!shouldPlay()){lastAudioTime=Number(a.currentTime||0);lastAudioMoveAt=Date.now();return}const stalled=Date.now()-lastAudioMoveAt;const weak=a.readyState<2||a.networkState===3;if(stalled>9000||(weak&&stalled>5500))recover(weak?'weak-state':'no-time-progress')}
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
  function ensurePcTicker(){document.querySelectorAll('#historyTickerLane,.history-ticker-lane').forEach(el=>{el.style.display='none'});let lane=qs('pcTickerRebuildLane'),text=qs('pcTickerRebuildText');if(lane&&text)return{lane,text};lane=document.createElement('div');lane.id='pcTickerRebuildLane';lane.className='pc-ticker-rebuild-lane';lane.setAttribute('aria-label','PC Laufschrift');text=document.createElement('span');text.id='pcTickerRebuildText';text.className='pc-ticker-rebuild-text';text.textContent=lastTicker||'666SOUNDsDESIGn WebRadio';lane.appendChild(text);const h=qs('historyToggle');if(h)h.insertAdjacentElement('afterend',lane);else(document.querySelector('.now-playing')||document.body).appendChild(lane);return{lane,text}}
  function readSource(){for(const id of ['metaLine','nowPlayingTicker','nowTitle','trackTitle','currentTitle','songTitle']){const el=qs(id);const v=valid(el&&el.textContent);if(v)return v}return valid(document.body.getAttribute('data-current-title'))||valid(document.body.getAttribute('data-now-playing'))||lastTicker||'666SOUNDsDESIGn WebRadio'}
  function syncPcTicker(){const target=ensurePcTicker();const src=readSource();if(valid(src))lastTicker=src;const finalText=lastTicker||src||'666SOUNDsDESIGn WebRadio';if(target.text.textContent.trim()!==finalText){target.text.textContent=finalText;target.text.setAttribute('data-ticker-live','true')}}
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
    if(document.body.getAttribute('data-player-state')==='stopped')return false;
    return userStarted || (!a.paused && !!(a.currentSrc||a.src));
  }

  function safePlay(reason){
    const a=audio();
    if(!a)return;
    const now=Date.now();
    if(now-lastResumeAt<6000)return;
    lastResumeAt=now;
    try{
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{});
      document.body.setAttribute('data-last-safe-play',reason||'resume');
    }catch(err){
      document.body.setAttribute('data-last-safe-play-error',String(err&&err.message||err));
    }
  }

  function rareReconnect(reason){
    const a=audio();
    if(!a)return;
    const now=Date.now();
    if(now-lastReconnectAt<90000)return;
    lastReconnectAt=now;
    try{
      const src=a.currentSrc||a.src;
      if(!src)return;
      const vol=a.volume, muted=a.muted;
      a.pause();
      /* Kein Cachebuster-Orkan: Original-SRC unverändert neu laden. */
      a.src=src.replace(/[?&]r=\d+$/,'');
      a.load();
      a.volume=vol;
      a.muted=muted;
      const p=a.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{});
      document.body.setAttribute('data-last-rare-reconnect',reason||'stall');
    }catch(err){
      document.body.setAttribute('data-last-rare-reconnect-error',String(err&&err.message||err));
    }
  }

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

    /* Sanft: erst play/resume. Kein direktes src-Wechseln. */
    if(a.paused && userStarted){
      safePlay('paused-while-user-started');
    }else if(stalledFor>8000 || (weak && stalledFor>5500)){
      safePlay(weak?'weak-state-resume':'stall-resume');
    }

    /* Hart nur sehr selten und ohne Cachebuster. */
    if(stalledFor>28000 && userStarted){
      rareReconnect('long-stall');
    }

    setChipLabels();
    clickMain();
  }

  function boot(){
    const a=audio();
    if(a){
      ['play','playing','timeupdate','canplay','loadeddata'].forEach(ev=>{
        a.addEventListener(ev,()=>{
          userStarted=true;
          markMove(a);
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

