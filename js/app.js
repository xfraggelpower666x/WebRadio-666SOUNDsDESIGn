
const WORKER_BASE = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev";
const STATUS_URL = `${WORKER_BASE}/status`;

const SOURCES = [
  { key: "main", label: "Main Stream", url: `${WORKER_BASE}/stream`, description: "Primary worker stream" },
  { key: "backup", label: "Backup Stream", url: "https://my.idjstream.com/8686/stream", description: "Direct backup stream" },
  { key: "sunshine", label: "Sunshine Stream", url: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/", description: "Additional source" }
];

const audio = document.getElementById("audioPlayer");
audio.crossOrigin = "anonymous";
audio.volume = 0.85;

const bootOverlay = document.getElementById("bootOverlay");
const bootStatus = document.getElementById("bootStatus");
const overlayMenu = document.getElementById("overlayMenu");
const coverImage = document.getElementById("coverImage");
const coverBlurImage = document.getElementById("coverBlurImage");
const visualCoverPreview = document.getElementById("visualCoverPreview");

const els = {
  workerMini: document.getElementById("workerMini"),
  workerStatus: document.getElementById("workerStatus"),
  sourceValue: document.getElementById("sourceValue"),
  listenersValue: document.getElementById("listenersValue"),
  bitrateValue: document.getElementById("bitrateValue"),
  djValue: document.getElementById("djValue"),
  heroLive: document.getElementById("heroLive"),
  songTitle: document.getElementById("songTitle"),
  heroSource: document.getElementById("heroSource"),
  heroDj: document.getElementById("heroDj"),
  heroListeners: document.getElementById("heroListeners"),
  heroBitrate: document.getElementById("heroBitrate"),
  playerTrack: document.getElementById("playerTrack"),
  fallbackLine: document.getElementById("fallbackLine"),
  timeCurrent: document.getElementById("timeCurrent"),
  timeDuration: document.getElementById("timeDuration"),
  progressRange: document.getElementById("progressRange"),
  volumeRange: document.getElementById("volumeRange"),
  sourceGrid: document.getElementById("sourceGrid"),
  overlaySources: document.getElementById("overlaySources"),
  statusJsonBox: document.getElementById("statusJsonBox"),
  reconnectState: document.getElementById("reconnectState")
};

let currentSourceKey = "main";
let reconnectArmed = true;
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let meterData = null;
let coverFallback = "assets/fallback.jpg";

function formatTime(sec){
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2,"0");
  const s = Math.floor(sec % 60).toString().padStart(2,"0");
  return `${m}:${s}`;
}
function sanitizeDjName(name){
  if (!name || String(name).trim() === "" || String(name).trim().toLowerCase() === "no dj"){
    return "666 Sounds Design Webradio Auto DJ";
  }
  return name;
}
function setWorkerState(ok){
  const val = ok ? "ONLINE" : "OFFLINE";
  els.workerMini.textContent = val;
  els.workerStatus.textContent = val;
  els.heroLive.textContent = ok ? "LIVE SIGNAL LOCKED" : "SIGNAL LOST";
}
function getSource(key){
  return SOURCES.find(s => s.key === key) || SOURCES[0];
}
function setSource(source){
  currentSourceKey = source.key;
  els.sourceValue.textContent = source.key;
  els.heroSource.textContent = source.key;
  els.playerTrack.textContent = `${source.label} — ${source.url}`;
  els.fallbackLine.textContent = source.key === "main" ? "Fallback: backup armed" : `Fallback: ${source.key} active`;
}
function loadSource(key){
  const source = getSource(key);
  audio.src = source.url;
  setSource(source);
}
async function safePlay(){
  try{
    if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
    await audio.play();
  }catch(err){}
}
async function fetchStatus(){
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
function applyCover(url){
  const finalUrl = url && String(url).trim() !== "" ? url : coverFallback;
  coverImage.src = finalUrl;
  coverBlurImage.src = finalUrl;
  visualCoverPreview.src = finalUrl;
}
async function updateStatus(){
  try{
    const data = await fetchStatus();
    const djName = sanitizeDjName(data.dj);
    setWorkerState(true);
    els.listenersValue.textContent = data.listeners ?? 0;
    els.bitrateValue.textContent = data.bitrate ?? 0;
    els.djValue.textContent = djName;
    els.heroDj.textContent = djName;
    els.heroListeners.textContent = data.listeners ?? 0;
    els.heroBitrate.textContent = data.bitrate ?? 0;
    els.songTitle.textContent = data.song || "---";
    els.statusJsonBox.textContent = JSON.stringify(data, null, 2);
    applyCover(data.art);
  }catch(err){
    setWorkerState(false);
    els.statusJsonBox.textContent = String(err);
    applyCover("");
  }
}
function buildMeters(){
  ["leftMeter","rightMeter"].forEach(id=>{
    const node = document.getElementById(id);
    node.innerHTML = "";
    for(let i=0;i<20;i++){
      const d=document.createElement("div");
      d.className="meter-bar";
      node.appendChild(d);
    }
  });
}
function updateMeterVisual(levelLeft, levelRight){
  const map = [["leftMeter", levelLeft], ["rightMeter", levelRight]];
  map.forEach(([id, level])=>{
    const bars=[...document.getElementById(id).children];
    const active=Math.max(1, Math.floor(level*bars.length));
    bars.forEach((bar, idx)=>bar.classList.toggle("active", idx >= bars.length-active));
  });
}
function initAudioReactive(){
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    meterData = new Uint8Array(analyser.frequencyBinCount);
    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }catch(err){}
}
function tickMeters(){
  if (analyser && meterData && !audio.paused){
    analyser.getByteFrequencyData(meterData);
    let low = 0, high = 0;
    const mid = Math.floor(meterData.length / 2);
    for(let i=0;i<mid;i++) low += meterData[i];
    for(let i=mid;i<meterData.length;i++) high += meterData[i];
    const left = Math.min(1, (low / mid) / 180);
    const right = Math.min(1, (high / (meterData.length - mid)) / 180);
    updateMeterVisual(left, right);
  } else {
    updateMeterVisual(0.08, 0.08);
  }
  requestAnimationFrame(tickMeters);
}
function renderSources(){
  const html = SOURCES.map(source => `
    <article class="source-card">
      <h3>${source.label}</h3>
      <p>${source.description}</p>
      <button class="cyber-btn" data-source="${source.key}">LOAD</button>
    </article>
  `).join("");
  els.sourceGrid.innerHTML = html;
  els.overlaySources.innerHTML = SOURCES.map(source => `
    <div class="overlay-source-line">
      <div>
        <strong>${source.label}</strong>
        <div>${source.description}</div>
      </div>
      <button class="cyber-btn" data-overlay-source="${source.key}">LOAD</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-source]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      loadSource(btn.dataset.source);
      safePlay();
    });
  });
  document.querySelectorAll("[data-overlay-source]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      loadSource(btn.dataset.overlaySource);
      safePlay();
      overlayMenu.classList.remove("active");
    });
  });
}
function bindNav(){
  document.querySelectorAll(".nav-btn[data-panel]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".nav-btn[data-panel]").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
    });
  });
}
function armReconnect(){
  els.reconnectState.textContent = "ARMED";
}
function forceReconnect(){
  els.reconnectState.textContent = "RECONNECTING";
  const current = currentSourceKey;
  loadSource(current);
  safePlay();
  setTimeout(()=> els.reconnectState.textContent = "ARMED", 1200);
}

document.getElementById("bootEnterBtn").addEventListener("click", async ()=>{
  bootStatus.textContent = "SYSTEM READY";
  bootOverlay.classList.remove("active");
  if (!audioCtx) initAudioReactive();
  loadSource("main");
  await safePlay();
});

document.getElementById("overlayMenuBtn").addEventListener("click", ()=> overlayMenu.classList.add("active"));
document.getElementById("overlayCloseBtn").addEventListener("click", ()=> overlayMenu.classList.remove("active"));
document.getElementById("forceReconnectBtn").addEventListener("click", forceReconnect);
document.getElementById("loadMainBtn").addEventListener("click", ()=>{ loadSource("main"); safePlay(); });
document.getElementById("loadBackupBtn").addEventListener("click", ()=>{ loadSource("backup"); safePlay(); });
document.getElementById("loadSunshineBtn").addEventListener("click", ()=>{ loadSource("sunshine"); safePlay(); });

document.getElementById("playMainBtn").addEventListener("click", ()=>{ loadSource("main"); safePlay(); });
document.getElementById("playBackupBtn").addEventListener("click", ()=>{ loadSource("backup"); safePlay(); });
document.getElementById("playSunshineBtn").addEventListener("click", ()=>{ loadSource("sunshine"); safePlay(); });
document.getElementById("stopBtnCenter").addEventListener("click", ()=>{ audio.pause(); audio.currentTime = 0; });
document.getElementById("playBtn").addEventListener("click", ()=> safePlay());
document.getElementById("pauseBtn").addEventListener("click", ()=> audio.pause());
document.getElementById("stopBtn").addEventListener("click", ()=> { audio.pause(); audio.currentTime = 0; });
els.volumeRange.addEventListener("input", e => audio.volume = Number(e.target.value));

audio.addEventListener("timeupdate", ()=>{
  const current = audio.currentTime || 0;
  const duration = audio.duration || 0;
  els.timeCurrent.textContent = formatTime(current);
  if (isFinite(duration) && duration > 0){
    els.timeDuration.textContent = formatTime(duration);
    els.progressRange.value = (current / duration) * 100;
  } else {
    els.timeDuration.textContent = "LIVE";
    els.progressRange.value = 0;
  }
});
audio.addEventListener("ended", ()=>{
  if (reconnectArmed && currentSourceKey === "main"){
    els.fallbackLine.textContent = "Fallback: switching to backup";
    loadSource("backup");
    safePlay();
  }
});
audio.addEventListener("error", ()=>{
  if (reconnectArmed && currentSourceKey === "main"){
    els.fallbackLine.textContent = "Fallback: main failed -> backup";
    loadSource("backup");
    safePlay();
  }
});
els.progressRange.addEventListener("input", e => {
  if (isFinite(audio.duration) && audio.duration > 0){
    audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
  }
});

buildMeters();
renderSources();
bindNav();
loadSource("main");
armReconnect();
applyCover("");
updateStatus();
setInterval(updateStatus, 5000);
requestAnimationFrame(tickMeters);
