import { STREAM_CONFIG } from "../config/stream.config.js";

const overlay = document.getElementById("bootOverlay");
const bootButton = document.getElementById("bootButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const reconnectBtn = document.getElementById("reconnectBtn");
const muteBtn = document.getElementById("muteBtn");
const volumeRange = document.getElementById("volumeRange");
const historyToggle = document.getElementById("historyToggle");
const metaLamp = document.getElementById("metaLamp");
const audioLamp = document.getElementById("audioLamp");
const sourceLamp = document.getElementById("sourceLamp");
const streamStatus = document.getElementById("streamStatus");
const sourceLabel = document.getElementById("sourceLabel");
const fallbackText = document.getElementById("fallbackText");
const nowPlaying = document.getElementById("nowPlaying");
const metaText = document.getElementById("metaText");
const listenersText = document.getElementById("listenersText");
const bitrateText = document.getElementById("bitrateText");
const djText = document.getElementById("djText");
const historyOverlay = document.getElementById("historyOverlay");
const historyList = document.getElementById("historyList");
const volumeHint = document.getElementById("volumeHint");
const audio = document.getElementById("radio");

let booted = false;
let usingFallback = false;
let muted = false;
let metadataTimer = null;
let lastTitle = "Loading metadata...";
let historyOpen = false;

function setLamp(el, state) {
  el.classList.remove("lamp-green", "lamp-red", "lamp-cyan");
  el.classList.add(state);
}
function setStatus(text) { streamStatus.textContent = text; }
function setSource(isFallback) {
  usingFallback = isFallback;
  sourceLabel.textContent = isFallback ? "Fallback" : "Primary";
  fallbackText.textContent = isFallback ? "Active" : "Standby";
  setLamp(sourceLamp, isFallback ? "lamp-red" : "lamp-cyan");
}
function setMetadataStatus(text) { metaText.textContent = text; }
function pickValue(obj, keys, fallback = "") {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}
function normalizeTitle(data) {
  return String(pickValue(data, ["song", "title", "songtitle", "currentSong", "track", "now_playing"], lastTitle || "Live Stream"));
}
function renderHistory(items) {
  historyList.innerHTML = "";
  if (!Array.isArray(items) || !items.length) {
    const li = document.createElement("li");
    li.textContent = "No history loaded";
    historyList.appendChild(li);
    return;
  }
  items.slice(0, 12).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string"
      ? item
      : String(pickValue(item, ["song", "title", "track", "name"], "Unknown track"));
    historyList.appendChild(li);
  });
}
async function fetchMetadata() {
  try {
    const res = await fetch(STREAM_CONFIG.metadata_url, { cache: "no-store" });
    if (!res.ok) throw new Error("metadata fetch failed");
    const data = await res.json();
    const title = normalizeTitle(data);
    lastTitle = title;
    nowPlaying.textContent = title;
    const listeners = Number.parseInt(pickValue(data, ["listeners"], 0), 10);
    const bitrate = pickValue(data, ["bitrate"], "Unknown");
    const djStatus = pickValue(data, ["djusername", "djstatus", "client"], "AutoDJ");
    listenersText.textContent = `${Number.isFinite(listeners) ? listeners : 0} / ${STREAM_CONFIG.listener_capacity}`;
    bitrateText.textContent = bitrate ? `${String(bitrate)} kbps` : "Unknown";
    djText.textContent = String(djStatus);
    renderHistory(pickValue(data, ["history"], []));
    setMetadataStatus("Online");
    setLamp(metaLamp, "lamp-green");
  } catch (err) {
    nowPlaying.textContent = lastTitle || "Metadata unavailable";
    setMetadataStatus("Offline");
    setLamp(metaLamp, "lamp-red");
  }
}
function startMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = setInterval(fetchMetadata, STREAM_CONFIG.poll_interval_ms);
}
async function tryPlayPrimary() {
  audio.src = STREAM_CONFIG.stream_url;
  await audio.play();
  setSource(false);
}
async function tryPlayFallback() {
  audio.src = STREAM_CONFIG.fallback_stream_url;
  await audio.play();
  setSource(true);
}
async function safePlay() {
  try {
    await tryPlayPrimary();
    setStatus("Playing");
    setLamp(audioLamp, "lamp-green");
    startMetadataLoop();
    return true;
  } catch (e1) {
    try {
      await tryPlayFallback();
      setStatus("Playing");
      setLamp(audioLamp, "lamp-green");
      startMetadataLoop();
      return true;
    } catch (e2) {
      setStatus("Audio Error");
      setLamp(audioLamp, "lamp-red");
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
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
      if (percent >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, 42);
  });
}
bootButton.addEventListener("click", async () => {
  if (booted) return;
  booted = true;
  bootButton.disabled = true;
  await runBootSequence();
  overlay.classList.add("hidden");
  await safePlay();
});
playBtn.addEventListener("click", async () => { await safePlay(); });
pauseBtn.addEventListener("click", () => {
  audio.pause();
  setStatus("Paused");
  setLamp(audioLamp, "lamp-red");
});
reconnectBtn.addEventListener("click", async () => {
  audio.pause();
  audio.src = "";
  await safePlay();
});
muteBtn.addEventListener("click", () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? "Unmute" : "Mute";
});
volumeRange.addEventListener("input", () => {
  audio.volume = Number(volumeRange.value);
});
historyToggle.addEventListener("click", () => {
  historyOpen = !historyOpen;
  historyOverlay.classList.toggle("hidden", !historyOpen);
});
audio.addEventListener("playing", () => {
  setStatus("Playing");
  setLamp(audioLamp, "lamp-green");
});
audio.addEventListener("error", async () => {
  if (!usingFallback) {
    try {
      await tryPlayFallback();
      setStatus("Playing");
      setLamp(audioLamp, "lamp-green");
      startMetadataLoop();
      return;
    } catch (e) {}
  }
  setStatus("Audio Error");
  setLamp(audioLamp, "lamp-red");
});
const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (isiOS) volumeHint.textContent = "Use iPhone buttons";
setLamp(metaLamp, "lamp-red");
setLamp(audioLamp, "lamp-red");
setLamp(sourceLamp, "lamp-cyan");
setSource(false);
setMetadataStatus("Loading...");
fetchMetadata();
