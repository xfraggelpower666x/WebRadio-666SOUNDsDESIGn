
const WORKER_BASE = "https://webradio.666soundsdesign-broadcaster.com";
const ENDPOINTS = {
  stream: `${WORKER_BASE}/stream`,
  metadata: `${WORKER_BASE}/metadata`,
  status: `${WORKER_BASE}/status`,
  history: `${WORKER_BASE}/history`,
  health: `${WORKER_BASE}/health`
};

const META_INTERVAL_MS = 10000;
const HEALTH_INTERVAL_MS = 15000;
const MAX_RECONNECTS = 999;

const audio = document.getElementById("radioAudio");
const coverImage = document.getElementById("coverImage");
const coverFallback = document.getElementById("coverFallback");
const trackTitle = document.getElementById("trackTitle");
const trackDj = document.getElementById("trackDj");
const listenerInfo = document.getElementById("listenerInfo");
const bitrateInfo = document.getElementById("bitrateInfo");
const modeInfo = document.getElementById("modeInfo");
const statusText = document.getElementById("statusText");
const sourceInfo = document.getElementById("sourceInfo");
const streamEndpoint = document.getElementById("streamEndpoint");
const metaEndpoint = document.getElementById("metaEndpoint");
const historyList = document.getElementById("historyList");
const reconnectCounter = document.getElementById("reconnectCounter");
const audioState = document.getElementById("audioState");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");

const ledStream = document.getElementById("ledStream");
const ledMeta = document.getElementById("ledMeta");
const ledReconnect = document.getElementById("ledReconnect");

const meterLeft = document.getElementById("meterLeft");
const meterRight = document.getElementById("meterRight");

const btnPlay = document.getElementById("btnPlay");
const btnPause = document.getElementById("btnPause");
const btnStop = document.getElementById("btnStop");

let reconnectAttempts = 0;
let reconnectTimer = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let meterAnimation = null;
let dataArray = null;
let state = "stopped";

streamEndpoint.textContent = ENDPOINTS.stream;
metaEndpoint.textContent = ENDPOINTS.metadata;
audio.src = ENDPOINTS.stream;
audio.volume = Number(volumeSlider.value || 0.85);

function setLed(el, mode = "off") {
  el.className = "led";
  if (mode === "cyan") el.classList.add("led-on-cyan");
  else if (mode === "pink") el.classList.add("led-on-pink");
  else if (mode === "green") el.classList.add("led-on-green");
  else if (mode === "red") el.classList.add("led-on-red");
  else el.classList.add("led-off");
}

function setState(next) {
  state = next;
  audioState.textContent = next;
  statusText.textContent = next.toUpperCase();

  if (next === "playing") setLed(ledStream, "green");
  else if (next === "loading" || next === "reconnecting") setLed(ledStream, "pink");
  else if (next === "error") setLed(ledStream, "red");
  else setLed(ledStream, "off");
}

function setMetaState(ok) {
  setLed(ledMeta, ok ? "cyan" : "off");
}

function setReconnectState(mode) {
  setLed(ledReconnect, mode);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function splitTrack(text) {
  const raw = safeText(text, "Unknown");
  if (raw.includes(" - ")) {
    const [artist, ...rest] = raw.split(" - ");
    return { artist: artist.trim(), title: rest.join(" - ").trim() || raw };
  }
  return { artist: "Worker source", title: raw };
}

function applyCover(url) {
  if (!url) {
    coverImage.hidden = true;
    coverImage.removeAttribute("src");
    coverFallback.hidden = false;
    return;
  }
  coverImage.src = url;
  coverImage.hidden = false;
  coverFallback.hidden = true;
}

coverImage.addEventListener("error", () => {
  coverImage.hidden = true;
  coverFallback.hidden = false;
});

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return await res.json();
}

async function refreshMetadata() {
  try {
    const meta = await fetchJson(ENDPOINTS.metadata);
    const track = splitTrack(meta.song || meta.title);
    trackTitle.textContent = track.title;
    trackDj.textContent = meta.djusername ? `DJ: ${meta.djusername}` : track.artist;
    listenerInfo.textContent = safeText(meta.listeners, "0");
    bitrateInfo.textContent = safeText(meta.bitrate, "—");
    modeInfo.textContent = safeText(meta.mode || meta.stream, "—");
    sourceInfo.textContent = safeText(meta.source, "worker metadata");
    applyCover(meta.art || meta.image || meta.cover || "");
    setMetaState(true);
  } catch (err) {
    setMetaState(false);
    sourceInfo.textContent = "metadata offline";
  }
}

async function refreshHistory() {
  try {
    const data = await fetchJson(ENDPOINTS.history);
    const history = Array.isArray(data.history) ? data.history : [];
    if (!history.length) {
      historyList.innerHTML = '<li class="empty">Noch keine History geladen</li>';
      return;
    }
    historyList.innerHTML = history.slice(0, 10).map(item => `
      <li class="history-item">
        <div class="title">${safeText(item.song, "Unknown")}</div>
        <div class="sub">${safeText(item.djusername, "AUTO")} · ${safeText(item.ts, "—")}</div>
      </li>
    `).join("");
  } catch (err) {
    historyList.innerHTML = '<li class="empty">History aktuell nicht erreichbar</li>';
  }
}

async function refreshHealth() {
  try {
    await fetchJson(ENDPOINTS.health);
  } catch (err) {
    // health is secondary here; stream state handles visible errors
  }
}

function updateVolume() {
  const value = Number(volumeSlider.value || 0.85);
  audio.volume = value;
  volumeValue.textContent = `${Math.round(value * 100)}%`;
}

async function ensureAudioGraph() {
  if (audioContext) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;

  audioContext = new Ctx();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
  runMeters();
}

function runMeters() {
  if (!analyser || !dataArray) return;
  cancelAnimationFrame(meterAnimation);

  const animate = () => {
    analyser.getByteFrequencyData(dataArray);
    let left = 0;
    let right = 0;
    const half = Math.floor(dataArray.length / 2);
    for (let i = 0; i < half; i++) left += dataArray[i];
    for (let i = half; i < dataArray.length; i++) right += dataArray[i];
    left = (left / half) / 255;
    right = (right / half) / 255;

    meterLeft.style.height = `${Math.min(100, Math.max(3, left * 100))}%`;
    meterRight.style.height = `${Math.min(100, Math.max(3, right * 100))}%`;

    meterAnimation = requestAnimationFrame(animate);
  };
  animate();
}

function resetMeters() {
  meterLeft.style.height = "0%";
  meterRight.style.height = "0%";
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECTS) return;
  clearTimeout(reconnectTimer);
  reconnectAttempts += 1;
  reconnectCounter.textContent = String(reconnectAttempts);
  setReconnectState("pink");
  setState("reconnecting");

  reconnectTimer = setTimeout(async () => {
    try {
      audio.load();
      await audio.play();
      setReconnectState("green");
      setState("playing");
    } catch (err) {
      setReconnectState("red");
      scheduleReconnect();
    }
  }, 2500);
}

async function startPlayback() {
  clearTimeout(reconnectTimer);
  setReconnectState("off");
  setState("loading");
  audio.src = ENDPOINTS.stream;
  audio.load();

  try {
    await ensureAudioGraph();
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }
    await audio.play();
    setState("playing");
  } catch (err) {
    setState("error");
    scheduleReconnect();
  }
}

function pausePlayback() {
  audio.pause();
  clearTimeout(reconnectTimer);
  setReconnectState("off");
  setState("paused");
}

function stopPlayback() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  clearTimeout(reconnectTimer);
  reconnectAttempts = 0;
  reconnectCounter.textContent = "0";
  setReconnectState("off");
  setState("stopped");
  resetMeters();
}

audio.addEventListener("playing", () => {
  setState("playing");
  setReconnectState("off");
});

audio.addEventListener("pause", () => {
  if (state !== "stopped") setState("paused");
});

audio.addEventListener("waiting", () => {
  if (state === "playing") setState("loading");
});

audio.addEventListener("stalled", () => {
  setState("error");
  scheduleReconnect();
});

audio.addEventListener("error", () => {
  setState("error");
  scheduleReconnect();
});

audio.addEventListener("ended", () => {
  setState("error");
  scheduleReconnect();
});

btnPlay.addEventListener("click", startPlayback);
btnPause.addEventListener("click", pausePlayback);
btnStop.addEventListener("click", stopPlayback);
volumeSlider.addEventListener("input", updateVolume);

updateVolume();
refreshMetadata();
refreshHistory();
refreshHealth();

setInterval(refreshMetadata, META_INTERVAL_MS);
setInterval(refreshHealth, HEALTH_INTERVAL_MS);
setInterval(refreshHistory, 30000);
