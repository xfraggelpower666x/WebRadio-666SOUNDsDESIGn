const WORKER_BASE = "https://666soundsdesign.fraggelpower666.workers.dev";
const STATUS_URL = `${WORKER_BASE}/status`;
const META_URL = `${WORKER_BASE}/meta`;
const NOWPLAYING_URL = `${WORKER_BASE}/nowplaying`;
const LISTENERS_URL = `${WORKER_BASE}/listeners`;
const HEALTH_URL = `${WORKER_BASE}/health`;
const DEFAULT_COVER = "assets/fallback.jpg";
const STATUS_POLL_MS = 7000;
const STALL_TIMEOUT_MS = 15000;
const LEVEL_SMOOTHING = 0.82;

const SOURCES = [
  { key: "main", label: "Main Worker Radio", url: `${WORKER_BASE}/radio`, description: "Primary worker pass-through" },
  { key: "backup", label: "Backup Stream", url: "/stream-emergency", description: "Direct backup stream" },
  { key: "sunshine", label: "Web.Radio Luxury", url: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/", description: "Additional source" }
];

const audio = document.getElementById("audioPlayer");
audio.crossOrigin = "anonymous";
audio.preload = "none";
audio.volume = 0.85;

audio.playsInline = true;

const bootOverlay = document.getElementById("bootOverlay");
const bootStatus = document.getElementById("bootStatus");
const overlayMenu = document.getElementById("overlayMenu");
const coverImage = document.getElementById("coverImage");
const coverBlurImage = document.getElementById("coverBlurImage");
const visualCoverPreview = document.getElementById("visualCoverPreview");
const workerUrlBox = document.getElementById("workerUrlBox");
const vinylRing = document.getElementById("vinylRing");
const coverFrame = document.getElementById("coverFrame");

const els = {
  workerMini: document.getElementById("workerMini"),
  workerStatus: document.getElementById("workerStatus"),
  sourceValue: document.getElementById("sourceValue"),
  listenersValue: document.getElementById("listenersValue"),
  bitrateValue: document.getElementById("bitrateValue"),
  djValue: document.getElementById("djValue"),
  heroLive: document.getElementById("heroLive"),
  songTitle: document.getElementById("songTitle"),
  heroSource: document.getElementById("heroSource"),
  heroDj: document.getElementById("heroDj"),
  heroListeners: document.getElementById("heroListeners"),
  heroBitrate: document.getElementById("heroBitrate"),
  playerTrack: document.getElementById("playerTrack"),
  fallbackLine: document.getElementById("fallbackLine"),
  timeCurrent: document.getElementById("timeCurrent"),
  timeDuration: document.getElementById("timeDuration"),
  progressRange: document.getElementById("progressRange"),
  volumeRange: document.getElementById("volumeRange"),
  sourceGrid: document.getElementById("sourceGrid"),
  overlaySources: document.getElementById("overlaySources"),
  statusJsonBox: document.getElementById("statusJsonBox"),
  reconnectState: document.getElementById("reconnectState")
};

let currentSourceKey = "main";
let reconnectArmed = true;
let audioCtx = null;
let mediaSourceNode = null;
let splitterNode = null;
let analyserLeft = null;
let analyserRight = null;
let analyserMix = null;
let meterDataLeft = null;
let meterDataRight = null;
let meterDataMix = null;
let playNonce = 0;
let isSwitchingSource = false;
let statusTimer = null;
let stallTimer = null;
let lastPlayableAt = Date.now();
let lastLoadedUrl = "";
let leftLevelSmoothed = 0.05;
let rightLevelSmoothed = 0.05;
let mixLevelSmoothed = 0.05;
let audioAnalysisEnabled = false;

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function sanitizeDjName(name) {
  const value = String(name || "").trim();
  if (!value || value.toLowerCase() === "no dj") {
    return "666 Sounds Design Webradio Auto DJ";
  }
  return value
    .replace(/radio luxury/gi, "Web.Radio Luxury")
    .replace(/diablovimay/gi, "Diablo Wee Mai");
}

function setWorkerState(ok) {
  const val = ok ? "ONLINE" : "OFFLINE";
  els.workerMini.textContent = val;
  els.workerStatus.textContent = val;
  els.heroLive.textContent = ok ? "LIVE SIGNAL LOCKED" : "SIGNAL LOST";
}

function setReconnectState(value) {
  els.reconnectState.textContent = value;
}

function getSource(key) {
  return SOURCES.find((s) => s.key === key) || SOURCES[0];
}

function setSource(source) {
  currentSourceKey = source.key;
  els.sourceValue.textContent = source.key;
  els.heroSource.textContent = source.key;
  els.playerTrack.textContent = `${source.label} — ${source.url}`;
  els.fallbackLine.textContent = source.key === "main" ? "Fallback: backup armed" : `Fallback: ${source.key} active`;
}

function setProgressLiveMode(isLive) {
  els.progressRange.disabled = isLive;
  els.progressRange.style.opacity = isLive ? "0.45" : "1";
  els.timeDuration.textContent = isLive ? "LIVE" : els.timeDuration.textContent;
}

function resetStallTimer() {
  lastPlayableAt = Date.now();
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = window.setTimeout(() => {
    const staleFor = Date.now() - lastPlayableAt;
    if (staleFor >= STALL_TIMEOUT_MS && !audio.paused) {
      triggerFallback("playback stalled");
    }
  }, STALL_TIMEOUT_MS + 250);
}

async function setAudioSource(url) {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.src = url;
  lastLoadedUrl = url;
  audio.load();
  setProgressLiveMode(true);
  resetStallTimer();
}

async function loadSource(key, options = {}) {
  const source = getSource(key);
  isSwitchingSource = true;
  setReconnectState(options.reason ? `SWITCHING: ${options.reason}` : `SWITCHING: ${source.key}`);
  await setAudioSource(source.url);
  setSource(source);
  isSwitchingSource = false;
}

async function safePlay(reason = "manual") {
  const nonce = ++playNonce;
  try {
    if (!audio.src && lastLoadedUrl) {
      audio.src = lastLoadedUrl;
      audio.load();
    }
    if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    if (nonce !== playNonce) return false;
    setReconnectState(`PLAYING: ${reason}`);
    resetStallTimer();
    return true;
  } catch (err) {
    if (nonce !== playNonce) return false;
    const message = err && err.name ? `${err.name}: ${err.message || ""}`.trim() : String(err || "play failed");
    setReconnectState(`PLAY BLOCKED: ${message}`);
    return false;
  }
}

async function fetchJson(url, timeoutMs = 4500) {
  const ctrl = new AbortController();
  const timeout = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchWorkerBundle() {
  const [health, status, nowplaying, listenerInfo] = await Promise.all([
    fetchJson(HEALTH_URL, 3500).catch((err) => ({ ok: false, error: String(err) })),
    fetchJson(STATUS_URL, 4500),
    fetchJson(NOWPLAYING_URL, 4500).catch(() => ({})),
    fetchJson(LISTENERS_URL, 4500).catch(() => ({}))
  ]);
  return { health, status, nowplaying, listenerInfo };
}

function applyCover(url) {
  const finalUrl = url && String(url).trim() !== "" ? url : DEFAULT_COVER;
  coverImage.src = finalUrl;
  coverBlurImage.src = finalUrl;
  visualCoverPreview.src = finalUrl;
}

async function updateStatus() {
  try {
    const bundle = await fetchWorkerBundle();
    const data = bundle.status || {};
    const meta = data.meta || {};
    const nowplaying = bundle.nowplaying || {};
    const listeners = bundle.listenerInfo || {};
    const djName = sanitizeDjName(nowplaying.dj || meta.dj);
    setWorkerState(Boolean(bundle.health?.ok && data.ok));
    els.listenersValue.textContent = listeners.listeners ?? meta.listeners ?? 0;
    els.bitrateValue.textContent = listeners.bitrate ?? meta.bitrate ?? 0;
    els.djValue.textContent = djName;
    els.heroDj.textContent = djName;
    els.heroListeners.textContent = listeners.listeners ?? meta.listeners ?? 0;
    els.heroBitrate.textContent = listeners.bitrate ?? meta.bitrate ?? 0;
    els.songTitle.textContent = nowplaying.song || meta.song || "---";
    els.statusJsonBox.textContent = JSON.stringify(bundle, null, 2);
    applyCover(nowplaying.art || meta.art);
  } catch (err) {
    setWorkerState(false);
    els.statusJsonBox.textContent = String(err);
    applyCover("");
  }
}

function buildMeters() {
  ["leftMeter", "rightMeter"].forEach((id) => {
    const node = document.getElementById(id);
    node.innerHTML = "";
    for (let i = 0; i < 20; i += 1) {
      const d = document.createElement("div");
      d.className = "meter-bar";
      node.appendChild(d);
    }
  });
}

function updateMeterVisual(levelLeft, levelRight) {
  const map = [["leftMeter", levelLeft], ["rightMeter", levelRight]];
  map.forEach(([id, level]) => {
    const bars = [...document.getElementById(id).children];
    const active = Math.max(0, Math.floor(level * bars.length));
    bars.forEach((bar, idx) => {
      const isActive = idx >= bars.length - active;
      bar.classList.toggle("active", isActive);
      bar.style.opacity = isActive ? "1" : "0.25";
    });
  });
}

function setReactiveVisuals(mixLevel) {
  const pulse = 1 + (mixLevel * 0.045);
  const glow = 18 + (mixLevel * 34);
  if (coverFrame) {
    coverFrame.style.transform = `scale(${pulse})`;
    coverFrame.style.boxShadow = `0 0 ${glow}px rgba(85,232,255,.28), inset 0 0 20px rgba(255,66,217,.14)`;
  }
  if (vinylRing) {
    const duration = Math.max(2.5, 9 - (mixLevel * 4.5));
    vinylRing.style.animationDuration = `${duration}s`;
    vinylRing.style.filter = `drop-shadow(0 0 ${10 + mixLevel * 18}px rgba(85,232,255,.22))`;
  }
}

function createAnalyser(ctx, fftSize = 2048, smoothing = 0.88) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothing;
  return analyser;
}

function initAudioReactive() {
  try {
    if (audioCtx) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audioCtx = new Context();
    mediaSourceNode = audioCtx.createMediaElementSource(audio);

    splitterNode = audioCtx.createChannelSplitter(2);
    analyserLeft = createAnalyser(audioCtx);
    analyserRight = createAnalyser(audioCtx);
    analyserMix = createAnalyser(audioCtx, 1024, 0.8);

    meterDataLeft = new Uint8Array(analyserLeft.fftSize);
    meterDataRight = new Uint8Array(analyserRight.fftSize);
    meterDataMix = new Uint8Array(analyserMix.fftSize);

    mediaSourceNode.connect(splitterNode);
    splitterNode.connect(analyserLeft, 0);
    splitterNode.connect(analyserRight, 1);
    mediaSourceNode.connect(analyserMix);
    mediaSourceNode.connect(audioCtx.destination);

    audioAnalysisEnabled = true;
    setReconnectState("AUDIO REACTIVE READY");
  } catch (err) {
    audioAnalysisEnabled = false;
    setReconnectState(`AUDIO CTX LIMITED: ${String(err)}`);
  }
}

function calculateRms(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const centered = (data[i] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / data.length);
}

function smoothLevel(previous, next) {
  return (previous * LEVEL_SMOOTHING) + (next * (1 - LEVEL_SMOOTHING));
}

function updateLiveProgress() {
  const current = audio.currentTime || 0;
  const duration = audio.duration || 0;
  els.timeCurrent.textContent = formatTime(current);

  const hasSeekableDuration = Number.isFinite(duration) && duration > 0 && audio.seekable && audio.seekable.length > 0;
  if (hasSeekableDuration) {
    setProgressLiveMode(false);
    els.timeDuration.textContent = formatTime(duration);
    els.progressRange.value = Math.min(100, Math.max(0, (current / duration) * 100));
  } else {
    setProgressLiveMode(true);
    els.progressRange.value = 100;
  }
}

function tickMeters() {
  if (audioAnalysisEnabled && analyserMix && meterDataMix && !audio.paused && !audio.muted) {
    analyserLeft.getByteTimeDomainData(meterDataLeft);
    analyserRight.getByteTimeDomainData(meterDataRight);
    analyserMix.getByteFrequencyData(meterDataMix);

    const leftRaw = Math.min(1, calculateRms(meterDataLeft) * 3.2);
    const rightRaw = Math.min(1, calculateRms(meterDataRight) * 3.2);

    let mixPeak = 0;
    for (let i = 0; i < meterDataMix.length; i += 1) {
      mixPeak = Math.max(mixPeak, meterDataMix[i]);
    }
    const mixRaw = Math.min(1, mixPeak / 255);

    leftLevelSmoothed = smoothLevel(leftLevelSmoothed, leftRaw);
    rightLevelSmoothed = smoothLevel(rightLevelSmoothed, rightRaw);
    mixLevelSmoothed = smoothLevel(mixLevelSmoothed, mixRaw);

    updateMeterVisual(leftLevelSmoothed, rightLevelSmoothed);
    setReactiveVisuals(mixLevelSmoothed);
  } else {
    leftLevelSmoothed = smoothLevel(leftLevelSmoothed, 0.03);
    rightLevelSmoothed = smoothLevel(rightLevelSmoothed, 0.03);
    mixLevelSmoothed = smoothLevel(mixLevelSmoothed, 0.03);
    updateMeterVisual(leftLevelSmoothed, rightLevelSmoothed);
    setReactiveVisuals(mixLevelSmoothed);
  }
  requestAnimationFrame(tickMeters);
}

function renderSources() {
  const html = SOURCES.map((source) => `
    <article class="source-card">
      <h3>${source.label}</h3>
      <p>${source.description}</p>
      <button class="cyber-btn" data-source="${source.key}">LOAD</button>
    </article>
  `).join("");
  els.sourceGrid.innerHTML = html;
  els.overlaySources.innerHTML = SOURCES.map((source) => `
    <div class="overlay-source-line">
      <div>
        <strong>${source.label}</strong>
        <div>${source.description}</div>
      </div>
      <button class="cyber-btn" data-overlay-source="${source.key}">LOAD</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-source]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await loadSource(btn.dataset.source, { reason: "manual load" });
      await safePlay(btn.dataset.source);
    });
  });
  document.querySelectorAll("[data-overlay-source]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await loadSource(btn.dataset.overlaySource, { reason: "overlay load" });
      await safePlay(btn.dataset.overlaySource);
      overlayMenu.classList.remove("active");
    });
  });
}

function bindNav() {
  document.querySelectorAll(".nav-btn[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn[data-panel]").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
    });
  });
}

function armReconnect() {
  reconnectArmed = true;
  setReconnectState("ARMED");
}

async function triggerFallback(reason) {
  if (!reconnectArmed || isSwitchingSource) return;
  if (currentSourceKey === "main") {
    els.fallbackLine.textContent = `Fallback: ${reason} -> backup`;
    await loadSource("backup", { reason });
    await safePlay(`fallback ${reason}`);
    return;
  }
  setReconnectState(`ERROR: ${reason}`);
}

async function forceReconnect() {
  const current = currentSourceKey;
  setReconnectState("RECONNECTING");
  await loadSource(current, { reason: "forced reconnect" });
  await safePlay("forced reconnect");
}

function hardStop() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  setProgressLiveMode(true);
  els.progressRange.value = 0;
  els.timeCurrent.textContent = "00:00";
  setReconnectState("STOPPED");
}

function bindTransport() {
  document.getElementById("bootEnterBtn").addEventListener("click", async () => {
    bootStatus.textContent = "SYSTEM READY";
    bootOverlay.classList.remove("active");
    initAudioReactive();
    await loadSource("main", { reason: "boot" });
    await safePlay("boot");
  });

  document.getElementById("overlayMenuBtn").addEventListener("click", () => overlayMenu.classList.add("active"));
  document.getElementById("overlayCloseBtn").addEventListener("click", () => overlayMenu.classList.remove("active"));
  document.getElementById("forceReconnectBtn").addEventListener("click", forceReconnect);
  document.getElementById("loadMainBtn").addEventListener("click", async () => { await loadSource("main", { reason: "panel" }); await safePlay("main"); });
  document.getElementById("loadBackupBtn").addEventListener("click", async () => { await loadSource("backup", { reason: "panel" }); await safePlay("backup"); });
  document.getElementById("loadSunshineBtn").addEventListener("click", async () => { await loadSource("sunshine", { reason: "panel" }); await safePlay("sunshine"); });

  document.getElementById("playMainBtn").addEventListener("click", async () => { await loadSource("main", { reason: "hero" }); await safePlay("main"); });
  document.getElementById("playBackupBtn").addEventListener("click", async () => { await loadSource("backup", { reason: "hero" }); await safePlay("backup"); });
  document.getElementById("playSunshineBtn").addEventListener("click", async () => { await loadSource("sunshine", { reason: "hero" }); await safePlay("sunshine"); });

  document.getElementById("stopBtnCenter").addEventListener("click", hardStop);
  document.getElementById("playBtn").addEventListener("click", () => safePlay("transport"));
  document.getElementById("pauseBtn").addEventListener("click", () => {
    audio.pause();
    setReconnectState("PAUSED");
  });
  document.getElementById("stopBtn").addEventListener("click", hardStop);

  els.volumeRange.addEventListener("input", (e) => {
    const nextVolume = Number(e.target.value);
    audio.volume = nextVolume;
    document.documentElement.style.setProperty("--player-volume", `${Math.round(nextVolume * 100)}%`);
  });

  els.progressRange.addEventListener("input", (e) => {
    if (els.progressRange.disabled) return;
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("timeupdate", updateLiveProgress);
  audio.addEventListener("durationchange", updateLiveProgress);
  audio.addEventListener("loadedmetadata", updateLiveProgress);
  audio.addEventListener("play", () => setReconnectState("PLAYING"));
  audio.addEventListener("pause", () => {
    if (audio.ended) return;
    if (audio.src) setReconnectState("PAUSED");
  });

  ["playing", "canplay", "canplaythrough", "loadedmetadata"].forEach((eventName) => {
    audio.addEventListener(eventName, resetStallTimer);
  });

  ["stalled", "waiting", "suspend", "abort"].forEach((eventName) => {
    audio.addEventListener(eventName, () => {
      if (!audio.paused) {
        setReconnectState(`WAITING: ${eventName}`);
        resetStallTimer();
      }
    });
  });

  audio.addEventListener("ended", () => {
    triggerFallback("stream ended");
  });

  audio.addEventListener("error", () => {
    const mediaError = audio.error ? `code ${audio.error.code}` : "unknown";
    triggerFallback(`audio error ${mediaError}`);
  });
}

function startStatusLoop() {
  if (statusTimer) clearInterval(statusTimer);
  updateStatus();
  statusTimer = window.setInterval(updateStatus, STATUS_POLL_MS);
}

function init() {
  workerUrlBox.textContent = WORKER_BASE;
  document.documentElement.style.setProperty("--player-volume", `${Math.round(audio.volume * 100)}%`);
  buildMeters();
  renderSources();
  bindNav();
  bindTransport();
  armReconnect();
  applyCover("");
  setSource(getSource("main"));
  setProgressLiveMode(true);
  startStatusLoop();
  requestAnimationFrame(tickMeters);
}

init();
