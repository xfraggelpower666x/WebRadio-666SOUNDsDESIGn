// ==================================================
// DATEI: js/extern.js
// ERSTELLT: 2026-04-20
// GEÄNDERT: 2026-08-17
// STATUS: MINIMAL ROOT PLAYER
// ZWECK: Schlanke Audio-/Metadata-Logik für den externen Root-Player.
// ÄNDERUNG: Listener-Kapazität ausschließlich live aus /api/nowplaying.
// ==================================================

const STREAMS = {
  main: "/stream",
  backup: "/fallback-stream",
  metadata: "/api/nowplaying",
  pollMs: 8000
};

const audio = document.getElementById("radio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const reconnectBtn = document.getElementById("reconnectBtn");
const mainBtn = document.getElementById("mainBtn");
const backBtn = document.getElementById("backBtn");
const muteBtn = document.getElementById("muteBtn");
const volumeSlider = document.getElementById("volumeSlider");

const trackTitle = document.getElementById("trackTitle");
const listenersText = document.getElementById("listenersText");
const bitrateText = document.getElementById("bitrateText");
const djText = document.getElementById("djText");
const connectionState = document.getElementById("connectionState");
const streamMode = document.getElementById("streamMode");
const metaMode = document.getElementById("metaMode");

let currentSource = "main";
let muted = false;
let metadataTimer = null;
let lastTitle = "Warte auf Metadaten …";
let userStopped = false;

function setConnection(text) {
  connectionState.textContent = text;
}

function setSourceButtons() {
  mainBtn.classList.toggle("is-active", currentSource === "main");
  backBtn.classList.toggle("is-active", currentSource === "backup");
  streamMode.textContent = currentSource === "main" ? "MAIN" : "BACKUP";
}

function applyVolume() {
  audio.volume = Number(volumeSlider.value);
}

function disconnectAudio() {
  audio.pause();
  audio.removeAttribute("src");
  audio.src = "";
  audio.load();
}

async function switchTo(source) {
  currentSource = source;
  setSourceButtons();
  disconnectAudio();
  audio.src = source === "main" ? STREAMS.main : STREAMS.backup;
  applyVolume();
}

function pickValue(data, keys, fallback = "") {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function cleanMetaText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstMetaText(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const text = cleanMetaText(value);
      if (text) return text;
      continue;
    }
    if (value && typeof value === 'object') {
      const nested = value.display_title ?? value.normalized_title ?? value.text ?? value.title ?? value.name ?? value.songtitle ?? value.song ?? value.current ?? value.now_playing ?? value.nowPlaying;
      if (nested !== value) {
        const text = firstMetaText(nested);
        if (text) return text;
      }
    }
  }
  return '';
}

function cleanBroadcastTitle(value) {
  let text = cleanMetaText(value)
    .replace(/^\s*(?:unknown title|no dj|loading metadata|metadata unavailable|metadaten werden geladen)\s*(?:[-:|–—·•]+\s*)*/i, '')
    .replace(/(?:\s*[-–—|·•]\s*){2,}/g, ' - ')
    .replace(/^\s*[-:|–—·•]+\s*|\s*[-:|–—·•]+\s*$/g, '')
    .trim();
  text = text.replace(/666\s*sounds?\s*design/ig, '666SOUNDsDESIGn').replace(/\blyvra\b/ig, 'LYVRA');
  const parts = text.split(/\s+(?:-|–|—|\||·|•)\s+/).map((part) => part.trim()).filter(Boolean);
  const seen = new Set();
  return parts.filter((part) => {
    const key = part.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(' - ') || text;
}

function hasBroadcastIdentity(value) {
  return /(?:fraggle(?:\s*power)?(?:\s*666)?|fraggel(?:\s*power)?(?:\s*666)?|666\s*sounds?\s*design|666soundsdesign|666\s*sound\s*system|666soundsystem|l\.?\s*y\.?\s*v\.?\s*r\.?\s*a\.?|\blyvra\b)/i.test(String(value || ''));
}

function normalizeTitle(data) {
  const served = firstMetaText(data?.display_title, data?.normalized_title, data?.title_display);
  if (served) return cleanBroadcastTitle(served);
  const raw = firstMetaText(data?.song, data?.title, data?.songtitle, data?.currentSong, data?.current_song, data?.track, data?.now_playing, data?.nowPlaying);
  const artist = firstMetaText(data?.artist, data?.song?.artist, data?.now_playing?.song?.artist);
  const title = cleanBroadcastTitle(raw);
  if (!title) return lastTitle || 'Live Stream';
  let candidate = title;
  const cleanArtist = cleanBroadcastTitle(artist);
  if (cleanArtist && hasBroadcastIdentity(cleanArtist) && !title.toLowerCase().includes(cleanArtist.toLowerCase())) candidate = cleanBroadcastTitle(`${cleanArtist} - ${title}`);
  return hasBroadcastIdentity(candidate) ? candidate : `LYVRA is alive · 666SOUNDsDESIGn · ${candidate}`;
}

function normalizeDj(value) {
  const raw = cleanMetaText(value);
  const lowered = raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!lowered || ['no dj', 'nodj', 'no dj status', 'unknown', 'offline', 'none', 'null', 'undefined', 'n a', 'na', 'dj 666', '666 dj', '666soundsdesign dj', '666 sounds design dj', 'lyvra dj'].includes(lowered) || lowered.includes('auto dj') || lowered.includes('autodj')) return 'LYVRA DJ';
  return raw;
}

async function fetchMetadata() {
  try {
    const response = await fetch(STREAMS.metadata, { cache: "no-store" });
    if (!response.ok) throw new Error("Metadata fetch failed");

    const data = await response.json();
    lastTitle = normalizeTitle(data);
    trackTitle.textContent = lastTitle;

    const listeners = Number.parseInt(pickValue(data, ["listeners", "currentlisteners", "currentListeners", "listener_count"], 0), 10);
    const maxListenersRaw = pickValue(data, ["maxlisteners", "maxListeners", "listener_capacity", "listenerCapacity"], "—");
    const maxListenersParsed = Number.parseInt(maxListenersRaw, 10);
    const maxListeners = Number.isFinite(maxListenersParsed) && maxListenersParsed > 0 ? String(maxListenersParsed) : "—";
    const bitrate = pickValue(data, ["bitrate"], "--");
    const dj = normalizeDj(firstMetaText(data?.dj_display, data?.dj, data?.djusername, data?.djstatus, data?.live_dj, data?.streamer, data?.presenter, data?.client, data?.live?.streamer_name, data?.live?.streamer, data?.live?.name));

    listenersText.textContent = `${Number.isFinite(listeners) ? listeners : 0} / ${maxListeners}`;
    bitrateText.textContent = bitrate ? `${bitrate} kbps` : "--";
    djText.textContent = String(dj);
    metaMode.textContent = "API";
  } catch (error) {
    trackTitle.textContent = lastTitle || "Metadaten aktuell nicht verfügbar";
    metaMode.textContent = "API ERR";
  }
}

function startMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = setInterval(fetchMetadata, STREAMS.pollMs);
}

function stopMetadataLoop() {
  if (metadataTimer) clearInterval(metadataTimer);
  metadataTimer = null;
}

async function safePlay() {
  try {
    userStopped = false;
    if (!audio.src) {
      audio.src = currentSource === "main" ? STREAMS.main : STREAMS.backup;
    }
    applyVolume();
    await audio.play();
    setConnection("PLAYING");
    startMetadataLoop();
  } catch (error) {
    setConnection("AUDIO ERROR");
  }
}

playBtn.addEventListener("click", () => { safePlay(); });
pauseBtn.addEventListener("click", () => {
  audio.pause();
  setConnection("PAUSED");
});
stopBtn.addEventListener("click", () => {
  userStopped = true;
  stopMetadataLoop();
  disconnectAudio();
  setConnection("STOPPED");
});
reconnectBtn.addEventListener("click", async () => {
  disconnectAudio();
  await switchTo(currentSource);
  await safePlay();
});
mainBtn.addEventListener("click", async () => {
  await switchTo("main");
  if (!userStopped) await safePlay();
});
backBtn.addEventListener("click", async () => {
  await switchTo("backup");
  if (!userStopped) await safePlay();
});
muteBtn.addEventListener("click", () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? "Unmute" : "Mute";
});
volumeSlider.addEventListener("input", applyVolume);

audio.addEventListener("playing", () => setConnection("PLAYING"));
audio.addEventListener("pause", () => {
  if (!userStopped && audio.src) setConnection("PAUSED");
});
audio.addEventListener("error", async () => {
  if (userStopped) return;
  if (currentSource === "main") {
    await switchTo("backup");
    await safePlay();
  } else {
    setConnection("STREAM ERROR");
  }
});

(async function init() {
  await switchTo("main");
  applyVolume();
  fetchMetadata();
})();
