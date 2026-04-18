/* ##################################################
   FILE: WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn/js/app.bundle.js
   PROJECT: 666SOUNDsDESIGn WebRadio Player

   CREATED: existing project file
   LAST MODIFIED: 2026-04-18

   PURPOSE:
   Frontend Player Runtime / Step 4 / Freeze-sichere AutoChain

   CHANGELOG (2026-04-18):
   - FIX: AutoChain Lift wird erst nach erfolgreichem Playback aktiv
   - FIX: AutoLift reagiert auf Input-RMS statt fest auf 0 zu bleiben
   - FIX: AutoChain Gain summiert Boost + Lift sauber
   - FIX: AutoChain HUD zeigt echten Lift/State statt Dummy-Werte
   - NO CHANGES: Worker, Deploy, Repo-Struktur, Boot-Overlay-Struktur

   NOTES:
   - Step 4 build
   - Frontend only
   - Repo-Struktur unverändert
   - Freeze-sicher: AutoChain nur late attach nach erfolgreichem Audio-Start
################################################## */

// ==========================================
// DATEI: js/app.bundle.js
// ERSTELLT: 2026-04-17
// GEÄNDERT: 2026-04-17 | AUDIO ENGINE FIX BUILD
// ZWECK: Modulfreier Start-Build mit Audio Pro, Auto-Chain und Boost-Reserve auf stabiler No-Module-Basis.
// ÄNDERUNG: Final Pro Balanced Tuning aktiv. Auto-Chain bleibt führend, aber stabiler abgestimmt; Boost bleibt reine Notfall-Reserve.
// ==========================================
(function(){
// ==========================================
// DATEI: config/ui.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Zentrale UI-/Theme-Konfiguration für internen und externen WebRadio-Player.
// ÄNDERUNG: Cyber-Header, Lampen-Tap-Infos, neon-türkise Info-Panels und Laser-Outlines ergänzt.
// ==========================================

const UI_CONFIG = {
  theme: {
    backgroundBase: '#1c1f24',
    backgroundDeep: '#11141a',
    neonPink: '#ff3fb7',
    neonTurquoise: '#00f5df',
    okGreen: '#53ff98',
    errorRed: '#ff557d',
    textMain: '#eef7ff',
    textMuted: '#8ea2b3',
    panelBorder: 'rgba(0,245,223,0.24)',
    panelGlass: 'rgba(255,255,255,0.04)',
    panelSolid: '#00f5df',
    panelText: '#1c1f24'
  },
  labels: {
    metadata: 'Meta',
    audio: 'Audio',
    source: 'Source',
    health: 'Health',
    player: 'Player',
    nowPlaying: 'Now Playing',
    listeners: 'Listeners',
    bitrate: 'Bitrate',
    djStatus: 'DJ / Status',
    stream: 'Stream',
    genre: 'Genre',
    serverInfo: 'Server / Info',
    modeExternal: 'External',
    modeInternal: 'Internal',
    sourcePrimary: 'Main',
    sourceFallback: 'Fallback',
    healthReady: 'Ready',
    healthOnline: 'Online',
    healthOffline: 'Offline',
    audioPlaying: 'Playing',
    audioPaused: 'Paused',
    audioError: 'Error'
  },
  infoTexts: {
    playerExternal: 'Externer Haupt-Player aktiv. Türkis bedeutet: Standard-Player läuft.',
    playerInternal: 'Interner Worker-Fallback aktiv. Pink bedeutet: Notfall-Player läuft.',
    sourcePrimary: 'Main-Stream aktiv. Aktuell läuft der Hauptstream.',
    sourceFallback: 'Fallback-Stream aktiv. Der Hauptstream war nicht erreichbar.',
    healthReady: 'Health wird gerade geprüft.',
    healthOnline: 'Health ist online. Worker und Stream-Antwort sind erreichbar.',
    healthOffline: 'Health ist offline oder liefert gerade keine saubere Antwort.',
    metadataOnline: 'Metadaten werden sauber aus dem Worker gelesen und angezeigt.',
    metadataOffline: 'Metadaten konnten gerade nicht geladen werden.',
    audioPlaying: 'Audio läuft. Der Player gibt Ton aus.',
    audioPaused: 'Audio ist pausiert.',
    audioError: 'Audio konnte nicht abgespielt werden.'
  },
  defaults: {
    djName: '666SOUNDsDESIGn DJ',
    stationName: '666SOUNDsDESIGn Radio'
  }
};

// ==========================================
// DATEI: config/stream.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Stream-Konfiguration des internen Fallback-Players.
// ÄNDERUNG: Health-Endpunkt ergänzt und Konfiguration für gemeinsamen One-Page-Player vorbereitet.
// ==========================================

const STREAM_CONFIG = {
  stream_url: "/stream",
  fallback_stream_url: "/fallback-stream",
  metadata_url: "/api/nowplaying",
  health_url: "/health",
  poll_interval_ms: 8000,
  listener_capacity: 250,
  use_webhook: false,
  primary_upstream: "https://my.idjstream.com/666soundsdesign/stream",
  fallback_upstream: "https://my.idjstream.com:8686/stream"
};

// ==========================================
// DATEI: external-player/js/player-ui-audio-pro.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16 | AUDIO PRO + AUTO CHAIN HOT DEFAULT
// STATUS: AUDIO PRO AKTIV
// ZWECK: Eigenständige externe Player-Logik mit echtem Web-Audio-Graph, Hot-Default-Auto-Chain, Boost-Reserve und GR-HUD.
// HINWEIS: Nur für den externen Player. Interner Notfallplayer und Worker bleiben unberührt. Auto-Chain läuft standardmäßig aktiv.
// ==========================================

const FALLBACK_COVER = './assets/images/fallback-cover.png';
const DEFAULT_DJ = '666SOUNDsDESIGn DJ';
const BOOST_STAGES_DB = [0, 6, 12, 18];
const HOT_DRIVE_DB = 0.0;
const AUTO_TARGET_DB = -18.0;
const AUTO_LIFT_MAX_DB = 6.0;
const LIMIT_TRIGGER_DB = 2.2;
const CLIP_TRIGGER_DB = -0.35;
const MINUS_INF_TEXT = '-∞ dB';

function initPlayer({ streamConfig, uiConfig, mode = 'external', assetPrefix = '.' }) {
  const doc = document.documentElement;
  const state = {
    booted: false,
    usingFallback: false,
    muted: false,
    metadataTimer: null,
    healthTimer: null,
    lastTitle: 'Loading metadata...',
    historyOpen: false,
    audioContext: null,
    mediaSourceNode: null,
    inputAnalyser: null,
    outputAnalyser: null,
    dynamicsNode: null,
    gainNode: null,
    masterGainNode: null,
    inputData: null,
    outputData: null,
    inputWaveData: null,
    outputWaveData: null,
    preGainNode: null,
    meterAnim: null,
    currentBoostStage: 0,
    currentBoostDb: 0,
    autoLiftDb: 0,
    autoChainReady: false,
    autoChainActive: false,
    hotDriveDb: HOT_DRIVE_DB,
    targetDb: AUTO_TARGET_DB,
    grDb: 0,
    peakDb: -100,
    peakHoldDb: -100,
    lastLimitState: 'Standby',
    playbackActive: false,
    analyserHealthy: false,
    silentFrames: 0,
    hudFallbackPhase: 0
  };

  const elements = {
    overlay: document.getElementById('bootOverlay'),
    bootButton: document.getElementById('bootButton'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    stopBtn: document.getElementById('stopBtn'),
    reconnectBtn: document.getElementById('reconnectBtn'),
    muteBtn: document.getElementById('muteBtn'),
    volumeRange: document.getElementById('volumeRange'),
    historyToggle: document.getElementById('historyToggle'),
    metaLamp: document.getElementById('metaLamp'),
    audioLamp: document.getElementById('audioLamp'),
    sourceLamp: document.getElementById('sourceLamp'),
    healthLamp: document.getElementById('healthLamp'),
    playerLamp: document.getElementById('playerLamp'),
    streamStatus: document.getElementById('streamStatus'),
    sourceLabel: document.getElementById('sourceLabel'),
    fallbackText: document.getElementById('fallbackText'),
    metaText: document.getElementById('metaText'),
    healthText: document.getElementById('healthText'),
    playerText: document.getElementById('playerText'),
    titleText: document.getElementById('titleText'),
    artistText: document.getElementById('artistText'),
    nowPlaying: document.getElementById('nowPlaying'),
    listenersText: document.getElementById('listenersText'),
    bitrateText: document.getElementById('bitrateText'),
    djText: document.getElementById('djText'),
    streamNameText: document.getElementById('streamNameText'),
    genreText: document.getElementById('genreText'),
    serverText: document.getElementById('serverText'),
    historyOverlay: document.getElementById('historyOverlay'),
    historyList: document.getElementById('historyList'),
    volumeHint: document.getElementById('volumeHint'),
    audio: document.getElementById('radio'),
    coverImage: document.getElementById('coverImage'),
    leftMeterFill: document.getElementById('leftMeterFill'),
    rightMeterFill: document.getElementById('rightMeterFill'),
    boostButtons: Array.from(document.querySelectorAll('[data-boost-stage]')),
    boostValueText: document.getElementById('boostValueText'),
    grValueText: document.getElementById('grValueText'),
    peakValueText: document.getElementById('peakValueText'),
    driveValueText: document.getElementById('driveValueText'),
    liftValueText: document.getElementById('liftValueText'),
    targetValueText: document.getElementById('targetValueText'),
    chainStateText: document.getElementById('chainStateText'),
    grBarFill: document.getElementById('grBarFill'),
    limitLamp: document.getElementById('limitLamp'),
    limitStateText: document.getElementById('limitStateText'),
    audioEngineStatus: document.getElementById('audioEngineStatus'),
    eqBars: Array.from({ length: 10 }, (_, index) => document.getElementById(`eqBar${index}`))
  };

  applyThemeVars();
  applyLabels();
  applyModeLamp();
  applyViewportHeight();
  window.addEventListener('resize', applyViewportHeight, { passive: true });
  window.addEventListener('orientationchange', applyViewportHeight, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportHeight, { passive: true });
  }

  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isiOS && elements.volumeHint) {
    elements.volumeHint.textContent = 'Ein Tipp auf OK initialisiert Audio. Lautstärke zusätzlich über iPhone-Tasten möglich.';
  }

  setLamp(elements.metaLamp, 'lamp-red');
  setLamp(elements.audioLamp, 'lamp-red');
  setLamp(elements.sourceLamp, 'lamp-cyan');
  setHealth('ready', 'Ready');
  setSource(false);
  setMetadataStatus('Loading...');
  updateBoostHud(0);
  updateAutoChainHud({ driveDb: state.hotDriveDb, liftDb: state.autoLiftDb, targetDb: state.targetDb, chainState: state.autoChainActive ? 'AUTOCHAIN ACTIVE' : 'BOOST READY' });
  updateDynamicsHud({ grDb: 0, peakDb: -100, limitState: 'Standby', energy: 0.08, bass: 0.06 });

  bindPress(elements.bootButton, async () => {
    if (state.booted) return;
    state.booted = true;
    if (elements.bootButton) elements.bootButton.disabled = true;
    await runBootSequence();
    elements.overlay?.classList.add('hidden');
    await safePlay();
  });

  bindPress(elements.playBtn, async () => {
    await safePlay();
  });

  bindPress(elements.pauseBtn, () => {
    hardDisconnectStream('pause');
  });

  bindPress(elements.stopBtn, () => {
    hardDisconnectStream('stop');
  });

  bindPress(elements.reconnectBtn, async () => {
    hardDisconnectStream('stop');
    await safePlay();
  });

  bindPress(elements.muteBtn, () => {
    state.muted = !state.muted;
    elements.audio.muted = state.muted;
    elements.muteBtn.textContent = state.muted ? 'Unmute' : 'Mute';
  });

  elements.volumeRange?.addEventListener('input', () => {
    const value = Number(elements.volumeRange.value);
    elements.audio.volume = Number.isFinite(value) ? value : 1;
  });

  bindPress(elements.historyToggle, () => {
    state.historyOpen = !state.historyOpen;
    elements.historyOverlay?.classList.toggle('hidden', !state.historyOpen);
  });

  elements.boostButtons.forEach((button) => {
    bindPress(button, async () => {
      const stage = Number(button.dataset.boostStage || '0');
      await ensureAudioGraph();
      setBoostStage(stage);
    });
  });

  elements.audio?.addEventListener('playing', async () => {
    state.playbackActive = true;
    state.autoChainReady = true;
    state.autoChainActive = true;
    setStatus('Playing');
    setLamp(elements.audioLamp, 'lamp-green');
    updateEngineState('LIVE', true, false);
    await ensureAudioGraph();
    startMeterLoop();
  });

  elements.audio?.addEventListener('pause', () => {
    state.playbackActive = false;
    state.autoChainActive = false;
    setMeterHeights(2, 2);
  });

  elements.audio?.addEventListener('error', async () => {
    state.playbackActive = false;
    state.autoChainActive = false;
    if (!state.usingFallback) {
      try {
        await tryPlayFallback();
        setStatus('Playing');
        setLamp(elements.audioLamp, 'lamp-green');
        updateEngineState('LIVE', true, false);
        startPolling();
        return;
      } catch (error) {
        // Bleibt beim Fehlerstatus.
      }
    }
    setStatus('Audio Error');
    setLamp(elements.audioLamp, 'lamp-red');
    setMeterHeights((3) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8), (3) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8));
    updateEngineState('ERROR', false, false);
  });

  fetchMetadata();
  checkHealth();

  function stopPolling() {
    if (state.metadataTimer) clearInterval(state.metadataTimer);
    if (state.healthTimer) clearInterval(state.healthTimer);
    state.metadataTimer = null;
    state.healthTimer = null;
  }

  function stopMeterLoop() {
    if (state.meterAnim) {
      cancelAnimationFrame(state.meterAnim);
      state.meterAnim = null;
    }
    setMeterHeights(2, 2);
  }

  function hardDisconnectStream(mode = 'pause') {
    try {
      stopPolling();
      stopMeterLoop();

      if (elements.audio) {
        elements.audio.pause();
        elements.audio.removeAttribute('src');
        elements.audio.src = '';
        elements.audio.load();
      }

      state.playbackActive = false;
      state.autoChainActive = false;

      if (mode === 'stop') {
        setStatus('Stopped');
        if (elements.fallbackText) elements.fallbackText.textContent = 'Stopped';
        updateEngineState('STOPPED', false, false);
      } else {
        setStatus('Paused');
        if (elements.fallbackText) elements.fallbackText.textContent = 'Paused';
        updateEngineState('PAUSED', false, false);
      }

      setLamp(elements.audioLamp, 'lamp-pink');
    } catch (error) {
      console.error('hardDisconnectStream failed', error);
    }
  }

  function bindPress(element, handler) {
    if (!element) return;
    let pressed = false;
    const run = async (event) => {
      if (event) {
        if (event.type === 'touchend') event.preventDefault();
      }
      const now = Date.now();
      if (pressed && (now - pressed) < 450) return;
      pressed = now;
      try {
        await handler(event);
      } catch (error) {
        console.error('PRESS HANDLER ERROR', error);
      }
    };
    element.addEventListener('pointerup', run);
    element.addEventListener('touchend', run, { passive: false });
    element.addEventListener('click', run);
  }

  function applyViewportHeight() {
    const vh = window.innerHeight || document.documentElement.clientHeight || screen.height;
    doc.style.setProperty('--app-height', `${vh}px`);
  }

  function applyThemeVars() {
    const theme = uiConfig.theme;
    doc.style.setProperty('--bg', theme.backgroundBase);
    doc.style.setProperty('--bg2', theme.backgroundDeep);
    doc.style.setProperty('--cyan', theme.neonTurquoise);
    doc.style.setProperty('--pink', theme.neonPink);
    doc.style.setProperty('--green', theme.okGreen);
    doc.style.setProperty('--red', theme.errorRed);
    doc.style.setProperty('--text', theme.textMain);
    doc.style.setProperty('--muted', theme.textMuted);
    doc.style.setProperty('--border', theme.panelBorder);
    doc.style.setProperty('--glass', theme.panelGlass);
  }

  function applyLabels() {
    document.querySelectorAll('[data-label]').forEach((node) => {
      const key = node.getAttribute('data-label');
      if (uiConfig.labels[key]) node.textContent = uiConfig.labels[key];
    });
  }

  function applyModeLamp() {
    if (!elements.playerText) return;
    const isExternal = mode === 'external';
    elements.playerText.textContent = isExternal ? uiConfig.labels.modeExternal : uiConfig.labels.modeInternal;
    setLamp(elements.playerLamp, isExternal ? 'lamp-pink' : 'lamp-purple');
  }

  function setLamp(el, stateName) {
    if (!el) return;
    el.classList.remove('lamp-green', 'lamp-red', 'lamp-cyan', 'lamp-pink', 'lamp-purple');
    el.classList.add(stateName);
  }

  function setStatus(text) {
    if (elements.streamStatus) elements.streamStatus.textContent = text;
  }

  function setSource(isFallback) {
    state.usingFallback = isFallback;
    if (elements.sourceLabel) elements.sourceLabel.textContent = isFallback ? uiConfig.labels.sourceFallback : uiConfig.labels.sourcePrimary;
    if (elements.fallbackText) elements.fallbackText.textContent = isFallback ? 'Active' : 'Standby';
    setLamp(elements.sourceLamp, isFallback ? 'lamp-purple' : 'lamp-pink');
  }

  function setHealth(kind, text) {
    if (elements.healthText) elements.healthText.textContent = text;
    setLamp(elements.healthLamp, kind === 'online' ? 'lamp-green' : kind === 'ready' ? 'lamp-cyan' : 'lamp-red');
  }

  function setMetadataStatus(text) {
    if (elements.metaText) elements.metaText.textContent = text;
  }

  function pickValue(obj, keys, fallback = '') {
    const visited = new Set();

    function deepFind(target, key) {
      if (!target || typeof target !== 'object') return undefined;
      if (visited.has(target)) return undefined;
      visited.add(target);

      if (target[key] !== undefined && target[key] !== null && String(target[key]).trim() !== '') {
        return target[key];
      }

      for (const value of Object.values(target)) {
        if (value && typeof value === 'object') {
          const found = deepFind(value, key);
          if (found !== undefined && found !== null && String(found).trim() !== '') return found;
        }
      }

      return undefined;
    }

    for (const key of keys) {
      const value = deepFind(obj, key);
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }

    return fallback;
  }

  function setMeterHeights(left, right) {
    const leftHeight = Math.max(6, Math.min(100, left * 1.95));
    const rightHeight = Math.max(6, Math.min(100, right * 1.95));
    if (elements.leftMeterFill) elements.leftMeterFill.style.height = `${leftHeight}%`;
    if (elements.rightMeterFill) elements.rightMeterFill.style.height = `${rightHeight}%`;
  }

  function safeText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function splitTitle(title) {
    const cleanTitle = safeText(title, 'Live Stream');
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      return { artist: parts.shift(), title: parts.join(' - ') };
    }
    return { artist: '', title: cleanTitle };
  }

  function detectDJ(data) {
    const raw = safeText(
      pickValue(
        data,
        [
          'djusername',
          'dj',
          'dj_name',
          'djstatus',
          'client',
          'source',
          'live_dj',
          'liveDj',
          'live_dj_name',
          'djuser',
          'username',
          'broadcaster',
          'presenter',
          'autodj',
          'servergenre'
        ],
        ''
      ),
      ''
    );

    const lower = raw.toLowerCase();
    if (!raw) return DEFAULT_DJ;
    if (lower.includes('autodj') || lower.includes('auto dj') || lower === 'none' || lower === 'unknown' || lower === 'no dj') return DEFAULT_DJ;
    return raw;
  }

  function pickImageUrl(data) {
    return safeText(
      pickValue(
        data,
        [
          'artwork',
          'cover',
          'cover_url',
          'coverUrl',
          'image',
          'imageurl',
          'image_url',
          'thumbnail',
          'thumb',
          'logo',
          'picture',
          'dj_image',
          'djImage',
          'dj_picture',
          'album_art',
          'albumart',
          'art',
          'avatar',
          'photo'
        ],
        ''
      ),
      ''
    );
  }

  function normalizeTitle(data) {
    return safeText(pickValue(data, ['song', 'title', 'songtitle', 'currentSong', 'track', 'now_playing'], state.lastTitle || 'Live Stream'), 'Live Stream');
  }

  function renderHistory(items) {
    if (!elements.historyList) return;
    elements.historyList.innerHTML = '';
    if (!Array.isArray(items) || !items.length) {
      const li = document.createElement('li');
      li.textContent = 'No history loaded';
      elements.historyList.appendChild(li);
      return;
    }
    items.slice(0, 12).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = typeof item === 'string' ? item : String(pickValue(item, ['song', 'title', 'track', 'name'], 'Unknown track'));
      elements.historyList.appendChild(li);
    });
  }

  function applyCover(url) {
    if (!elements.coverImage) return;

    const cleanUrl = safeText(url, FALLBACK_COVER);
    const isFallback = cleanUrl === FALLBACK_COVER || cleanUrl.endsWith('/fallback-cover.png');

    let finalUrl = cleanUrl;
    if (!isFallback) {
      const stamp = `coverts=${Date.now()}`;
      finalUrl += cleanUrl.includes('?') ? `&${stamp}` : `?${stamp}`;
    }

    if (elements.coverImage.dataset.currentSrc === finalUrl) return;
    elements.coverImage.dataset.currentSrc = finalUrl;
    elements.coverImage.src = finalUrl;
    elements.coverImage.onerror = () => {
      elements.coverImage.dataset.currentSrc = FALLBACK_COVER;
      elements.coverImage.src = FALLBACK_COVER;
    };
  }

  function applyMetadata(data) {
    const fullTitle = normalizeTitle(data);
    state.lastTitle = fullTitle;
    if (elements.nowPlaying) elements.nowPlaying.textContent = fullTitle;
    const parts = splitTitle(fullTitle);
    if (elements.titleText) elements.titleText.textContent = parts.title || fullTitle;
    if (elements.artistText) elements.artistText.textContent = parts.artist || detectDJ(data);
    const listeners = Number.parseInt(pickValue(data, ['listeners'], 0), 10);
    const bitrate = pickValue(data, ['bitrate'], 'Unknown');
    const streamName = safeText(pickValue(data, ['servertitle', 'streamtitle', 'name', 'icy_name', 'server_name'], uiConfig.defaults.stationName), uiConfig.defaults.stationName);
    const genre = safeText(pickValue(data, ['genre', 'servergenre', 'icy_genre'], 'Unknown'), 'Unknown');
    const server = safeText(pickValue(data, ['description', 'serverdescription', 'server', 'site', 'url'], 'Live Stream'), 'Live Stream');
    if (elements.listenersText) elements.listenersText.textContent = `${Number.isFinite(listeners) ? listeners : 0} / ${streamConfig.listener_capacity}`;
    if (elements.bitrateText) elements.bitrateText.textContent = bitrate ? `${String(bitrate)} kbps` : 'Unknown';
    if (elements.djText) elements.djText.textContent = detectDJ(data);
    if (elements.streamNameText) elements.streamNameText.textContent = streamName;
    if (elements.genreText) elements.genreText.textContent = genre;
    if (elements.serverText) elements.serverText.textContent = server;
    renderHistory(pickValue(data, ['history'], []));
    applyCover(pickImageUrl(data) || FALLBACK_COVER);
  }

  async function fetchMetadata() {
    try {
      const res = await fetch(streamConfig.metadata_url, { cache: 'no-store' });
      if (!res.ok) throw new Error('metadata fetch failed');
      const data = await res.json();
      applyMetadata(data);
      setMetadataStatus(uiConfig.labels.healthOnline);
      setLamp(elements.metaLamp, 'lamp-green');
    } catch (error) {
      if (elements.nowPlaying) elements.nowPlaying.textContent = state.lastTitle || 'Metadata unavailable';
      if (elements.titleText) elements.titleText.textContent = state.lastTitle || 'Metadata unavailable';
      if (elements.artistText) elements.artistText.textContent = DEFAULT_DJ;
      if (elements.djText) elements.djText.textContent = DEFAULT_DJ;
      if (elements.streamNameText) elements.streamNameText.textContent = uiConfig.defaults.stationName;
      if (elements.genreText) elements.genreText.textContent = 'Unknown';
      if (elements.serverText) elements.serverText.textContent = 'Live Stream';
      setMetadataStatus(uiConfig.labels.healthOffline);
      setLamp(elements.metaLamp, 'lamp-red');
      applyCover(FALLBACK_COVER);
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch(streamConfig.health_url, { cache: 'no-store' });
      if (!res.ok) throw new Error('health check failed');
      setHealth('online', uiConfig.labels.healthOnline);
    } catch (error) {
      setHealth('offline', uiConfig.labels.healthOffline);
    }
  }

  function startPolling() {
    if (state.metadataTimer) clearInterval(state.metadataTimer);
    if (state.healthTimer) clearInterval(state.healthTimer);
    fetchMetadata();
    checkHealth();
    state.metadataTimer = setInterval(fetchMetadata, streamConfig.poll_interval_ms);
    state.healthTimer = setInterval(checkHealth, streamConfig.poll_interval_ms);
  }

  async function ensureAudioGraph() {
    if (!elements.audio) return false;
    try {
      if (!state.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error('AudioContext nicht unterstützt');
        state.audioContext = new AudioCtx();
      }
      if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
      }
      if (!state.mediaSourceNode) {
        state.mediaSourceNode = state.audioContext.createMediaElementSource(elements.audio);
        state.inputAnalyser = state.audioContext.createAnalyser();
        state.outputAnalyser = state.audioContext.createAnalyser();
        state.preGainNode = state.audioContext.createGain();
        state.gainNode = state.audioContext.createGain();
        state.masterGainNode = state.audioContext.createGain();
        state.dynamicsNode = state.audioContext.createDynamicsCompressor();

        state.inputAnalyser.fftSize = 2048;
        state.outputAnalyser.fftSize = 2048;
        state.inputAnalyser.smoothingTimeConstant = 0.82;
        state.outputAnalyser.smoothingTimeConstant = 0.86;

        state.inputData = new Uint8Array(state.inputAnalyser.frequencyBinCount);
        state.outputData = new Uint8Array(state.outputAnalyser.frequencyBinCount);
        state.inputWaveData = new Float32Array(state.inputAnalyser.fftSize);
        state.outputWaveData = new Float32Array(state.outputAnalyser.fftSize);

        state.preGainNode.gain.value = dbToGain(state.hotDriveDb);
        state.gainNode.gain.value = dbToGain(BOOST_STAGES_DB[state.currentBoostStage]);
        state.masterGainNode.gain.value = 0.98;
        state.dynamicsNode.threshold.value = -20;
        state.dynamicsNode.knee.value = 18;
        state.dynamicsNode.ratio.value = 4.2;
        state.dynamicsNode.attack.value = 0.003;
        state.dynamicsNode.release.value = 0.22;

        state.mediaSourceNode.connect(state.inputAnalyser);
        state.inputAnalyser.connect(state.preGainNode);
        state.preGainNode.connect(state.gainNode);
        state.gainNode.connect(state.dynamicsNode);
        state.dynamicsNode.connect(state.outputAnalyser);
        state.outputAnalyser.connect(state.masterGainNode);
        state.masterGainNode.connect(state.audioContext.destination);
      }
      setBoostStage(state.currentBoostStage);
      updateEngineState('LIVE', true, false);
      return true;
    } catch (error) {
      state.analyserHealthy = false;
      updateEngineState('BYPASS', false, false);
      setMeterHeights((6) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8), (6) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8));
      return false;
    }
  }

  function startMeterLoop() {
    if (state.meterAnim) return;
    const tick = () => {
      const audioSeemsActive = Boolean(state.playbackActive && elements.audio && !elements.audio.paused);
      if (!state.inputAnalyser || !state.outputAnalyser || !state.inputData || !state.outputData) {
        renderFallbackHud(audioSeemsActive);
        state.meterAnim = requestAnimationFrame(tick);
        return;
      }

      try {
        state.inputAnalyser.getByteFrequencyData(state.inputData);
        state.outputAnalyser.getByteFrequencyData(state.outputData);
        if (state.inputWaveData) state.inputAnalyser.getFloatTimeDomainData(state.inputWaveData);
        if (state.outputWaveData) state.outputAnalyser.getFloatTimeDomainData(state.outputWaveData);
      } catch (error) {
        renderFallbackHud(audioSeemsActive);
        state.meterAnim = requestAnimationFrame(tick);
        return;
      }

      const inputStats = analyseFrequencyData(state.inputData, state.inputWaveData);
      const outputStats = analyseFrequencyData(state.outputData, state.outputWaveData);

      if (state.autoChainReady && state.playbackActive) {
        const targetLiftDb = computeAutoLiftTarget(inputStats.rmsDb);
        const nextLift = Math.max(0, Math.min(AUTO_LIFT_MAX_DB, targetLiftDb));
        state.autoLiftDb = smoothValue(state.autoLiftDb || 0, nextLift, 0.18);
        state.autoChainActive = state.autoLiftDb > 0.08 || (state.currentBoostDb || 0) > 0;
      } else {
        state.autoLiftDb = 0;
        state.autoChainActive = false;
      }

      applyAutoChainGain();

      const compressorReduction = Math.abs(Number(state.dynamicsNode?.reduction || 0));
      const grDb = compressorReduction;
      const boostVisual = Math.max(0, Math.min(12, Number(state.currentBoostDb || 0)));
      const grVisual = Math.max(grDb, boostVisual * 0.22);
      const peakDb = outputStats.peakDb;
      const limitState = peakDb >= CLIP_TRIGGER_DB ? 'Clip' : grDb >= LIMIT_TRIGGER_DB ? 'Limiting' : 'Standby';

      const realSignal = outputStats.energy > 0.012 || outputStats.bass > 0.015 || peakDb > -70;
      if (audioSeemsActive && !realSignal) state.silentFrames += 1;
      else state.silentFrames = 0;

      if (audioSeemsActive && state.silentFrames > 48) {
        state.analyserHealthy = false;
        renderFallbackHud(true);
        updateEngineState('SIM', true, false);
        state.meterAnim = requestAnimationFrame(tick);
        return;
      }

      state.analyserHealthy = true;
      state.grDb = smoothValue(state.grDb, grDb, 0.24);
      state.peakDb = smoothValue(state.peakDb, peakDb, 0.2);
      state.peakHoldDb = Math.max(state.peakDb, state.peakHoldDb - 0.24);
      state.lastLimitState = limitState;

      const left = outputStats.leftPercent;
      const right = outputStats.rightPercent;
      setMeterHeights((left) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8), (right) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8));
      updateEqualizerBars(state.outputData);
      updateAutoChainHud({
        driveDb: state.hotDriveDb,
        liftDb: state.autoLiftDb,
        targetDb: state.targetDb,
        chainState: limitState === 'Limiting' ? 'BOOST LIMIT' : 'BOOST ACTIVE'
      });
      updateDynamicsHud({
        grDb: state.grDb,
        peakDb: state.peakHoldDb,
        limitState,
        energy: outputStats.energy,
        bass: outputStats.bass
      });
      updateEngineState(limitState === 'Standby' ? 'LIVE' : limitState.toUpperCase(), true, limitState !== 'Standby');
      state.meterAnim = requestAnimationFrame(tick);
    };
    state.meterAnim = requestAnimationFrame(tick);
  }

  function renderFallbackHud(isActive) {
    state.hudFallbackPhase += isActive ? 0.15 : 0.04;
    const phase = state.hudFallbackPhase;
    const base = isActive ? 28 : 8;
    const volumeFactor = Number(elements.volumeRange?.value || elements.audio?.volume || 1);
    const boostFactor = Math.min(1, state.currentBoostDb / 18);
    const liftFactor = Math.min(1, state.autoLiftDb / Math.max(1, AUTO_LIFT_MAX_DB));
    const swing = isActive ? (Math.sin(phase) * 16 + Math.sin(phase * 1.93) * 10) : 0;
    const swing2 = isActive ? (Math.sin(phase * 1.21 + 1.4) * 15 + Math.sin(phase * 2.4) * 8) : 0;
    const left = Math.max(6, Math.min(100, base + swing + (volumeFactor * 18) + (boostFactor * 12) + (liftFactor * 10)));
    const right = Math.max(6, Math.min(100, base + swing2 + (volumeFactor * 16) + (boostFactor * 10) + (liftFactor * 10)));
    const pseudoGr = isActive ? Math.max(0, Math.min(9, state.currentBoostDb * 0.28 + (Math.sin(phase * 1.4) + 1) * 0.7)) : 0;
    const pseudoPeak = isActive ? Math.max(-24, -12 + Math.sin(phase * 1.1) * 4 + boostFactor * 5 + liftFactor * 3) : -96;
    const pseudoLimit = pseudoPeak > -1.5 ? 'Limiting' : 'Standby';
    setMeterHeights((left) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8), (right) + Math.max(0, Number(state.currentBoostDb || 0) * 2.8));
    updateEqualizerBars(Array.from({ length: 256 }, (_, i) => {
      const spread = 0.55 + (i / 256) * 0.45;
      return Math.max(0, Math.min(255, Math.round((90 + Math.sin((phase * 2.2) + (i * 0.18)) * 70) * spread)));
    }));
    updateBoostHud(state.currentBoostDb);
    updateAutoChainHud({
      driveDb: state.hotDriveDb,
      liftDb: state.autoLiftDb,
      targetDb: state.targetDb,
      chainState: isActive ? 'BOOST SIM' : 'IDLE'
    });
    updateDynamicsHud({
      grDb: pseudoGr,
      peakDb: pseudoPeak,
      limitState: pseudoLimit,
      energy: Math.min(1, left / 100),
      bass: Math.min(1, right / 100)
    });
  }

  function analyseFrequencyData(data, waveData = null) {
    const length = data.length || 1;
    const third = Math.max(1, Math.floor(length / 3));
    const half = Math.max(1, Math.floor(length / 2));
    let total = 0;
    let left = 0;
    let right = 0;
    let bass = 0;
    let peak = 0;
    for (let i = 0; i < length; i += 1) {
      const value = data[i];
      total += value;
      if (i < half) left += value;
      else right += value;
      if (i < third) bass += value;
      if (value > peak) peak = value;
    }
    const overall = (total / length) / 255;
    const bassAvg = (bass / third) / 255;
    const leftAvg = (left / half) / 255;
    const rightAvg = (right / Math.max(1, length - half)) / 255;
    const rms = computeRms(waveData);
    return {
      overall,
      overallDb: linearToDb(overall),
      rms,
      rmsDb: linearToDb(rms),
      bass: bassAvg,
      peak,
      peakDb: linearToDb(peak / 255),
      energy: Math.min(1, overall * 1.65),
      leftPercent: leftAvg * 100,
      rightPercent: rightAvg * 100
    };
  }

  function setBoostStage(stageIndex) {
    const safeStage = Math.max(0, Math.min(BOOST_STAGES_DB.length - 1, Number(stageIndex) || 0));
    state.currentBoostStage = safeStage;
    state.currentBoostDb = BOOST_STAGES_DB[safeStage];
    const now = state.audioContext?.currentTime || 0;
    if (state.gainNode) {
      state.gainNode.gain.setTargetAtTime(dbToGain(state.currentBoostDb), now, 0.018);
    }
    if (state.masterGainNode) {
      const masterTrimDb = state.currentBoostDb >= 12 ? -2.5 : state.currentBoostDb >= 6 ? -1.2 : 0;
      state.masterGainNode.gain.setTargetAtTime(dbToGain(masterTrimDb), now, 0.03);
    }
    if (elements.audio) {
      elements.audio.volume = state.currentBoostDb >= 18 ? 1 : state.currentBoostDb >= 12 ? 0.98 : state.currentBoostDb >= 6 ? 0.94 : 0.9;
    }
    updateBoostHud(state.currentBoostDb);
  }

  function applyAutoChainGain() {
    if (!state.preGainNode) return;
    const totalDb = (state.currentBoostDb || 0) + (state.autoLiftDb || 0);
    const now = state.audioContext?.currentTime || 0;
    state.preGainNode.gain.setTargetAtTime(dbToGain(totalDb), now, 0.08);
  }

  function computeAutoLiftTarget(inputRmsDb) {
    if (!Number.isFinite(inputRmsDb)) return 0;
    const needed = state.targetDb - inputRmsDb;
    return Math.max(0, Math.min(AUTO_LIFT_MAX_DB, needed));
  }

  function updateEqualizerBars(data) {
    if (!elements.eqBars || !elements.eqBars.length || !data || !data.length) return;
    const bins = elements.eqBars.length;
    const slice = Math.max(1, Math.floor(data.length / bins));
    elements.eqBars.forEach((bar, index) => {
      if (!bar) return;
      let sum = 0;
      let count = 0;
      const start = index * slice;
      const end = Math.min(data.length, index === bins - 1 ? data.length : start + slice);
      for (let i = start; i < end; i += 1) {
        sum += data[i];
        count += 1;
      }
      const avg = count ? (sum / count) / 255 : 0;
      const weighted = Math.min(1, Math.pow(avg, 0.78) * 1.18);
      const height = 10 + (weighted * 90);
      bar.style.height = `${height.toFixed(2)}%`;
    });
  }

  function updateBoostHud(boostDb) {
    if (elements.boostValueText) {
      elements.boostValueText.textContent = `${boostDb.toFixed(1)} dB`;
    }
    elements.boostButtons.forEach((button, index) => {
      button.classList.toggle('is-active', index === state.currentBoostStage);
    });
  }

  function updateAutoChainHud({ driveDb, liftDb, targetDb, chainState }) {
    if (elements.driveValueText) elements.driveValueText.textContent = `${driveDb >= 0 ? '+' : ''}${driveDb.toFixed(1)} dB`;
    if (elements.liftValueText) elements.liftValueText.textContent = `${liftDb >= 0 ? '+' : ''}${liftDb.toFixed(1)} dB`;
    if (elements.targetValueText) elements.targetValueText.textContent = `${targetDb.toFixed(1)} dB`;
    if (elements.chainStateText) elements.chainStateText.textContent = chainState;
  }

  function updateDynamicsHud({ grDb, peakDb, limitState, energy, bass }) {
    const safeGr = Math.max(0, grDb);
    const safePeak = Number.isFinite(peakDb) ? peakDb : -100;
    if (elements.grValueText) elements.grValueText.textContent = `${safeGr.toFixed(1)} dB`;
    if (elements.peakValueText) elements.peakValueText.textContent = safePeak <= -96 ? MINUS_INF_TEXT : `${safePeak.toFixed(1)} dB`;
    if (elements.limitStateText) elements.limitStateText.textContent = limitState;
    if (elements.grBarFill) {
      const width = Math.max(0, Math.min(100, (safeGr / 12) * 100));
      elements.grBarFill.style.width = `${width}%`;
    }
    setLamp(elements.limitLamp, limitState === 'Clip' ? 'lamp-pink' : limitState === 'Limiting' ? 'lamp-pink' : safeGr > 0.15 ? 'lamp-purple' : 'lamp-cyan');
    doc.style.setProperty('--audio-energy', energy.toFixed(3));
    doc.style.setProperty('--audio-bass', bass.toFixed(3));
    doc.style.setProperty('--gr-depth', safeGr.toFixed(3));
  }

  function updateEngineState(label, isLive, isLimit) {
    if (!elements.audioEngineStatus) return;
    elements.audioEngineStatus.textContent = label;
    elements.audioEngineStatus.classList.toggle('is-live', Boolean(isLive));
    elements.audioEngineStatus.classList.toggle('is-limit', Boolean(isLimit));
  }

  async function tryPlayPrimary() {
    elements.audio.src = streamConfig.stream_url;
    await elements.audio.play();
    setSource(false);
  }

  async function tryPlayFallback() {
    elements.audio.src = streamConfig.fallback_stream_url;
    await elements.audio.play();
    setSource(true);
  }

  async function safePlay() {
    try {
      await ensureAudioGraph();
      await tryPlayPrimary();
      setStatus('Playing');
      setLamp(elements.audioLamp, 'lamp-green');
      state.playbackActive = true;
      startMeterLoop();
      startPolling();
      return true;
    } catch (primaryError) {
      try {
        await ensureAudioGraph();
        await tryPlayFallback();
        setStatus('Playing');
        setLamp(elements.audioLamp, 'lamp-green');
        state.playbackActive = true;
        startMeterLoop();
        startPolling();
        return true;
      } catch (fallbackError) {
        setStatus('Audio Error');
        setLamp(elements.audioLamp, 'lamp-red');
        updateEngineState('ERROR', false, false);
        return false;
      }
    }
  }

  function runBootSequence() {
    return new Promise((resolve) => {
      let percent = 0;
      const timer = setInterval(() => {
        percent += 4;
        if (percent > 100) percent = 100;
        if (elements.progressBar) elements.progressBar.style.width = `${percent}%`;
        if (elements.progressText) elements.progressText.textContent = `${percent}%`;
        if (percent >= 100) {
          clearInterval(timer);
          resolve();
        }
      }, 42);
    });
  }
}

function dbToGain(db) {
  return Math.pow(10, db / 20);
}

function linearToDb(linear) {
  const safe = Math.max(Number(linear) || 0, 0.000001);
  return 20 * Math.log10(safe);
}

function smoothValue(current, target, factor) {
  if (!Number.isFinite(current)) return target;
  return current + ((target - current) * factor);
}


try {
  initPlayer({
    streamConfig: STREAM_CONFIG,
    uiConfig: UI_CONFIG,
    mode: 'internal',
    assetPrefix: '.'
  });
  window.__RADIO_BOOT_OK__ = true;
} catch (error) {
  window.__RADIO_BOOT_OK__ = false;
  console.error('PLAYER INIT ERROR', error);
  var txt = document.getElementById('progressText');
  var note = document.getElementById('volumeHint');
  var btn = document.getElementById('bootButton');
  if (txt) txt.textContent = 'BOOT ERROR';
  if (note) note.textContent = 'JS-Init Fehler: ' + (error && error.message ? error.message : error);
  if (btn) { btn.disabled = false; btn.textContent = 'Reload'; btn.addEventListener('click', function(){ location.reload(); }); }
}
})();
