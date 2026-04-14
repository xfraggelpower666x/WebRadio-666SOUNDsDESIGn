
import { STREAM_CONFIG } from "../config/stream.config.js";

const overlay = document.getElementById("bootOverlay");
const bootButton = document.getElementById("bootButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const reconnectBtn = document.getElementById("reconnectBtn");

const healthLamp = document.getElementById("healthLamp");
const audioLamp = document.getElementById("audioLamp");
const metaLamp = document.getElementById("metaLamp");

const streamStatus = document.getElementById("streamStatus");
const fallbackStatus = document.getElementById("fallbackStatus");
const marquee = document.getElementById("marquee");
const djInfo = document.getElementById("djInfo");
const streamQuality = document.getElementById("streamQuality");
const listeners = document.getElementById("listeners");
const sourceLabel = document.getElementById("sourceLabel");
const historyList = document.getElementById("historyList");

const audio = document.getElementById("radio");

let currentSource = "primary";
let lastMeta = null;
let booted = false;
let reconnectAttempts = 0;
let trackHistory = [];

function setLamp(el, ok) {
  el.classList.remove("lamp-green", "lamp-red");
  el.classList.add(ok ? "lamp-green" : "lamp-red");
}

function setAudioSource(source) {
  currentSource = source;
  audio.src = source === "primary"
    ? STREAM_CONFIG.primary_stream_url
    : STREAM_CONFIG.fallback_stream_url;
  fallbackStatus.textContent = source === "primary" ? "Primary" : "Fallback Active";
  sourceLabel.textContent = source === "primary" ? "Primary" : "Fallback";
}

function setStatus(text) {
  streamStatus.textContent = text;
}

async function tryPlay() {
  try {
    await audio.play();
    setStatus("Playing");
    setLamp(audioLamp, true);
    reconnectAttempts = 0;
    return true;
  } catch (error) {
    setStatus("Tap to Start");
    setLamp(audioLamp, false);
    return false;
  }
}

async function switchToFallbackAndPlay() {
  if (currentSource === "fallback") return false;
  setStatus("Switching to Fallback");
  setAudioSource("fallback");
  return await tryPlay();
}

async function reconnect() {
  setStatus("Reconnecting");
  const ok = await tryPlay();
  if (ok) return;
  const fallbackOk = await switchToFallbackAndPlay();
  if (!fallbackOk) {
    setStatus("Reconnect Failed");
    setLamp(audioLamp, false);
  }
}

function uniquePushHistory(title) {
  if (!title) return;
  if (trackHistory[0] === title) return;
  trackHistory.unshift(title);
  trackHistory = trackHistory.slice(0, 8);
  historyList.innerHTML = "";
  for (const item of trackHistory) {
    const li = document.createElement("li");
    li.textContent = item;
    historyList.appendChild(li);
  }
}

function pickValue(obj, candidates, fallback = "") {
  for (const key of candidates) {
    if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== "") {
      return obj[key];
    }
  }
  return fallback;
}

function normalizeQuality(data) {
  const quality = pickValue(data, ["bitrate", "quality", "stream_bitrate", "audio_bitrate"], "");
  const format = pickValue(data, ["format", "codec", "audio_format"], "");
  if (quality && format) return `${quality} / ${format}`;
  return quality || format || "Unbekannt";
}

function renderMeta(data) {
  const title = String(pickValue(data, ["title", "songtitle", "currentSong", "track"], "Live Stream"));
  const dj = String(pickValue(data, ["dj", "dj_name", "server_name", "server"], "Unbekannt"));
  const listenerCount = String(pickValue(data, ["listeners", "listener", "currentlisteners"], "0"));
  const safeCount = Number.parseInt(listenerCount, 10);
  const displayCount = Number.isFinite(safeCount) ? safeCount : 0;

  marquee.textContent = title;
  djInfo.textContent = dj;
  streamQuality.textContent = normalizeQuality(data);
  listeners.textContent = `${displayCount} / ${STREAM_CONFIG.listener_capacity}`;
  uniquePushHistory(title);
}

async function fetchMeta() {
  try {
    const response = await fetch(STREAM_CONFIG.api_url, { cache: "no-store" });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    lastMeta = data;
    renderMeta(data);
    setLamp(metaLamp, true);
    setLamp(healthLamp, true);
  } catch (error) {
    setLamp(metaLamp, false);
    if (lastMeta) {
      renderMeta(lastMeta);
      setLamp(healthLamp, true);
    } else {
      marquee.textContent = "Metadata temporarily unavailable";
      djInfo.textContent = "Retrying...";
      setLamp(healthLamp, false);
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
    }, 45);
  });
}

bootButton.addEventListener("click", async () => {
  if (booted) return;
  booted = true;
  bootButton.disabled = true;
  setAudioSource("primary");
  await runBootSequence();
  overlay.classList.add("hidden");
  await tryPlay();
  await fetchMeta();
});

playBtn.addEventListener("click", async () => {
  await tryPlay();
});

pauseBtn.addEventListener("click", () => {
  audio.pause();
  setStatus("Paused");
  setLamp(audioLamp, false);
});

reconnectBtn.addEventListener("click", async () => {
  await reconnect();
});

audio.addEventListener("error", async () => {
  reconnectAttempts += 1;
  setLamp(audioLamp, false);
  if (currentSource === "primary") {
    const ok = await switchToFallbackAndPlay();
    if (!ok) setStatus("Audio Error");
    return;
  }
  if (reconnectAttempts <= 1) {
    await reconnect();
  } else {
    setStatus("Audio Error");
  }
});

audio.addEventListener("playing", () => {
  setStatus("Playing");
  setLamp(audioLamp, true);
});
audio.addEventListener("pause", () => {
  if (!audio.ended) setStatus("Paused");
});
audio.addEventListener("waiting", () => {
  setStatus("Buffering");
});

setLamp(healthLamp, false);
setLamp(audioLamp, false);
setLamp(metaLamp, false);
setInterval(fetchMeta, STREAM_CONFIG.poll_interval_ms);
