
const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com/8686/stream";
const UPSTREAM_API_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

const CSS = `
* { box-sizing: border-box; }

:root {
  --bg: #23272f;
  --bg2: #12151b;
  --panel: rgba(25, 29, 36, 0.96);
  --cyan: #2ef7ff;
  --pink: #ff47b5;
  --text: #eef7ff;
  --muted: #a9bac8;
  --green: #53ff97;
  --red: #ff4f6f;
}

html, body {
  margin: 0;
  min-height: 100%;
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
  background:
    radial-gradient(circle at top left, rgba(255, 71, 181, 0.12), transparent 28%),
    radial-gradient(circle at bottom right, rgba(46, 247, 255, 0.12), transparent 30%),
    linear-gradient(180deg, var(--bg), var(--bg2));
}

body { min-height: 100vh; }

.app-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.player-card, .boot-panel {
  width: min(94vw, 520px);
  background: var(--panel);
  border: 1px solid rgba(46,247,255,0.35);
  border-radius: 22px;
  box-shadow: 0 0 20px rgba(46,247,255,0.2), 0 0 24px rgba(255,71,181,0.16);
  backdrop-filter: blur(10px);
}

.player-card { padding: 22px; }

.brand, .boot-title {
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--cyan);
  text-shadow: 0 0 12px rgba(46,247,255,0.4);
}

.brand { font-size: 1.45rem; margin-bottom: 18px; }
.boot-title { font-size: 1.55rem; margin-bottom: 8px; }
.boot-subtitle, .boot-note, .meta-label, .lamp-label, .display-label, .footer-note {
  color: var(--muted);
}

.lamp-row, .status-row, .controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.lamp-row, .status-row, .meta-grid, .controls { margin-bottom: 16px; }

.lamp-box, .pill, .meta-box {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
}

.lamp-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  flex: 1 1 120px;
}

.lamp {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
  display: inline-block;
}
.lamp-green { color: var(--green); background: var(--green); }
.lamp-red { color: var(--red); background: var(--red); }

.pill {
  padding: 8px 12px;
  font-size: 0.92rem;
}
.pill-dim { color: var(--muted); }

.display-block {
  position: relative;
  margin-bottom: 16px;
}
.display-window {
  border-radius: 14px;
  border: 1px solid rgba(46,247,255,0.28);
  background: rgba(0, 0, 0, 0.28);
  overflow: hidden;
  height: 54px;
  display: flex;
  align-items: center;
}

.marquee-track {
  white-space: nowrap;
  display: inline-block;
  padding-left: 100%;
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--pink);
  text-shadow: 0 0 10px rgba(255,71,181,0.32);
  animation: marquee 14s linear infinite;
}
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.history-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  display: none;
  z-index: 4;
  padding: 12px;
  border-radius: 14px;
  background: rgba(14, 17, 22, 0.97);
  border: 1px solid rgba(255,71,181,0.28);
  box-shadow: 0 0 18px rgba(255,71,181,0.15);
}
.display-block:hover .history-overlay,
.display-block:focus-within .history-overlay {
  display: block;
}
.history-title {
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--cyan);
}
.history-list {
  margin: 0;
  padding-left: 18px;
  max-height: 180px;
  overflow: auto;
}
.history-list li { margin-bottom: 6px; }

.meta-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.meta-box { padding: 12px; min-height: 78px; }
.meta-value {
  margin-top: 6px;
  font-weight: 700;
  color: var(--text);
  word-break: break-word;
}

.neon-button {
  flex: 1 1 140px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(46,247,255,0.45);
  background: linear-gradient(180deg, rgba(46,247,255,0.16), rgba(255,71,181,0.08));
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(46,247,255,0.2);
}
.neon-button.alt {
  border-color: rgba(255,71,181,0.45);
  box-shadow: 0 0 16px rgba(255,71,181,0.16);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(7, 9, 13, 0.86);
}
.overlay.hidden { display: none; }
.boot-panel { padding: 24px; text-align: center; }
.progress-wrap {
  width: 100%;
  height: 12px;
  margin-top: 18px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.progress-bar {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, var(--pink), var(--cyan));
  box-shadow: 0 0 16px rgba(255,71,181,0.22), 0 0 16px rgba(46,247,255,0.22);
  transition: width 0.12s linear;
}
.progress-text { margin-top: 10px; font-weight: 700; }

@media (max-width: 560px) {
  .meta-grid { grid-template-columns: 1fr; }
  .controls { flex-direction: column; }
}
`;
const APP_JS = `
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
  if (quality && format) return \`\${quality} / \${format}\`;
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
  listeners.textContent = \`\${displayCount} / \${STREAM_CONFIG.listener_capacity}\`;
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
      progressBar.style.width = \`\${percent}%\`;
      progressText.textContent = \`\${percent}%\`;
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
`;
const CONFIG_JS = `export const STREAM_CONFIG = {
  "primary_stream_url": "https://my.idjstream.com/666soundsdesign/stream",
  "fallback_stream_url": "https://my.idjstream.com/8686/stream",
  "api_url": "/api/nowplaying",
  "upstream_api_url": "https://my.idjstream.com/cp/get_info.php?p=8686",
  "poll_interval_ms": 10000,
  "listener_capacity": 250,
  "use_webhook": false
};
`;
const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>666SOUNDsDESIGn Radio</title>
  <link rel="stylesheet" href="/css/main.css" />
</head>
<body>
  <div id="bootOverlay" class="overlay">
    <div class="boot-panel">
      <div class="boot-title">666SOUNDsDESIGn</div>
      <div class="boot-subtitle">Starting Audio Systems</div>
      <button id="bootButton" class="neon-button">OK</button>
      <div class="progress-wrap"><div id="progressBar" class="progress-bar"></div></div>
      <div id="progressText" class="progress-text">0%</div>
      <div class="boot-note">Ein Tipp auf OK initialisiert Audio für iPhone / iPad.</div>
    </div>
  </div>

  <main class="app-shell">
    <section class="player-card">
      <div class="brand">666SOUNDsDESIGn</div>

      <div class="lamp-row">
        <div class="lamp-box">
          <span id="healthLamp" class="lamp lamp-red"></span>
          <span class="lamp-label">Health</span>
        </div>
        <div class="lamp-box">
          <span id="audioLamp" class="lamp lamp-red"></span>
          <span class="lamp-label">Audio</span>
        </div>
        <div class="lamp-box">
          <span id="metaLamp" class="lamp lamp-red"></span>
          <span class="lamp-label">Meta</span>
        </div>
      </div>

      <div class="status-row">
        <span id="streamStatus" class="pill">Ready</span>
        <span id="fallbackStatus" class="pill pill-dim">Primary</span>
      </div>

      <div id="historyWrap" class="display-block">
        <div class="display-label">Now Playing</div>
        <div class="display-window">
          <div id="marquee" class="marquee-track">Waiting for stream data...</div>
        </div>
        <div id="historyOverlay" class="history-overlay">
          <div class="history-title">Zuletzt gespielt</div>
          <ul id="historyList" class="history-list">
            <li>Keine History geladen</li>
          </ul>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">DJ / Server</div>
          <div id="djInfo" class="meta-value">Unbekannt</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Stream Quality</div>
          <div id="streamQuality" class="meta-value">Unbekannt</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Listeners</div>
          <div id="listeners" class="meta-value">0 / 250</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Source</div>
          <div id="sourceLabel" class="meta-value">Primary</div>
        </div>
      </div>

      <div class="controls">
        <button id="playBtn" class="neon-button">Play</button>
        <button id="pauseBtn" class="neon-button alt">Pause</button>
        <button id="reconnectBtn" class="neon-button alt">Reconnect</button>
      </div>

      <div class="footer-note">App-Stream-URL: <strong>/stream</strong></div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/js/app.js"></script>
</body>
</html>
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", {
        status: 200,
        headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/stream") {
      return Response.redirect(PRIMARY_STREAM_URL, 302);
    }

    if (url.pathname === "/fallback-stream") {
      return Response.redirect(FALLBACK_STREAM_URL, 302);
    }

    if (url.pathname === "/api/nowplaying") {
      try {
        const res = await fetch(UPSTREAM_API_URL, {
          headers: { "cache-control": "no-store" }
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: {
            "content-type": res.headers.get("content-type") || "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "metadata_unavailable" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      }
    }

    if (url.pathname === "/css/main.css") {
      return new Response(CSS, {
        headers: { "content-type": "text/css; charset=UTF-8" }
      });
    }

    if (url.pathname === "/js/app.js") {
      return new Response(APP_JS, {
        headers: { "content-type": "application/javascript; charset=UTF-8" }
      });
    }

    if (url.pathname === "/config/stream.config.js") {
      return new Response(CONFIG_JS, {
        headers: { "content-type": "application/javascript; charset=UTF-8" }
      });
    }

    return new Response(HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" }
    });
  }
};
