import { STREAM_CONFIG } from "../config/stream.config.js";

const overlay = document.getElementById("bootOverlay");
const bootButton = document.getElementById("bootButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const reconnectBtn = document.getElementById("reconnectBtn");

const streamStatus = document.getElementById("streamStatus");
const fallbackStatus = document.getElementById("fallbackStatus");
const trackTitle = document.getElementById("trackTitle");
const djInfo = document.getElementById("djInfo");
const listeners = document.getElementById("listeners");
const sourceLabel = document.getElementById("sourceLabel");

const audio = document.getElementById("radio");

let currentSource = "primary";
let lastMeta = null;
let booted = false;
let reconnectAttempts = 0;

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
    reconnectAttempts = 0;
    return true;
  } catch (error) {
    setStatus("Tap to Start");
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
  const played = await tryPlay();
  if (played) return;

  const fallbackPlayed = await switchToFallbackAndPlay();
  if (!fallbackPlayed) {
    setStatus("Reconnect Failed");
  }
}

async function fetchMeta() {
  try {
    const response = await fetch(STREAM_CONFIG.api_url, { cache: "no-store" });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    lastMeta = data;
    renderMeta(data);
  } catch (error) {
    if (lastMeta) {
      renderMeta(lastMeta);
    } else {
      trackTitle.textContent = "Metadata temporarily unavailable";
      djInfo.textContent = "Retrying...";
    }
  }
}

function pickValue(obj, candidates, fallback = "") {
  for (const key of candidates) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
}

function renderMeta(data) {
  const title = pickValue(data, ["title", "songtitle", "currentSong", "track"], "Live Stream");
  const dj = pickValue(data, ["dj", "dj_name", "server_name", "server"], "DJ status unavailable");
  const listenerCount = pickValue(data, ["listeners", "listener", "currentlisteners"], "0");

  trackTitle.textContent = String(title);
  djInfo.textContent = String(dj);
  listeners.textContent = String(listenerCount);
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
  fetchMeta();
});

playBtn.addEventListener("click", async () => {
  await tryPlay();
});

pauseBtn.addEventListener("click", () => {
  audio.pause();
  setStatus("Paused");
});

reconnectBtn.addEventListener("click", async () => {
  await reconnect();
});

audio.addEventListener("error", async () => {
  reconnectAttempts += 1;
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

audio.addEventListener("playing", () => setStatus("Playing"));
audio.addEventListener("pause", () => {
  if (!audio.ended) setStatus("Paused");
});
audio.addEventListener("waiting", () => setStatus("Buffering"));

setInterval(fetchMeta, STREAM_CONFIG.poll_interval_ms);
