const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com/8686/stream";

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
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
      <header class="topbar">
        <div class="topbar-line"></div>
        <div class="brand">666SOUNDsDESIGn</div>
        <div class="topbar-line"></div>
      </header>

      <div class="status-grid">
        <div class="lamp-box">
          <span id="healthLamp" class="lamp lamp-red"></span>
          <span class="lamp-label">Health</span>
        </div>
        <div class="lamp-box">
          <span id="audioLamp" class="lamp lamp-red"></span>
          <span class="lamp-label">Audio</span>
        </div>
        <div class="lamp-box">
          <span id="sourceLamp" class="lamp lamp-cyan"></span>
          <span class="lamp-label">Source</span>
        </div>
      </div>

      <div class="pill-row">
        <span id="streamStatus" class="pill">Ready</span>
        <span id="sourceLabel" class="pill pill-dim">Primary</span>
      </div>

      <div class="display-block">
        <div class="display-label">Now Playing</div>
        <div class="display-window">
          <div class="marquee-track">666SOUNDsDESIGn live stream online</div>
        </div>
      </div>

      <div class="mini-grid">
        <div class="mini-box">
          <div class="mini-label">Mode</div>
          <div class="mini-value">Live Stream</div>
        </div>
        <div class="mini-box">
          <div class="mini-label">Fallback</div>
          <div id="fallbackText" class="mini-value">Standby</div>
        </div>
      </div>

      <div class="control-strip">
        <button id="playBtn" class="control-btn main">Play</button>
        <button id="pauseBtn" class="control-btn">Pause</button>
        <button id="reconnectBtn" class="control-btn">Reconnect</button>
      </div>

      <div class="audio-tools">
        <button id="muteBtn" class="small-btn">Mute</button>
        <div class="volume-wrap">
          <label for="volumeRange">Volume</label>
          <input id="volumeRange" type="range" min="0" max="1" step="0.01" value="1" />
        </div>
      </div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/js/app.js"></script>
</body>
</html>
`;
const CSS = `* { box-sizing: border-box; }

:root {
  --bg: #1d2128;
  --bg2: #12151b;
  --panel: rgba(22, 26, 33, 0.96);
  --panel2: rgba(31, 36, 45, 0.9);
  --cyan: #20f2ff;
  --pink: #ff4db3;
  --green: #47ff8a;
  --red: #ff5570;
  --text: #eef7ff;
  --muted: #afbfcc;
  --border: rgba(32, 242, 255, 0.28);
  --shadow-cyan: 0 0 18px rgba(32, 242, 255, 0.18);
  --shadow-pink: 0 0 18px rgba(255, 77, 179, 0.14);
}

html, body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(255, 77, 179, 0.10), transparent 28%),
    radial-gradient(circle at bottom right, rgba(32, 242, 255, 0.11), transparent 30%),
    linear-gradient(180deg, var(--bg), var(--bg2));
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
}

body { min-height: 100vh; }

.app-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.player-card,
.boot-panel {
  width: min(94vw, 520px);
  background: linear-gradient(180deg, rgba(21,25,32,0.98), rgba(18,21,27,0.98));
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow-cyan), var(--shadow-pink);
  backdrop-filter: blur(10px);
}

.player-card { padding: 16px; }

.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.topbar-line {
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--cyan), transparent);
  box-shadow: 0 0 12px rgba(32, 242, 255, 0.25);
}

.brand,
.boot-title {
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--cyan);
  text-shadow: 0 0 12px rgba(32, 242, 255, 0.34);
}

.brand { font-size: 1.55rem; }
.boot-title { font-size: 1.5rem; margin-bottom: 8px; }

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.lamp-box,
.pill,
.mini-box,
.display-window,
.control-btn,
.small-btn,
.volume-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
}

.lamp-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  min-height: 50px;
}

.lamp {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 10px currentColor;
}
.lamp-green { color: var(--green); background: var(--green); }
.lamp-red { color: var(--red); background: var(--red); }
.lamp-cyan { color: var(--cyan); background: var(--cyan); }

.lamp-label,
.display-label,
.boot-subtitle,
.boot-note,
.mini-label,
.volume-wrap label {
  color: var(--muted);
}

.pill-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.pill {
  padding: 8px 12px;
  font-size: 0.92rem;
}
.pill-dim { color: var(--muted); }

.display-block { margin-bottom: 12px; }
.display-window {
  height: 54px;
  overflow: hidden;
  display: flex;
  align-items: center;
  border-color: rgba(32, 242, 255, 0.22);
}

.marquee-track {
  white-space: nowrap;
  display: inline-block;
  padding-left: 100%;
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--pink);
  text-shadow: 0 0 10px rgba(255, 77, 179, 0.3);
  animation: marquee 12s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.mini-box { padding: 10px 12px; min-height: 68px; }
.mini-value { margin-top: 6px; font-weight: 700; }

.control-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.control-btn,
.small-btn {
  appearance: none;
  border: 1px solid rgba(32, 242, 255, 0.35);
  color: var(--text);
  padding: 14px 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-cyan);
  background: linear-gradient(180deg, rgba(32,242,255,0.14), rgba(255,77,179,0.06));
}

.control-btn.main {
  border-color: rgba(255, 77, 179, 0.35);
  box-shadow: var(--shadow-pink);
}

.audio-tools {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: stretch;
}

.small-btn {
  border-color: rgba(255, 77, 179, 0.28);
  box-shadow: var(--shadow-pink);
}

.volume-wrap {
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

input[type="range"] {
  width: 100%;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(7, 10, 14, 0.86);
}
.overlay.hidden { display: none; }

.boot-panel { padding: 22px; text-align: center; }

.neon-button {
  appearance: none;
  border: 1px solid rgba(32, 242, 255, 0.45);
  border-radius: 16px;
  padding: 14px 18px;
  background: linear-gradient(180deg, rgba(32,242,255,0.16), rgba(255,77,179,0.08));
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-cyan);
}

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
  transition: width 0.12s linear;
}
.progress-text { margin-top: 10px; font-weight: 700; }

@media (max-width: 560px) {
  .app-shell { padding: 10px; }
  .player-card { padding: 14px; width: min(96vw, 96vw); }
  .brand { font-size: 1.28rem; }
  .lamp-box { min-height: 44px; padding: 8px 10px; }
  .status-grid { gap: 8px; }
  .pill-row { gap: 8px; }
  .display-window { height: 48px; }
  .mini-box { min-height: 58px; padding: 8px 10px; }
  .control-btn { padding: 12px 8px; }
  .audio-tools { grid-template-columns: 92px 1fr; }
  .boot-panel { width: 100%; }
}
`;
const APP_JS = `import { STREAM_CONFIG } from "../config/stream.config.js";

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
      progressBar.style.width = \`\${percent}%\`;
      progressText.textContent = \`\${percent}%\`;
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
`;
const CONFIG_JS = `export const STREAM_CONFIG = {
  "primary_stream_url": "https://666soundsdesign-broadcaster.com/stream",
  "fallback_stream_url": "https://my.idjstream.com/8686/stream",
  "poll_interval_ms": 0,
  "use_webhook": false
};
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname === "/stream") {
      return Response.redirect(PRIMARY_STREAM_URL, 302);
    }

    if (url.pathname === "/fallback-stream") {
      return Response.redirect(FALLBACK_STREAM_URL, 302);
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
