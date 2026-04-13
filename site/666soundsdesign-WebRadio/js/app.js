
const WORKER_BASE = "https://webradio.666soundsdesign-broadcaster.com";
const ENDPOINTS = {
  stream: `${WORKER_BASE}/stream`,
  metadata: `${WORKER_BASE}/metadata`,
  history: `${WORKER_BASE}/history`,
  health: `${WORKER_BASE}/health`
};

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
const autoGainValue = document.getElementById("autoGainValue");
const grValue = document.getElementById("grValue");
const historyList = document.getElementById("historyList");

const ledStream = document.getElementById("ledStream");
const ledMeta = document.getElementById("ledMeta");
const ledGain = document.getElementById("ledGain");

const autoRetry = document.getElementById("autoRetry");
const autoGainToggle = document.getElementById("autoGainToggle");

document.getElementById("healthUrl").textContent = ENDPOINTS.health;
document.getElementById("metaUrl").textContent = ENDPOINTS.metadata;
document.getElementById("historyUrl").textContent = ENDPOINTS.history;
streamEndpoint.textContent = ENDPOINTS.stream;

const meterLDots = RadioUI.buildDots(document.getElementById("meterL"), 20);
const meterRDots = RadioUI.buildDots(document.getElementById("meterR"), 20);
const eqBars = RadioUI.buildBars(document.getElementById("eqVisual"), 32);

const boostButtons = [...document.querySelectorAll(".boost-btn")];
let boostLevel = 0;
let retryTimer = null;

async function ensureEngine() {
  const engine = RadioAudioEngine.ensure(audio);
  await RadioAudioEngine.resume();
  return engine;
}

async function startPlayback() {
  try {
    await ensureEngine();
    audio.src = ENDPOINTS.stream;
    await audio.play();
    statusText.textContent = "playing";
    RadioUI.setLed(ledStream, "turquoise");
  } catch (err) {
    statusText.textContent = "play error";
    RadioUI.setLed(ledStream, "off");
    scheduleRetry();
  }
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  if (!autoRetry.checked) return;
  retryTimer = setTimeout(() => {
    startPlayback().catch(() => {});
  }, 3500);
}

function setBoost(level) {
  boostLevel = level;
  RadioAudioEngine.setBoost(level);
  boostButtons.forEach((btn) => btn.classList.remove("active"));
  const active = boostButtons.find((btn) => Number(btn.dataset.boost) === level);
  if (active) active.classList.add("active");
}

async function refreshHealth() {
  try {
    const res = await fetch(ENDPOINTS.health, { cache: "no-store" });
    const data = await res.json();
    sourceInfo.textContent = data?.streamStatus?.selectedSource || data?.streamSource || "main";
    RadioUI.setLed(ledStream, "turquoise");
  } catch {
    RadioUI.setLed(ledStream, "off");
  }
}

async function refreshMetadata() {
  try {
    const res = await fetch(ENDPOINTS.metadata, { cache: "no-store" });
    const data = await res.json();
    trackTitle.textContent = data.song || data.title || "Keine Metadaten";
    trackDj.textContent = data.dj || data.djusername || "AUTO DJ";
    listenerInfo.textContent = `${data.listeners || 0} Listener`;
    bitrateInfo.textContent = data.bitrate ? `${data.bitrate} kbps` : "— kbps";
    modeInfo.textContent = data.mode || data.stream || "OFFLINE";

    if (data.art) {
      coverImage.src = data.art;
      coverImage.classList.add("show");
      coverFallback.style.display = "none";
    } else {
      coverImage.classList.remove("show");
      coverImage.removeAttribute("src");
      coverFallback.style.display = "grid";
    }

    RadioUI.setLed(ledMeta, "turquoise");
  } catch {
    trackTitle.textContent = "Metadaten nicht erreichbar";
    RadioUI.setLed(ledMeta, "off");
  }
}

async function refreshHistory() {
  try {
    const res = await fetch(ENDPOINTS.history, { cache: "no-store" });
    const data = await res.json();
    const history = Array.isArray(data.history) ? data.history.slice(0, 10) : [];
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = '<div class="history-item">Keine Einträge</div>';
      return;
    }
    history.forEach((item) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.textContent = item.song || "Unbekannter Track";
      historyList.appendChild(div);
    });
  } catch {
    historyList.innerHTML = '<div class="history-item">History nicht erreichbar</div>';
  }
}

function animate() {
  const analysis = RadioAudioEngine.getAnalysis();
  if (analysis) {
    const gainNow = RadioAudioEngine.autoGainStep(autoGainToggle.checked, boostLevel);
    autoGainValue.textContent = `${gainNow.toFixed(2)}x`;
    grValue.textContent = `${analysis.reduction.toFixed(1)} dB`;

    if (analysis.reduction > 8) RadioUI.setLed(ledGain, "off");
    else if (analysis.reduction > 3) RadioUI.setLed(ledGain, "turquoise");
    else RadioUI.setLed(ledGain, "green");

    RadioUI.renderMeter(meterLDots, analysis.peak);
    RadioUI.renderMeter(meterRDots, analysis.peak * (0.92 + Math.random() * 0.12));
    RadioUI.renderSpectrum(eqBars, analysis.freqData);
  }
  requestAnimationFrame(animate);
}

document.getElementById("playBtn").addEventListener("click", startPlayback);
document.getElementById("pauseBtn").addEventListener("click", () => {
  audio.pause();
  statusText.textContent = "paused";
});
document.getElementById("retryBtn").addEventListener("click", async () => {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  await startPlayback();
});

boostButtons.forEach((btn) => {
  btn.addEventListener("click", () => setBoost(Number(btn.dataset.boost || 0)));
});

audio.addEventListener("playing", () => {
  statusText.textContent = "playing";
  RadioUI.setLed(ledStream, "turquoise");
});

audio.addEventListener("pause", () => {
  if (!audio.ended) statusText.textContent = "paused";
});

audio.addEventListener("error", () => {
  statusText.textContent = "stream retry";
  RadioUI.setLed(ledStream, "off");
  scheduleRetry();
});

(async function boot() {
  await refreshHealth();
  await refreshMetadata();
  await refreshHistory();
  animate();
})();

setInterval(refreshHealth, 10000);
setInterval(refreshMetadata, 8000);
setInterval(refreshHistory, 20000);
