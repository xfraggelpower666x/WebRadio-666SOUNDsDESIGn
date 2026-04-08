const CFG = window.RADIO_CONFIG || {};
const WORKER_BASE = CFG.radioBase || "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev";
const STREAM_MAIN = `${WORKER_BASE}${CFG.endpoints?.stream || "/api/radio/stream"}`;
const STREAM_BACKUP = `${WORKER_BASE}${CFG.endpoints?.backup || "/api/radio/backup"}`;

const audio = document.getElementById("audioPlayer") || (() => {
  const a = document.createElement("audio");
  a.id = "audioPlayer";
  a.preload = "none";
  a.playsInline = true;
  a.setAttribute("playsinline", "true");
  a.setAttribute("webkit-playsinline", "true");
  document.body.appendChild(a);
  return a;
})();

let bootDone = false;
let lastPlayableAt = Date.now();
let stallTimer = null;
let currentSource = "main";

function setAudioSource(url) {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.src = url;
  audio.load();
  lastPlayableAt = Date.now();
}

async function ensureUnlock() {
  if (window.AudioReactiveEngine) await window.AudioReactiveEngine.start();
  if (window._audioCtx && window._audioCtx.state === "suspended") {
    await window._audioCtx.resume();
  }
}

async function playUrl(url, sourceKey) {
  currentSource = sourceKey;
  setAudioSource(url);
  await ensureUnlock();
  await audio.play();
  resetStallTimer();
}

function resetStallTimer() {
  if (stallTimer) clearTimeout(stallTimer);
  const waitMs = 22000;
  stallTimer = setTimeout(async () => {
    if (Date.now() - lastPlayableAt > waitMs && !audio.paused && currentSource === "main") {
      await playUrl(STREAM_BACKUP, "backup");
    }
  }, waitMs + 1200);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("bootEnterBtn")?.addEventListener("click", async () => {
    const bootStatus = document.getElementById("bootStatus");
    try {
      bootStatus.textContent = "UNLOCKING AUDIO...";
      await ensureUnlock();
      bootDone = true;
      bootStatus.textContent = "SYSTEM READY";
      document.getElementById("bootOverlay")?.classList.remove("active");
    } catch (e) {
      bootStatus.textContent = "AUDIO UNLOCK FAILED";
    }
  });

  document.getElementById("playBtn")?.addEventListener("click", async () => {
    if (!bootDone) return;
    await playUrl(STREAM_MAIN, "main");
  });

  document.getElementById("playMainBtn")?.addEventListener("click", async () => {
    if (!bootDone) return;
    await playUrl(STREAM_MAIN, "main");
  });

  document.getElementById("playBackupBtn")?.addEventListener("click", async () => {
    if (!bootDone) return;
    await playUrl(STREAM_BACKUP, "backup");
  });

  audio.addEventListener("playing", () => { lastPlayableAt = Date.now(); });
  audio.addEventListener("timeupdate", () => { lastPlayableAt = Date.now(); });
  audio.addEventListener("waiting", () => {});
  audio.addEventListener("stalled", () => {});
  audio.addEventListener("error", async () => {
    if (currentSource === "main") await playUrl(STREAM_BACKUP, "backup");
  });
});
