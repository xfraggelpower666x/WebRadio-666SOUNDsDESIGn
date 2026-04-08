const CFG = window.RADIO_CONFIG || {};
const WORKER_BASE = CFG.radioBase || "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev";
const HEALTH_URL = `${WORKER_BASE}${CFG.endpoints?.health || "/health"}`;
const META_URL = `${WORKER_BASE}${CFG.endpoints?.metadata || "/api/radio/metadata"}`;
const STREAM_MAIN = `${WORKER_BASE}${CFG.endpoints?.stream || "/api/radio/stream"}`;
const STREAM_BACKUP = `${WORKER_BASE}${CFG.endpoints?.backup || "/api/radio/backup"}`;
const audio = document.getElementById("audioPlayer");
const bootOverlay = document.getElementById("bootOverlay");
const bootStatus = document.getElementById("bootStatus");

let entered = false;
let currentSource = "main";
let lastPlayableAt = Date.now();
let stallTimer = null;

async function fetchJson(url, timeout = 5000){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { cache:"no-store", signal:ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function ensureUnlock(){
  const ok = await window.AudioReactiveEngine.start();
  if (!ok) throw new Error("audio init failed");
}

function setAudio(url){
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.src = url;
  audio.load();
  lastPlayableAt = Date.now();
}

function resetStallTimer(){
  if (stallTimer) clearTimeout(stallTimer);
  const waitMs = DeviceMode.stallMs();
  stallTimer = setTimeout(async () => {
    if (Date.now() - lastPlayableAt > waitMs && !audio.paused && currentSource === "main") {
      await playSource("backup");
    }
  }, waitMs + 1200);
}

async function playSource(key){
  const url = key === "backup" ? STREAM_BACKUP : STREAM_MAIN;
  currentSource = key;
  setAudio(url);
  await ensureUnlock();
  await audio.play();
  resetStallTimer();
  SystemState.set({
    signalState: key === "backup" ? "BACKUP ACTIVE" : "LIVE",
    source: key,
    title: key === "backup" ? "Backup Stream" : "Live Stream"
  });
}

async function pollMeta(){
  try {
    const [health, meta] = await Promise.all([
      fetchJson(HEALTH_URL, 3500).catch(() => ({ ok:false })),
      fetchJson(META_URL, 5000).catch(() => ({}))
    ]);
    SystemState.set({
      workerOnline: !!health.ok,
      title: meta.song || meta.title || (currentSource === "backup" ? "Backup Stream" : "Live Stream"),
      dj: meta.djusername || CFG.djFallbackName || "666SOUNDsDESIGn DJ",
      listeners: Number(meta.listeners || 0),
      bitrate: Number(meta.bitrate || 0),
      source: currentSource
    });
  } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  DeviceMode.apply();
  BoostControl.mount();
  document.getElementById("bootEnterBtn")?.addEventListener("click", async () => {
    try {
      bootStatus.textContent = "UNLOCKING AUDIO...";
      await ensureUnlock();
      entered = true;
      bootStatus.textContent = "SYSTEM READY";
      bootOverlay.classList.remove("active");
    } catch (e) {
      bootStatus.textContent = "AUDIO UNLOCK FAILED";
    }
  });

  document.getElementById("playMainBtn")?.addEventListener("click", async () => { if (entered) await playSource("main"); });
  document.getElementById("playBackupBtn")?.addEventListener("click", async () => { if (entered) await playSource("backup"); });
  document.getElementById("playBtn")?.addEventListener("click", async () => { if (entered) await playSource(currentSource || "main"); });
  document.getElementById("pauseBtn")?.addEventListener("click", () => audio.pause());
  document.getElementById("stopBtn")?.addEventListener("click", () => { audio.pause(); audio.removeAttribute("src"); audio.load(); });

  audio.addEventListener("playing", () => { lastPlayableAt = Date.now(); });
  audio.addEventListener("timeupdate", () => { lastPlayableAt = Date.now(); });
  audio.addEventListener("waiting", () => {});
  audio.addEventListener("stalled", () => {});
  audio.addEventListener("error", async () => {
    if (currentSource === "main") await playSource("backup");
  });

  pollMeta();
  setInterval(pollMeta, CFG.metadataPollMs || 5000);
});
