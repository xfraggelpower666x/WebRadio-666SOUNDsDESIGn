const CFG = window.RADIO_CONFIG || {};
const WORKER_BASE = CFG.radioBase || "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev";
const STATUS_URL = `${WORKER_BASE}${CFG.endpoints?.status || "/api/radio/status"}`;
const META_URL = `${WORKER_BASE}${CFG.endpoints?.metadata || "/api/radio/metadata"}`;
const LISTENERS_URL = `${WORKER_BASE}${CFG.endpoints?.listeners || "/api/radio/listeners"}`;
const HEALTH_URL = `${WORKER_BASE}${CFG.endpoints?.health || "/health"}`;
const HISTORY_URL = `${WORKER_BASE}${CFG.endpoints?.history || "/api/radio/history"}`;
const STREAM_MAIN = `${WORKER_BASE}${CFG.endpoints?.stream || "/api/radio/stream"}`;
const STREAM_BACKUP = `${WORKER_BASE}${CFG.endpoints?.backup || "/api/radio/backup"}`;
const DEFAULT_COVER = "assets/fallback.jpg";

const SOURCES = [
  { key: "main", label: "Main Worker Radio", url: STREAM_MAIN, description: "Primary worker pass-through" },
  { key: "backup", label: "Backup Stream", url: STREAM_BACKUP, description: "Direct backup stream" },
  { key: "sunshine", label: "Sunshine", url: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/", description: "Additional source" }
];

const audio = document.getElementById("audioPlayer");
const bootOverlay = document.getElementById("bootOverlay");
const bootStatus = document.getElementById("bootStatus");
const overlayMenu = document.getElementById("overlayMenu");
const coverImage = document.getElementById("coverImage");
const coverBlurImage = document.getElementById("coverBlurImage");
const visualCoverPreview = document.getElementById("visualCoverPreview");
const workerUrlBox = document.getElementById("workerUrlBox");
const historyList = document.getElementById("historyList");

const els = {
  sourceGrid: document.getElementById("sourceGrid"),
  overlaySources: document.getElementById("overlaySources"),
  statusJsonBox: document.getElementById("statusJsonBox"),
  reconnectState: document.getElementById("reconnectState"),
  progressRange: document.getElementById("progressRange"),
  volumeRange: document.getElementById("volumeRange"),
  timeCurrent: document.getElementById("timeCurrent")
};

if (audio) {
  audio.crossOrigin = "anonymous";
  audio.preload = "none";
  audio.volume = 0.85;
  audio.playsInline = true;
}

let currentSourceKey = "main";
let stallTimer = null;
let lastPlayableAt = Date.now();

function setReconnectState(txt) {
  if (els.reconnectState) els.reconnectState.textContent = txt;
}
function setAudioSource(url) {
  if (!audio) return;
  audio.pause(); audio.removeAttribute("src"); audio.load();
  audio.src = url; audio.load();
  lastPlayableAt = Date.now();
  resetStallTimer();
}
function resetStallTimer() {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = setTimeout(() => {
    if (Date.now() - lastPlayableAt > 15000 && audio && !audio.paused) loadBackup("stalled");
  }, 15500);
}
async function safePlay() {
  try {
    if (window.AudioReactiveEngine) await window.AudioReactiveEngine.start();
    await audio.play();
    return true;
  } catch {
    setReconnectState("PLAY BLOCKED");
    return false;
  }
}
async function loadSource(key, reason="") {
  const source = SOURCES.find(s => s.key === key) || SOURCES[0];
  currentSourceKey = source.key;
  setReconnectState(reason ? `SWITCHING: ${reason}` : `SWITCHING: ${source.label}`);
  setAudioSource(source.url);
  const ok = await safePlay();
  if (ok) {
    SystemState.set({
      mode: source.key === "backup" ? "backup" : "radio",
      signalState: source.key === "backup" ? "backup" : "live",
      sourceLabel: source.key
    });
    setReconnectState(`PLAYING: ${source.label}`);
  }
}
async function loadBackup(reason="fallback") { await loadSource("backup", reason); }

async function fetchJson(url, timeout=5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {cache:"no-store", signal:ctrl.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}
function normalizeDj(raw) {
  const v = String(raw || "").trim();
  if (!v || ["false","no dj","autodj","auto dj","auto"].includes(v.toLowerCase())) return CFG.djFallbackName || "666SOUNDsDESIGn DJ";
  return v;
}
function applyMeta(meta) {
  const track = meta.song || meta.title || "Live Stream";
  const djName = normalizeDj(meta.djusername);
  const listeners = Number(meta.listeners || 0);
  const bitrate = Number(meta.bitrate || 0);
  const art = meta.art || DEFAULT_COVER;
  let signalState = currentSourceKey === "backup" ? "backup" : currentSourceKey === "sunshine" ? "live" : "live";
  let sourceLabel = currentSourceKey === "sunshine" ? "sunshine" : currentSourceKey === "backup" ? "backup" : "main";
  SystemState.set({
    workerOnline: true, metadataOk: true, track, djName,
    djMode: djName === (CFG.djFallbackName || "666SOUNDsDESIGn DJ") ? "auto" : "live",
    listeners, bitrate, signalState, sourceLabel
  });
  if (coverImage) coverImage.src = art;
  if (coverBlurImage) coverBlurImage.src = art;
  if (visualCoverPreview) visualCoverPreview.src = art;
}
function renderHistory(items) {
  if (!historyList) return;
  if (!Array.isArray(items) || !items.length) {
    historyList.innerHTML = '<div class="history-item"><strong>Keine History</strong><span>Worker liefert aktuell keine Verlaufsdaten.</span></div>'; return;
  }
  historyList.innerHTML = items.slice(0,10).map(item => `<div class="history-item"><strong>${item.song || item.title || "Unknown Track"}</strong><span>${item.djusername || CFG.djFallbackName || "666SOUNDsDESIGn DJ"}</span><small>${item.ts || ""}</small></div>`).join("");
}
async function pollWorker() {
  try {
    const [health, meta, status, listeners, history] = await Promise.all([
      fetchJson(HEALTH_URL, 3500).catch(() => ({ok:false})),
      fetchJson(META_URL, 5000).catch(() => ({})),
      fetchJson(STATUS_URL, 5000).catch(() => ({})),
      fetchJson(LISTENERS_URL, 5000).catch(() => ({})),
      fetchJson(HISTORY_URL, 5000).catch(() => [])
    ]);
    SystemState.set({ workerOnline: !!health.ok });
    applyMeta({ ...meta, ...listeners });
    if (els.statusJsonBox) els.statusJsonBox.textContent = JSON.stringify(status, null, 2);
    renderHistory(history.history || history);
  } catch {
    SystemState.set({ workerOnline:false, metadataOk:false });
    setReconnectState("WORKER POLL FAIL");
  }
}
function sourceCard(source) {
  const wrap = document.createElement("div");
  wrap.className = "source-card";
  wrap.innerHTML = `<h3>${source.label}</h3><p>${source.description}</p><button class="cyber-btn">LOAD</button>`;
  wrap.querySelector("button").addEventListener("click", () => loadSource(source.key, "manual"));
  return wrap;
}
function overlayLine(source) {
  const line = document.createElement("div");
  line.className = "overlay-source-line";
  line.innerHTML = `<div><strong>${source.label}</strong><br><span>${source.description}</span></div><button class="cyber-btn">LOAD</button>`;
  line.querySelector("button").addEventListener("click", () => { loadSource(source.key, "overlay"); overlayMenu?.classList.remove("active"); });
  return line;
}
function bind() {
  document.getElementById("bootEnterBtn")?.addEventListener("click", async () => { bootOverlay?.classList.remove("active"); if (bootStatus) bootStatus.textContent = "SYSTEM READY"; await loadSource("main","boot"); });
  document.getElementById("overlayMenuBtn")?.addEventListener("click", () => overlayMenu?.classList.add("active"));
  document.getElementById("overlayCloseBtn")?.addEventListener("click", () => overlayMenu?.classList.remove("active"));
  document.getElementById("forceReconnectBtn")?.addEventListener("click", () => pollWorker());
  document.getElementById("loadMainBtn")?.addEventListener("click", () => loadSource("main","system"));
  document.getElementById("loadBackupBtn")?.addEventListener("click", () => loadSource("backup","system"));
  document.getElementById("loadSunshineBtn")?.addEventListener("click", () => loadSource("sunshine","system"));
  document.getElementById("playMainBtn")?.addEventListener("click", () => loadSource("main","center"));
  document.getElementById("playBackupBtn")?.addEventListener("click", () => loadSource("backup","center"));
  document.getElementById("playSunshineBtn")?.addEventListener("click", () => loadSource("sunshine","center"));
  document.getElementById("stopBtnCenter")?.addEventListener("click", () => { audio?.pause(); SystemState.set({audioPlaying:false, signalState:"idle"}); });
  document.getElementById("playBtn")?.addEventListener("click", async () => { if (audio?.src) await safePlay(); else await loadSource(currentSourceKey || "main", "player"); });
  document.getElementById("pauseBtn")?.addEventListener("click", () => audio?.pause());
  document.getElementById("stopBtn")?.addEventListener("click", () => { audio?.pause(); audio?.removeAttribute("src"); audio?.load(); SystemState.set({mode:"idle", signalState:"idle", audioPlaying:false}); });
  if (els.volumeRange && audio) els.volumeRange.addEventListener("input", e => { audio.volume = Number(e.target.value); document.documentElement.style.setProperty("--player-volume", `${Math.round(audio.volume * 100)}%`); });

  audio?.addEventListener("playing", () => { lastPlayableAt = Date.now(); resetStallTimer(); });
  audio?.addEventListener("timeupdate", () => { lastPlayableAt = Date.now(); if (els.timeCurrent) els.timeCurrent.textContent = "LIVE"; if (els.progressRange) els.progressRange.value = 100; });
  ["error","stalled","waiting","abort"].forEach(ev => audio?.addEventListener(ev, () => loadBackup(ev)));
}
function initNav() {
  document.querySelectorAll(".nav-btn[data-panel]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn[data-panel]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.getAttribute("data-panel");
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`panel-${panel}`)?.classList.add("active");
  }));
}
document.addEventListener("DOMContentLoaded", () => {
  if (workerUrlBox) workerUrlBox.textContent = WORKER_BASE;
  SystemState.set({ mode:"idle", sourceLabel:"main", signalState:"idle", boostLevel: CFG.boostDefault || 1 });
  initNav();
  if (els.sourceGrid) { els.sourceGrid.innerHTML = ""; SOURCES.forEach(s => els.sourceGrid.appendChild(sourceCard(s))); }
  if (els.overlaySources) { els.overlaySources.innerHTML = ""; SOURCES.forEach(s => els.overlaySources.appendChild(overlayLine(s))); }
  bind();
  if (window.BoostControl) BoostControl.mount();
  pollWorker();
  setInterval(pollWorker, CFG.metadataPollMs || 5000);
});
