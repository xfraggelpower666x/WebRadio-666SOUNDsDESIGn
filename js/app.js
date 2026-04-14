const WORKER_BASE = window.location.origin;
const ENDPOINTS = {
  stream: `${WORKER_BASE}/stream`,
  fallback: `${WORKER_BASE}/fallback-stream`,
  metadata: `${WORKER_BASE}/metadata`,
  status: `${WORKER_BASE}/status`,
  debug: `${WORKER_BASE}/debug`,
  health: `${WORKER_BASE}/health`
};

const META_INTERVAL_MS = 10000;
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
const btnPlay = document.getElementById("btnPlay");
const btnPause = document.getElementById("btnPause");
const btnStop = document.getElementById("btnStop");

function splitTrack(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return { title: "No Track", artist: "---" };
  if (txt.includes(" - ")) {
    const [artist, ...rest] = txt.split(" - ");
    return { artist: artist.trim(), title: rest.join(" - ").trim() || txt };
  }
  return { title: txt, artist: "---" };
}

function applyCover(url) {
  if (!coverImage || !coverFallback) return;
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

coverImage?.addEventListener("error", () => {
  coverImage.hidden = true;
  coverFallback.hidden = false;
});

async function refreshMetadata() {
  try {
    const res = await fetch(ENDPOINTS.metadata, { cache: "no-store" });
    if (!res.ok) throw new Error("metadata http " + res.status);
    const meta = await res.json();
    const split = splitTrack(meta.song || meta.title);
    if (trackTitle) trackTitle.textContent = split.title;
    if (trackDj) trackDj.textContent = meta.djusername ? ("DJ: " + meta.djusername) : split.artist;
    if (listenerInfo) listenerInfo.textContent = String(meta.listeners ?? 0);
    if (bitrateInfo) bitrateInfo.textContent = String(meta.bitrate ?? "--");
    if (modeInfo) modeInfo.textContent = String(meta.mode || meta.stream || "--");
    if (sourceInfo) sourceInfo.textContent = String(meta.source || "worker");
    if (statusText) statusText.textContent = "READY";
    applyCover(meta.art || meta.image || meta.cover || "");
  } catch (e) {
    if (statusText) statusText.textContent = "META ERROR";
    if (sourceInfo) sourceInfo.textContent = "metadata offline";
  }
}

btnPlay?.addEventListener("click", async () => {
  try {
    audio.src = ENDPOINTS.stream;
    audio.load();
    await audio.play();
    if (statusText) statusText.textContent = "PLAYING";
  } catch (e) {
    if (statusText) statusText.textContent = "PLAY ERROR";
  }
});

btnPause?.addEventListener("click", () => {
  audio.pause();
  if (statusText) statusText.textContent = "PAUSED";
});

btnStop?.addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (statusText) statusText.textContent = "STOPPED";
});

refreshMetadata();
setInterval(refreshMetadata, META_INTERVAL_MS);
