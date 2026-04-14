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

const healthLamp = document.getElementById("healthLamp");
const audioLamp = document.getElementById("audioLamp");
const sourceLamp = document.getElementById("sourceLamp");
const streamStatus = document.getElementById("streamStatus");
const sourceLabel = document.getElementById("sourceLabel");
const fallbackText = document.getElementById("fallbackText");

const audio = document.getElementById("radio");

let booted = false;
let usingFallback = false;
let muted = false;

function setLamp(el, state) {
  el.classList.remove("lamp-green", "lamp-red", "lamp-cyan");
  el.classList.add(state);
}

function setStatus(text) {
  streamStatus.textContent = text;
}

function setSource(isFallback) {
  usingFallback = isFallback;
  sourceLabel.textContent = isFallback ? "Fallback" : "Primary";
  fallbackText.textContent = isFallback ? "Active" : "Standby";
  setLamp(sourceLamp, isFallback ? "lamp-red" : "lamp-cyan");
}

async function tryPlayPrimary() {
  audio.src = STREAM_CONFIG.primary_stream_url;
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
    return true;
  } catch (e1) {
    try {
      await tryPlayFallback();
      setStatus("Playing");
      setLamp(audioLamp, "lamp-green");
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

playBtn.addEventListener("click", async () => {
  await safePlay();
});

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
      return;
    } catch (e) {}
  }
  setStatus("Audio Error");
  setLamp(audioLamp, "lamp-red");
});

fetch("/health", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error("health failed");
    setLamp(healthLamp, "lamp-green");
  })
  .catch(() => {
    setLamp(healthLamp, "lamp-red");
  });

setLamp(healthLamp, "lamp-red");
setLamp(audioLamp, "lamp-red");
setLamp(sourceLamp, "lamp-cyan");
setSource(false);
