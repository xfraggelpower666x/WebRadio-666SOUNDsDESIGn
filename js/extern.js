// ==================================================
// DATEI: js/extern.js
// ERSTELLT: 2026-04-20
// GEÄNDERT: 2026-04-20
// STATUS: MINIMAL ROOT PLAYER
// ZWECK: Schlanke Audio-/Metadata-Logik für den externen Root-Player.
// ÄNDERUNG: Nutzt nur relative Pfade über dieselbe Domain.
// ==================================================

const STREAMS = {
  main: "/stream",
  backup: "/fallback-stream",
  metadata: "/api/nowplaying",
  listenerCapacity: 250,
  pollMs: 8000
};

const audio = document.getElementById("radio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const reconnectBtn = document.getElementById("reconnectBtn");
const mainBtn = document.getElementById("mainBtn");
const backBtn = document.getElementById("backBtn");
const muteBtn = document.getElementById("muteBtn");
const volumeSlider = document.getElementById("volumeSlider");

const trackTitle = document.getElementById("trackTitle");
const listenersText = document.getElementById("listenersText");
const bitrateText = document.getElementById("bitrateText");
const djText = document.getElementById("djText");
const connectionState = document.getElementById("connectionState");
const streamMode = document.getElementById("streamMode");
const metaMode = document.getElementById("metaMode");

let currentSource = "main";
let muted = false;
let metadataTimer = null;
let lastTitle = "Warte auf Metadaten …";
let userStopped = false;

function setConnection(text) {
  connectionState.textContent = text;
}

function setSourceButtons() {
  mainBtn.classList.toggle("is-active", currentSource === "main");
  backBtn.classList.toggle("is-active", currentSource === "backup");
  streamMode.textContent = currentSource === "main" ? "MAIN" : "BACKUP";
}

function applyVolume() {
  audio.volume = Number(volumeSlider.value);
}

function disconnectAudio() {
  audio.pause();
  audio.removeAttribute("src");
  audio.src = "";
  audio.load();
}

async function switchTo(source) {
  currentSource = source;
  setSourceButtons();
  disconnectAudio();
  audio.src = source === "main" ? STREAMS.main : STREAMS.backup;
  applyVolume();
}

function pickValue(data, keys, fallback = "") {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function normalizeTitle(data) {
  return String(pickValue(data, ["song", "title", "songtitle", "currentSong", "track", "now_playing"], lastTitle || "Live Stream"));
}

async function fetchMetadata() {
  try {
    const response = await fetch(STREAMS.metadata, { cache: "no-store" });
    if (!response.ok) throw new Error("Metadata fetch failed");

    const data = await response.json();
    lastTitle = normalizeTitle(data);
    trackTitle.textContent = lastTitle;

    const listeners = Number.parseInt(pickValue(data, ["listeners"], 0), 10);
    const bitrate = pickValue(data, ["bitrate"], "--");
    const dj = pickValue(data, ["dj", "djusername", "djstatus", "live_dj", "streamer", "presenter", "client"], "LYVRA DJ");

    listenersText.textContent = `${Number.isFinite(listeners) ? listeners : 0} / ${STREAMS.listenerCapacity}`;
    bitrateText.textContent = bitrate ? `${bitrate} kbps` : "--";
    djText.textContent = String(dj);
    metaMode.textContent = "API";
  } catch (error) {
    trackTitle.textContent = lastTitle || "Metadaten aktuell nicht verfügbar";
    metaMode.textContent = "API ERR";
  }
}

function startMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = setInterval(fetchMetadata, STREAMS.pollMs);
}

function stopMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  metadataTimer = null;
}

async function safePlay() {
  try {
    userStopped = false;
    if (!audio.src) {
      audio.src = currentSource === "main" ? STREAMS.main : STREAMS.backup;
    }
    applyVolume();
    await audio.play();
    setConnection("PLAYING");
    startMetadataLoop();
  } catch (error) {
    setConnection("AUDIO ERROR");
  }
}

playBtn.addEventListener("click", () => { safePlay(); });
pauseBtn.addEventListener("click", () => {
  audio.pause();
  setConnection("PAUSED");
});
stopBtn.addEventListener("click", () => {
  userStopped = true;
  stopMetadataLoop();
  disconnectAudio();
  setConnection("STOPPED");
});
reconnectBtn.addEventListener("click", async () => {
  disconnectAudio();
  await switchTo(currentSource);
  await safePlay();
});
mainBtn.addEventListener("click", async () => {
  await switchTo("main");
  if (!userStopped) await safePlay();
});
backBtn.addEventListener("click", async () => {
  await switchTo("backup");
  if (!userStopped) await safePlay();
});
muteBtn.addEventListener("click", () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? "Unmute" : "Mute";
});
volumeSlider.addEventListener("input", applyVolume);

audio.addEventListener("playing", () => setConnection("PLAYING"));
audio.addEventListener("pause", () => {
  if (!userStopped && audio.src) setConnection("PAUSED");
});
audio.addEventListener("error", async () => {
  if (userStopped) return;
  if (currentSource === "main") {
    await switchTo("backup");
    await safePlay();
  } else {
    setConnection("STREAM ERROR");
  }
});

(async function init() {
  await switchTo("main");
  applyVolume();
  fetchMetadata();
})();
