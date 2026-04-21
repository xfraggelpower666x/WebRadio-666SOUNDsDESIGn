/*
==========================================
DATEI: external-player/js/player-core.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
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
const timelineProgress = document.getElementById('timelineProgress');
const currentTimeText = document.getElementById('currentTimeText');
const durationText = document.getElementById('durationText');

let currentSource = 'main';
let userStopped = false;
let metadataTimer = 0;
let historyItems = [];

const bars = createBars(document.getElementById('eqBars'), window.innerWidth <= 860 ? 20 : 28);
const visualizer = startVisualizer({ audio, bars, leftMeters, rightMeters });
installResponsiveHelpers(historyToggle, historyPanel);
applyStatusChip(statusSource, 'external', 'Externer Hauptplayer aktiv');
applyStatusChip(statusStream, 'main', 'Main Stream aktiv');
applyStatusChip(statusMeta, 'api', 'Metadaten über API aktiv');
markSourceButtons(mainBtn, fallbackBtn, currentSource);
audio.volume = Number(volumeSlider?.value || 0.75);

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

function cleanNowPlayingText(raw) {
  let value = String(raw || '').trim();
  if (!value) return 'Unknown title';
  value = value.replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*666soundsdesign\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*dj\s*[-:|–—]*\s*/i, '');
  value = value.replace(/^\s*[-:|–—]+\s*/, '');
  return value.trim() || 'Unknown title';
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

  const cleanedTitle = cleanNowPlayingText(rawTitle);
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
  try {
    const response = await fetch(`${ENDPOINTS.metadata}?t=${Date.now()}`, { cache: 'no-store' });
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
  }
}

function startMetadataLoop() {
  window.clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = window.setInterval(fetchMetadata, POLL_MS);
}

function stopPlayback(status = 'STOPPED') {
  audio.pause();
  audio.removeAttribute('src');
  audio.src = '';
  audio.load();
  setStatus(status);
  updateTimeline();
}

async function playCurrent() {
  userStopped = false;
  setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
  audio.src = currentSource === 'main' ? ENDPOINTS.main : ENDPOINTS.fallback;
  try {
    lockVisualStage();
    visualizer.stop?.();
    await visualizer.start();
    await audio.play();
    setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
    startMetadataLoop();
  } catch (err) {
    if (currentSource === 'main') {
      setSource('fallback');
      try {
        lockVisualStage();
        visualizer.stop?.();
        await visualizer.start();
        await audio.play();
        setStatus('AUTO SWITCH → BACKUP');
        startMetadataLoop();
      } catch (err2) {
        applyStatusChip(statusStream, 'error', 'Audio- oder Streamfehler');
        setStatus('AUDIO ERROR');
      }
    } else {
      applyStatusChip(statusStream, 'error', 'Audio- oder Streamfehler');
      setStatus('AUDIO ERROR');
    }
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
  audio.pause();
  lockVisualStage();
  setStatus('PAUSED');
});
stopBtn?.addEventListener('click', () => {
  userStopped = true;
  lockVisualStage();
  visualizer.stop?.();
  stopPlayback('STOPPED');
});
reconnectBtn?.addEventListener('click', async () => {
  stopPlayback('RECONNECT');
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
audio?.addEventListener('playing', () => {
  lockVisualStage();
  setStatus(currentSource === 'main' ? 'PLAYING MAIN' : 'PLAYING BACKUP');
});
audio?.addEventListener('timeupdate', updateTimeline);
audio?.addEventListener('loadedmetadata', updateTimeline);

lockVisualStage();
healthPing();
fetchMetadata();
startMetadataLoop();
updateTimeline();

// v15 EQ sync ensured
