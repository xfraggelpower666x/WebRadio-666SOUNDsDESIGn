const STREAM_CONFIG = {
  stream_url: "/stream",
  fallback_stream_url: "/fallback-stream",
  metadata_url: "/api/nowplaying",
  poll_interval_ms: 8000,
  listener_capacity: 250
};

const radio = document.getElementById("radio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const muteBtn = document.getElementById("muteBtn");
const volumeRange = document.getElementById("volumeRange");
const historyToggle = document.getElementById("historyToggle");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

const healthLamp = document.getElementById("healthLamp");
const audioLamp = document.getElementById("audioLamp");
const metaLamp = document.getElementById("metaLamp");

const healthText = document.getElementById("healthText");
const audioText = document.getElementById("audioText");
const metaText = document.getElementById("metaText");

const sourceText = document.getElementById("sourceText");
const stateText = document.getElementById("stateText");
const trackTitle = document.getElementById("trackTitle");
const listenersText = document.getElementById("listenersText");
const bitrateText = document.getElementById("bitrateText");
const djText = document.getElementById("djText");
const volumeHint = document.getElementById("volumeHint");

const bootOverlay = document.getElementById("bootOverlay");
const bootBtn = document.getElementById("bootBtn");
const bootProgress = document.getElementById("bootProgress");
const bootPercent = document.getElementById("bootPercent");

let usingFallback = false;
let muted = false;
let metadataTimer = null;
let healthTimer = null;
let historyOpen = false;
let lastTitle = "Loading metadata…";
let booted = false;

function setLamp(el, state) {
  if (!el) return;
  el.classList.remove("lamp-red", "lamp-green", "lamp-cyan");
  el.classList.add(state);
}

function pickValue(obj, keys, fallback = "") {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}

async function checkHealth() {
  try {
    const res = await fetch("/health", { cache: "no-store" });
    if (!res.ok) throw new Error("health failed");
    healthText.textContent = "Online";
    setLamp(healthLamp, "lamp-green");
  } catch {
    healthText.textContent = "Offline";
    setLamp(healthLamp, "lamp-red");
  }
}

function renderHistory(items) {
  historyList.innerHTML = "";
  if (!Array.isArray(items) || !items.length) {
    historyList.innerHTML = "<li>No history loaded</li>";
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
    if (!res.ok) throw new Error("meta failed");
    const data = await res.json();

    const title = String(pickValue(data, ["song", "title", "songtitle", "currentSong", "track", "now_playing"], lastTitle || "Live Stream"));
    lastTitle = title;
    trackTitle.textContent = title;

    const listeners = Number.parseInt(pickValue(data, ["listeners"], 0), 10);
    listenersText.textContent = `${Number.isFinite(listeners) ? listeners : 0} / ${STREAM_CONFIG.listener_capacity}`;

    const bitrate = pickValue(data, ["bitrate"], "Unknown");
    bitrateText.textContent = bitrate ? `${String(bitrate)} kbps` : "Unknown";

    const dj = pickValue(data, ["djusername", "djstatus", "client"], "AutoDJ");
    djText.textContent = String(dj);

    renderHistory(pickValue(data, ["history"], []));

    metaText.textContent = "Online";
    setLamp(metaLamp, "lamp-green");
  } catch {
    trackTitle.textContent = lastTitle || "Metadata unavailable";
    metaText.textContent = "Offline";
    setLamp(metaLamp, "lamp-red");
  }
}

function startMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = setInterval(fetchMetadata, STREAM_CONFIG.poll_interval_ms);
}

async function tryPlayPrimary() {
  radio.src = STREAM_CONFIG.stream_url;
  await radio.play();
  usingFallback = false;
  sourceText.textContent = "Primary";
}

async function tryPlayFallback() {
  radio.src = STREAM_CONFIG.fallback_stream_url;
  await radio.play();
  usingFallback = true;
  sourceText.textContent = "Fallback";
}

async function safePlay() {
  try {
    await tryPlayPrimary();
    stateText.textContent = "Playing";
    audioText.textContent = "Active";
    setLamp(audioLamp, "lamp-green");
    startMetadataLoop();
    return true;
  } catch {
    try {
      await tryPlayFallback();
      stateText.textContent = "Playing";
      audioText.textContent = "Fallback Active";
      setLamp(audioLamp, "lamp-green");
      startMetadataLoop();
      return true;
    } catch {
      stateText.textContent = "Audio Error";
      audioText.textContent = "Failed";
      setLamp(audioLamp, "lamp-red");
      return false;
    }
  }
}

function runBootSequence() {
  return new Promise((resolve) => {
    let p = 0;
    const timer = setInterval(() => {
      p += 4;
      if (p > 100) p = 100;
      bootProgress.style.width = p + "%";
      bootPercent.textContent = p + "%";
      if (p >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, 42);
  });
}

bootBtn.addEventListener("click", async () => {
  if (booted) return;
  booted = true;
  bootBtn.disabled = true;
  await runBootSequence();
  bootOverlay.classList.add("hidden");
});

playBtn.addEventListener("click", safePlay);

pauseBtn.addEventListener("click", () => {
  radio.pause();
  stateText.textContent = "Paused";
  audioText.textContent = "Paused";
  setLamp(audioLamp, "lamp-red");
});

muteBtn.addEventListener("click", () => {
  muted = !muted;
  radio.muted = muted;
  muteBtn.textContent = muted ? "Unmute" : "Mute";
  volumeHint.textContent = muted ? "Muted" : "Live Volume";
});

volumeRange.addEventListener("input", () => {
  radio.volume = Number(volumeRange.value);
  volumeHint.textContent = `Level ${(Number(volumeRange.value) * 100).toFixed(0)}%`;
});

historyToggle.addEventListener("click", () => {
  historyOpen = !historyOpen;
  historyPanel.classList.toggle("hidden", !historyOpen);
});

radio.addEventListener("playing", () => {
  stateText.textContent = "Playing";
  audioText.textContent = usingFallback ? "Fallback Active" : "Active";
  setLamp(audioLamp, "lamp-green");
});

radio.addEventListener("error", async () => {
  if (!usingFallback) {
    try {
      await tryPlayFallback();
      stateText.textContent = "Playing";
      audioText.textContent = "Fallback Active";
      setLamp(audioLamp, "lamp-green");
      startMetadataLoop();
      return;
    } catch {}
  }
  stateText.textContent = "Audio Error";
  audioText.textContent = "Failed";
  setLamp(audioLamp, "lamp-red");
});

setLamp(audioLamp, "lamp-red");
setLamp(metaLamp, "lamp-red");
setLamp(healthLamp, "lamp-red");
sourceText.textContent = "Primary";
stateText.textContent = "Ready";

checkHealth();
fetchMetadata();
startMetadataLoop();
healthTimer = setInterval(checkHealth, 10000);
