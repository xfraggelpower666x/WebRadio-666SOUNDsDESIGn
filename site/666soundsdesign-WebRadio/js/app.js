(() => {
  const cfg = window.RADIO_CONFIG || {};
  const base = String(cfg.radioBase || '').replace(/\/$/, '');
  const ep = cfg.endpoints || {};
  const ui = cfg.ui || {};

  const urls = {
    health: `${base}${ep.health || '/health'}`,
    status: `${base}${ep.status || '/status'}`,
    metadata: `${base}${ep.metadata || '/metadata'}`,
    listeners: `${base}${ep.listeners || '/listeners'}`,
    history: `${base}${ep.history || '/history'}`,
    debug: `${base}${ep.debug || '/debug'}`,
    stream: `${base}${ep.stream || '/stream'}`,
    backup: `${base}${ep.backup || '/backup'}`,
  };

  const POLL_MS = Number(ui.pollMs || 7000);
  const REQ_TIMEOUT = Number(ui.requestTimeoutMs || 4500);
  const STALL_TIMEOUT = Number(ui.stallTimeoutMs || 18000);
  const FALLBACK_COVER = ui.fallbackCover || 'assets/fallback.jpg';

  const $ = (id) => document.getElementById(id);
  const audio = $('audioPlayer');
  audio.crossOrigin = 'anonymous';
  audio.preload = 'none';
  audio.volume = 0.82;

  const els = {
    clockText: $('clockText'), fullscreenState: $('fullscreenState'),
    trackTitle: $('trackTitle'), trackMeta: $('trackMeta'), signalBadge: $('signalBadge'), coverImage: $('coverImage'),
    sourceText: $('sourceText'), listenersText: $('listenersText'), uniqueText: $('uniqueText'), bitrateText: $('bitrateText'), djText: $('djText'), buildText: $('buildText'),
    workerState: $('workerState'), healthState: $('healthState'), statusApiState: $('statusApiState'), metadataState: $('metadataState'), listenersApiState: $('listenersApiState'), historyApiState: $('historyApiState'),
    audioState: $('audioState'), streamState: $('streamState'), failsafeState: $('failsafeState'),
    historyList: $('historyList'), debugBox: $('debugBox'),
    routeStream: $('routeStream'), routeBackup: $('routeBackup'), routeStatus: $('routeStatus'), routeMetadata: $('routeMetadata'), routeListeners: $('routeListeners'), routeHistory: $('routeHistory'),
    ledClock: $('ledClock'), ledFullscreen: $('ledFullscreen'), ledWorker: $('ledWorker'), ledHealth: $('ledHealth'), ledStatusApi: $('ledStatusApi'), ledMetadata: $('ledMetadata'), ledListeners: $('ledListeners'), ledHistory: $('ledHistory'), ledAudio: $('ledAudio'), ledStream: $('ledStream'), ledFallback: $('ledFallback'),
    volumeRange: $('volumeRange'), safeModeBtn: $('safeModeBtn'), muteBtn: $('muteBtn')
  };

  const meterL = $('meterLeft');
  const meterC = $('meterCenter');
  const meterR = $('meterRight');
  const ringMeter = $('ringMeter');

  let currentSource = 'main';
  let safeMode = true;
  let muted = false;
  let audioCtx = null;
  let sourceNode = null;
  let splitter = null;
  let analyserL = null;
  let analyserR = null;
  let analyserMix = null;
  let freqData = null;
  let leftData = null;
  let rightData = null;
  let smoothedMix = 0.04;
  let lastGoodAudioAt = Date.now();
  let stallTimer = null;
  let pollTimer = null;
  let lastStatus = null;

  function setLed(el, state) {
    if (!el) return;
    el.className = 'led';
    if (state === 'ok') el.classList.add('led-ok');
    else if (state === 'warn') el.classList.add('led-warn');
    else if (state === 'bad') el.classList.add('led-bad');
  }

  function updateClock() {
    const d = new Date();
    els.clockText.textContent = d.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLed(els.ledClock, 'ok');
  }

  function setRouteStates(okMap) {
    const map = [
      ['routeStream', 'stream'], ['routeBackup', 'backup'], ['routeStatus', 'status'],
      ['routeMetadata', 'metadata'], ['routeListeners', 'listeners'], ['routeHistory', 'history']
    ];
    for (const [id, key] of map) {
      els[id].textContent = okMap[key] ? 'OK' : 'WAIT';
    }
  }

  function jsonString(v) {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  async function fetchJson(url, timeout = REQ_TIMEOUT) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function normalizeListenersData(data) {
    return {
      listeners: data?.listeners ?? data?.metadata?.listeners ?? 0,
      unique: data?.unique ?? data?.unique_listeners ?? data?.metadata?.unique ?? 0,
      bitrate: data?.bitrate ?? data?.metadata?.bitrate ?? '—'
    };
  }

  function normalizeMetaData(data) {
    return {
      title: data?.title ?? data?.song ?? data?.metadata?.title ?? 'Awaiting transmission…',
      dj: data?.djusername ?? data?.dj ?? data?.metadata?.dj ?? '666SOUNDsDESIGn',
      art: data?.art ?? data?.cover ?? data?.image ?? FALLBACK_COVER,
      updatedAt: data?.updatedAt ?? 0,
      stream: data?.stream ?? data?.metadata?.stream ?? 'offline'
    };
  }

  function renderHistory(items) {
    const list = Array.isArray(items?.history) ? items.history : Array.isArray(items) ? items : [];
    if (!list.length) {
      els.historyList.innerHTML = '<div class="history-item"><strong>Keine History</strong><span>Der Worker liefert aktuell noch keine Verlaufseinträge.</span></div>';
      return;
    }
    els.historyList.innerHTML = list.slice(0, 8).map((entry) => {
      const title = entry.song || entry.title || entry.track || 'Unknown track';
      const time = entry.ts || entry.time || entry.played_at || '';
      return `<div class="history-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(time)}</span></div>`;
    }).join('');
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function updateMainUI(statusData, metaData, listenersData) {
    const meta = normalizeMetaData(metaData || statusData?.metadata || {});
    const listenerInfo = normalizeListenersData(listenersData || statusData || {});
    const streamStatus = statusData?.streamStatus?.selectedSource || currentSource.toUpperCase();

    els.trackTitle.textContent = meta.title || 'Awaiting transmission…';
    els.trackMeta.textContent = `${streamStatus} · ${meta.dj || 'Unknown DJ'} · ${listenerInfo.bitrate || '—'} kbps`;
    els.signalBadge.textContent = audio.paused ? 'STANDBY' : 'LIVE';
    els.sourceText.textContent = String(currentSource).toUpperCase();
    els.listenersText.textContent = String(listenerInfo.listeners ?? 0);
    els.uniqueText.textContent = String(listenerInfo.unique ?? 0);
    els.bitrateText.textContent = String(listenerInfo.bitrate ?? '—');
    els.djText.textContent = meta.dj || '—';
    els.buildText.textContent = statusData?.build || 'V1';
    els.coverImage.src = meta.art || FALLBACK_COVER;
  }

  async function refreshWorkerData() {
    const okMap = { stream: true, backup: true, status: false, metadata: false, listeners: false, history: false };
    try {
      const [health, status, metadata, listeners, history, debug] = await Promise.all([
        fetchJson(urls.health).catch((e) => ({ error: String(e) })),
        fetchJson(urls.status),
        fetchJson(urls.metadata),
        fetchJson(urls.listeners),
        fetchJson(urls.history),
        fetchJson(urls.debug).catch(() => null)
      ]);

      okMap.status = true; okMap.metadata = true; okMap.listeners = true; okMap.history = true;
      setRouteStates(okMap);

      setLed(els.ledWorker, health?.status === 'ok' ? 'ok' : 'bad');
      setLed(els.ledHealth, health?.status === 'ok' ? 'ok' : 'bad');
      setLed(els.ledStatusApi, 'ok');
      setLed(els.ledMetadata, 'ok');
      setLed(els.ledListeners, 'ok');
      setLed(els.ledHistory, 'ok');

      els.workerState.textContent = status?.worker || 'ONLINE';
      els.healthState.textContent = health?.status === 'ok' ? 'OK' : 'ERROR';
      els.statusApiState.textContent = 'OK';
      els.metadataState.textContent = 'OK';
      els.listenersApiState.textContent = 'OK';
      els.historyApiState.textContent = 'OK';

      updateMainUI(status, metadata, listeners);
      renderHistory(history);
      els.debugBox.textContent = jsonString(debug || status);
      lastStatus = status;
    } catch (err) {
      setLed(els.ledWorker, 'warn');
      setLed(els.ledHealth, 'bad');
      setLed(els.ledStatusApi, 'bad');
      setLed(els.ledMetadata, 'warn');
      setLed(els.ledListeners, 'warn');
      setLed(els.ledHistory, 'warn');
      els.workerState.textContent = 'UNREACHABLE';
      els.healthState.textContent = 'ERROR';
      els.statusApiState.textContent = 'ERROR';
      els.metadataState.textContent = 'WAIT';
      els.listenersApiState.textContent = 'WAIT';
      els.historyApiState.textContent = 'WAIT';
      els.debugBox.textContent = `Worker poll failed:\n${String(err)}`;
      setRouteStates(okMap);
    }
  }

  async function ensureAudioContext() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    sourceNode = audioCtx.createMediaElementSource(audio);
    splitter = audioCtx.createChannelSplitter(2);
    analyserL = audioCtx.createAnalyser();
    analyserR = audioCtx.createAnalyser();
    analyserMix = audioCtx.createAnalyser();
    analyserL.fftSize = 256; analyserR.fftSize = 256; analyserMix.fftSize = 256;
    leftData = new Uint8Array(analyserL.frequencyBinCount);
    rightData = new Uint8Array(analyserR.frequencyBinCount);
    freqData = new Uint8Array(analyserMix.frequencyBinCount);
    sourceNode.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    sourceNode.connect(analyserMix);
    sourceNode.connect(audioCtx.destination);
  }

  function setAudioState(text, ledState) {
    els.audioState.textContent = text;
    setLed(els.ledAudio, ledState);
  }

  function setStreamState(text, ledState) {
    els.streamState.textContent = text;
    setLed(els.ledStream, ledState);
  }

  function setFailsafeState(text, ledState) {
    els.failsafeState.textContent = text;
    setLed(els.ledFallback, ledState);
  }

  function resetStallWatch() {
    lastGoodAudioAt = Date.now();
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (!audio.paused && Date.now() - lastGoodAudioAt >= STALL_TIMEOUT) {
        triggerFallback('STALL DETECTED');
      }
    }, STALL_TIMEOUT + 200);
  }

  async function setSource(kind) {
    currentSource = kind;
    const url = kind === 'backup' ? urls.backup : urls.stream;
    audio.pause();
    audio.src = url;
    audio.load();
    setStreamState(kind === 'backup' ? 'BACKUP ARMED' : 'MAIN PATH READY', 'warn');
  }

  async function play(kind = currentSource) {
    try {
      await ensureAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
      await setSource(kind);
      await audio.play();
      audio.classList?.add('is-playing');
      els.coverImage.classList.add('is-playing');
      setAudioState('PLAYING', 'ok');
      setStreamState(kind === 'backup' ? 'BACKUP LIVE' : 'MAIN LIVE', 'ok');
      setFailsafeState('ARMED', 'warn');
      resetStallWatch();
    } catch (err) {
      setAudioState('BLOCKED', 'bad');
      els.debugBox.textContent = `Playback failed:\n${String(err)}`;
    }
  }

  function pause() {
    audio.pause();
    els.coverImage.classList.remove('is-playing');
    setAudioState('PAUSED', 'warn');
    setStreamState('IDLE', 'warn');
  }

  function stop() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    els.coverImage.classList.remove('is-playing');
    setAudioState('STOPPED', 'warn');
    setStreamState('STANDBY', 'warn');
  }

  async function triggerFallback(reason) {
    if (!safeMode) return;
    setFailsafeState(reason, 'bad');
    try {
      await play('backup');
      setFailsafeState('BACKUP ACTIVE', 'ok');
    } catch {
      setFailsafeState('FALLBACK FAILED', 'bad');
    }
  }

  function drawBarCanvas(canvas, values, vertical = true) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 100;
    const h = canvas.clientHeight || 100;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, w, h);
    if (!values) return;
    const bars = Math.min(24, values.length);
    for (let i = 0; i < bars; i++) {
      const value = values[i] / 255;
      const gap = 4;
      if (vertical) {
        const barH = Math.max(6, value * (h - 12));
        const barW = (w - gap * (bars + 1)) / bars;
        const x = gap + i * (barW + gap);
        const y = h - barH - 6;
        const grad = ctx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, '#ff4fcf');
        grad.addColorStop(1, '#5ff5ff');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);
      }
    }
  }

  function drawRing(values) {
    const canvas = ringMeter;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 420;
    const h = canvas.clientHeight || 420;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, base = Math.min(w, h) * 0.31;
    ctx.beginPath(); ctx.arc(cx, cy, base, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(95,245,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
    if (!values) return;
    const bars = Math.min(80, values.length);
    for (let i = 0; i < bars; i++) {
      const value = values[i] / 255;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const inner = base + 12;
      const outer = inner + 18 + value * 60;
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'rgba(95,245,255,.25)');
      grad.addColorStop(1, 'rgba(255,79,207,.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 + value * 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }

  function animateMeters() {
    requestAnimationFrame(animateMeters);
    if (!analyserMix || audio.paused) {
      drawBarCanvas(meterL, leftData || new Uint8Array(24));
      drawBarCanvas(meterC, freqData || new Uint8Array(24));
      drawBarCanvas(meterR, rightData || new Uint8Array(24));
      drawRing(freqData || new Uint8Array(80));
      return;
    }
    analyserL.getByteFrequencyData(leftData);
    analyserR.getByteFrequencyData(rightData);
    analyserMix.getByteFrequencyData(freqData);
    const mean = freqData.reduce((a, b) => a + b, 0) / Math.max(1, freqData.length) / 255;
    smoothedMix = smoothedMix * 0.84 + mean * 0.16;
    drawBarCanvas(meterL, leftData);
    drawBarCanvas(meterC, freqData);
    drawBarCanvas(meterR, rightData);
    drawRing(freqData);
    lastGoodAudioAt = Date.now();
  }

  function bindEvents() {
    $('playMainBtn').addEventListener('click', () => play('main'));
    $('playBackupBtn').addEventListener('click', () => play('backup'));
    $('pauseBtn').addEventListener('click', pause);
    $('stopBtn').addEventListener('click', stop);
    $('fullscreenBtn').addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch {}
    });

    document.addEventListener('fullscreenchange', () => {
      const active = Boolean(document.fullscreenElement);
      els.fullscreenState.textContent = active ? 'FULLSCREEN ACTIVE' : 'WINDOW MODE';
      setLed(els.ledFullscreen, active ? 'ok' : 'warn');
    });

    els.volumeRange.addEventListener('input', (e) => { audio.volume = Number(e.target.value); });

    els.safeModeBtn.addEventListener('click', () => {
      safeMode = !safeMode;
      els.safeModeBtn.textContent = safeMode ? 'ON' : 'OFF';
      els.safeModeBtn.classList.toggle('active', safeMode);
      setFailsafeState(safeMode ? 'ARMED' : 'DISABLED', safeMode ? 'warn' : 'bad');
    });

    els.muteBtn.addEventListener('click', () => {
      muted = !muted;
      audio.muted = muted;
      els.muteBtn.textContent = muted ? 'ON' : 'OFF';
      els.muteBtn.classList.toggle('active', muted);
    });

    audio.addEventListener('playing', () => {
      setAudioState('PLAYING', 'ok');
      els.coverImage.classList.add('is-playing');
      els.signalBadge.textContent = 'LIVE';
      resetStallWatch();
    });
    audio.addEventListener('pause', () => {
      if (!audio.src) return;
      setAudioState('PAUSED', 'warn');
      els.coverImage.classList.remove('is-playing');
      els.signalBadge.textContent = 'PAUSED';
    });
    audio.addEventListener('error', () => {
      setAudioState('ERROR', 'bad');
      els.signalBadge.textContent = 'ERROR';
      triggerFallback('AUDIO ERROR');
    });
    audio.addEventListener('stalled', () => triggerFallback('STREAM STALLED'));
    audio.addEventListener('waiting', () => setStreamState('BUFFERING', 'warn'));
    audio.addEventListener('canplay', () => {
      lastGoodAudioAt = Date.now();
      setStreamState(currentSource === 'backup' ? 'BACKUP READY' : 'MAIN READY', 'ok');
    });
  }

  function init() {
    updateClock();
    setInterval(updateClock, 1000);
    bindEvents();
    animateMeters();
    refreshWorkerData();
    pollTimer = setInterval(refreshWorkerData, POLL_MS);
    setRouteStates({ stream: true, backup: true, status: false, metadata: false, listeners: false, history: false });
    setFailsafeState('ARMED', 'warn');
    setAudioState('IDLE', 'warn');
    setStreamState('STANDBY', 'warn');
  }

  init();
})();
