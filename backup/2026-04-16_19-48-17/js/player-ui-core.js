
function bindPress(target, handler) {
  if (!target || typeof handler !== 'function') return;
  let lastTouchStamp = 0;
  const onTouchEnd = async (event) => {
    lastTouchStamp = Date.now();
    event.preventDefault();
    await handler(event);
  };
  const onClick = async (event) => {
    if (Date.now() - lastTouchStamp < 700) return;
    await handler(event);
  };
  target.addEventListener('touchend', onTouchEnd, { passive: false });
  target.addEventListener('click', onClick);
}

// ==========================================
// DATEI: js/player-ui-core.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Gemeinsame Frontend-Logik für externen Haupt-Player und internen Worker-Fallback.
// ÄNDERUNG: Tap-Infos für Statuslampen, kompakter Header, Logo-/Panel-UI und iPhone-sicheres
//           Touch-Verhalten ergänzt, ohne den Worker oder seine Endpunkte umzubauen.
// ==========================================

export function initPlayer({ streamConfig, uiConfig, mode = 'external', assetPrefix = '.' }) {
  const doc = document.documentElement;
  const elements = {
    bootButton: document.getElementById('bootButton'),
    overlay: document.getElementById('bootOverlay'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    reconnectBtn: document.getElementById('reconnectBtn'),
    muteBtn: document.getElementById('muteBtn'),
    volumeRange: document.getElementById('volumeRange'),
    historyToggle: document.getElementById('historyToggle'),
    metaLamp: document.getElementById('metaLamp'),
    audioLamp: document.getElementById('audioLamp'),
    sourceLamp: document.getElementById('sourceLamp'),
    healthLamp: document.getElementById('healthLamp'),
    playerLamp: document.getElementById('playerLamp'),
    playerModeOrb: document.getElementById('playerModeOrb'),
    streamStatus: document.getElementById('streamStatus'),
    sourceLabel: document.getElementById('sourceLabel'),
    fallbackText: document.getElementById('fallbackText'),
    healthText: document.getElementById('healthText'),
    playerText: document.getElementById('playerText'),
    nowPlaying: document.getElementById('nowPlaying'),
    metaText: document.getElementById('metaText'),
    listenersText: document.getElementById('listenersText'),
    bitrateText: document.getElementById('bitrateText'),
    djText: document.getElementById('djText'),
    historyOverlay: document.getElementById('historyOverlay'),
    historyList: document.getElementById('historyList'),
    volumeHint: document.getElementById('volumeHint'),
    audio: document.getElementById('radio'),
    leftMeterFill: document.getElementById('leftMeterFill'),
    rightMeterFill: document.getElementById('rightMeterFill'),
    coverImage: document.getElementById('coverImage'),
    titleText: document.getElementById('titleText'),
    artistText: document.getElementById('artistText'),
    streamNameText: document.getElementById('streamNameText'),
    genreText: document.getElementById('genreText'),
    serverText: document.getElementById('serverText'),
    infoBubble: document.getElementById('infoBubble'),
    sourceInfoBtn: document.getElementById('sourceInfoBtn'),
    healthInfoBtn: document.getElementById('healthInfoBtn'),
    metaInfoBtn: document.getElementById('metaInfoBtn'),
    audioInfoBtn: document.getElementById('audioInfoBtn')
  };

  const FALLBACK_COVER = `${assetPrefix}/assets/images/fallback-cover.png`;
  const DEFAULT_DJ = uiConfig.defaults.djName;
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
    analyser: null,
    analyserData: null,
    meterAnim: null,
    infoTimer: null
  };

  applyThemeVars();
  applyLabels();
  bindInfoTriggers();
  applyModeLamp();
  setLamp(elements.metaLamp, 'lamp-red');
  setLamp(elements.audioLamp, 'lamp-red');
  setLamp(elements.healthLamp, 'lamp-red');
  setSource(false);
  setHealth('ready', uiConfig.labels.healthReady);
  setMetadataStatus('Loading...');
  setAudioInfo(uiConfig.labels.audioPaused, 'lamp-red', uiConfig.infoTexts.audioPaused);
  setMeterHeights(2, 2);
  applyCover(FALLBACK_COVER);
  if (elements.djText) elements.djText.textContent = DEFAULT_DJ;
  if (elements.artistText) elements.artistText.textContent = DEFAULT_DJ;

  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isiOS && elements.volumeHint) {
    elements.volumeHint.textContent = 'Auf iPhone / iPad: erst Audio Start tippen, dann laufen Stream und Meter sauber.';
  }

  bindPress(elements.bootButton, async () => {
    if (state.booted) return;
    state.booted = true;
    elements.bootButton.disabled = true;
    await runBootSequence();
    elements.overlay?.classList.add('hidden');
    await safePlay();
  });

  bindPress(elements.playBtn, async () => {
    await safePlay();
  });

  bindPress(elements.pauseBtn, () => {
    elements.audio.pause();
    setAudioInfo(uiConfig.labels.audioPaused, 'lamp-red', uiConfig.infoTexts.audioPaused);
    setStatus(uiConfig.labels.audioPaused);
  });

  bindPress(elements.reconnectBtn, async () => {
    elements.audio.pause();
    elements.audio.src = '';
    await safePlay();
  });

  bindPress(elements.muteBtn, () => {
    state.muted = !state.muted;
    elements.audio.muted = state.muted;
    elements.muteBtn.textContent = state.muted ? 'Unmute' : 'Mute';
    showInfo(state.muted ? 'Audio ist stummgeschaltet.' : 'Audio ist wieder hörbar.');
  });

  elements.volumeRange?.addEventListener('input', () => {
    elements.audio.volume = Number(elements.volumeRange.value);
  });

  bindPress(elements.historyToggle, () => {
    state.historyOpen = !state.historyOpen;
    elements.historyOverlay?.classList.toggle('hidden', !state.historyOpen);
  });

  elements.audio?.addEventListener('playing', async () => {
    setStatus(uiConfig.labels.audioPlaying);
    setAudioInfo(uiConfig.labels.audioPlaying, 'lamp-green', uiConfig.infoTexts.audioPlaying);
    await setupAudioMeter();
  });

  elements.audio?.addEventListener('pause', () => {
    setMeterHeights(2, 2);
  });

  elements.audio?.addEventListener('error', async () => {
    if (!state.usingFallback) {
      try {
        await setupAudioMeter();
        await tryPlayFallback();
        setStatus(uiConfig.labels.audioPlaying);
        setAudioInfo(uiConfig.labels.audioPlaying, 'lamp-green', uiConfig.infoTexts.audioPlaying);
        startPolling();
        return;
      } catch (error) {
        // Wenn auch der Fallback scheitert, bleibt unten der Fehlerstatus aktiv.
      }
    }
    setStatus(uiConfig.labels.audioError);
    setAudioInfo(uiConfig.labels.audioError, 'lamp-red', uiConfig.infoTexts.audioError);
    setMeterHeights(3, 3);
  });

  fetchMetadata();
  checkHealth();

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

  function bindInfoTriggers() {
    document.querySelectorAll('.info-trigger').forEach((button) => {
      bindPress(button, (event) => {
        event.stopPropagation();
        showInfo(button.dataset.info || 'Keine Zusatzinfo hinterlegt.');
      });
    });
    document.addEventListener('click', () => hideInfo());
  }

  function showInfo(message) {
    if (!elements.infoBubble) return;
    if (state.infoTimer) clearTimeout(state.infoTimer);
    elements.infoBubble.textContent = message;
    elements.infoBubble.classList.remove('hidden');
    state.infoTimer = setTimeout(() => hideInfo(), 2800);
  }

  function hideInfo() {
    if (!elements.infoBubble) return;
    elements.infoBubble.classList.add('hidden');
  }

  function applyModeLamp() {
    if (!elements.playerText) return;
    const isExternal = mode === 'external';
    elements.playerText.textContent = isExternal ? uiConfig.labels.modeExternal : uiConfig.labels.modeInternal;
    setLamp(elements.playerLamp, isExternal ? 'lamp-cyan' : 'lamp-pink');
    if (elements.playerModeOrb) {
      elements.playerModeOrb.dataset.info = isExternal ? uiConfig.infoTexts.playerExternal : uiConfig.infoTexts.playerInternal;
      elements.playerModeOrb.setAttribute('aria-label', isExternal ? 'Externer Player aktiv' : 'Interner Fallback aktiv');
    }
  }

  function setLamp(el, stateName) {
    if (!el) return;
    el.classList.remove('lamp-green', 'lamp-red', 'lamp-cyan', 'lamp-pink');
    el.classList.add(stateName);
  }

  function setStatus(text) {
    if (elements.streamStatus) elements.streamStatus.textContent = text;
    if (elements.audioInfoBtn) elements.audioInfoBtn.dataset.info = text === uiConfig.labels.audioPlaying ? uiConfig.infoTexts.audioPlaying : text === uiConfig.labels.audioPaused ? uiConfig.infoTexts.audioPaused : uiConfig.infoTexts.audioError;
  }

  function setSource(isFallback) {
    state.usingFallback = isFallback;
    if (elements.sourceLabel) elements.sourceLabel.textContent = isFallback ? uiConfig.labels.sourceFallback : uiConfig.labels.sourcePrimary;
    if (elements.fallbackText) elements.fallbackText.textContent = isFallback ? 'Fallback Active' : 'Fallback Standby';
    setLamp(elements.sourceLamp, isFallback ? 'lamp-pink' : 'lamp-cyan');
    if (elements.sourceInfoBtn) elements.sourceInfoBtn.dataset.info = isFallback ? uiConfig.infoTexts.sourceFallback : uiConfig.infoTexts.sourcePrimary;
  }

  function setHealth(kind, text) {
    if (elements.healthText) elements.healthText.textContent = text;
    setLamp(elements.healthLamp, kind === 'online' ? 'lamp-green' : kind === 'ready' ? 'lamp-cyan' : 'lamp-red');
    if (elements.healthInfoBtn) {
      elements.healthInfoBtn.dataset.info = kind === 'online' ? uiConfig.infoTexts.healthOnline : kind === 'ready' ? uiConfig.infoTexts.healthReady : uiConfig.infoTexts.healthOffline;
    }
  }

  function setMetadataStatus(text) {
    if (elements.metaText) elements.metaText.textContent = text;
  }

  function setMetadataInfo(ok) {
    if (elements.metaInfoBtn) elements.metaInfoBtn.dataset.info = ok ? uiConfig.infoTexts.metadataOnline : uiConfig.infoTexts.metadataOffline;
  }

  function setAudioInfo(text, lampClass, infoText) {
    if (elements.streamStatus) elements.streamStatus.textContent = text;
    setLamp(elements.audioLamp, lampClass);
    if (elements.audioInfoBtn) elements.audioInfoBtn.dataset.info = infoText;
  }

  function pickValue(obj, keys, fallback = '') {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return fallback;
  }

  function setMeterHeights(left, right) {
    if (elements.leftMeterFill) elements.leftMeterFill.style.height = `${Math.max(2, Math.min(100, left))}%`;
    if (elements.rightMeterFill) elements.rightMeterFill.style.height = `${Math.max(2, Math.min(100, right))}%`;
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
    const raw = safeText(pickValue(data, ['djusername', 'dj', 'dj_name', 'djstatus', 'client', 'source', 'autodj', 'servergenre'], ''), '');
    const lower = raw.toLowerCase();
    if (!raw) return DEFAULT_DJ;
    if (lower.includes('autodj') || lower.includes('auto dj') || lower === 'none' || lower === 'unknown' || lower === 'no dj') return DEFAULT_DJ;
    return raw;
  }

  function pickImageUrl(data) {
    return safeText(pickValue(data, ['artwork', 'cover', 'cover_url', 'image', 'imageurl', 'thumbnail', 'thumb', 'logo', 'picture', 'dj_image', 'album_art', 'albumart', 'art'], ''), '');
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
    elements.coverImage.src = safeText(url, FALLBACK_COVER);
    elements.coverImage.onerror = () => {
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
      setMetadataInfo(true);
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
      setMetadataInfo(false);
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

  async function setupAudioMeter() {
    try {
      if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
      }
      if (!state.mediaSourceNode) {
        state.mediaSourceNode = state.audioContext.createMediaElementSource(elements.audio);
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 2048;
        state.analyser.smoothingTimeConstant = 0.84;
        state.analyserData = new Uint8Array(state.analyser.frequencyBinCount);
        state.mediaSourceNode.connect(state.analyser);
        state.analyser.connect(state.audioContext.destination);
      }
      if (!state.meterAnim) {
        const tick = () => {
          if (state.analyser && state.analyserData) {
            state.analyser.getByteFrequencyData(state.analyserData);
            const half = Math.floor(state.analyserData.length / 2);
            let left = 0;
            let right = 0;
            for (let i = 0; i < half; i += 1) left += state.analyserData[i];
            for (let i = half; i < state.analyserData.length; i += 1) right += state.analyserData[i];
            left = ((left / half) / 255) * 100;
            right = ((right / (state.analyserData.length - half)) / 255) * 100;
            setMeterHeights(left, right);
          }
          state.meterAnim = requestAnimationFrame(tick);
        };
        state.meterAnim = requestAnimationFrame(tick);
      }
    } catch (error) {
      setMeterHeights(6, 6);
    }
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
      await setupAudioMeter();
      await tryPlayPrimary();
      setStatus(uiConfig.labels.audioPlaying);
      setAudioInfo(uiConfig.labels.audioPlaying, 'lamp-green', uiConfig.infoTexts.audioPlaying);
      startPolling();
      return true;
    } catch (primaryError) {
      try {
        await setupAudioMeter();
        await tryPlayFallback();
        setStatus(uiConfig.labels.audioPlaying);
        setAudioInfo(uiConfig.labels.audioPlaying, 'lamp-green', uiConfig.infoTexts.audioPlaying);
        startPolling();
        return true;
      } catch (fallbackError) {
        setStatus(uiConfig.labels.audioError);
        setAudioInfo(uiConfig.labels.audioError, 'lamp-red', uiConfig.infoTexts.audioError);
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
