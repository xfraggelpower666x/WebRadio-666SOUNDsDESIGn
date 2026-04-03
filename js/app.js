
const WORKER_BASE = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev";
const STREAM_URL = `${WORKER_BASE}/stream`;
const STATUS_URL = `${WORKER_BASE}/status`;

const SOURCES = [
  { key: "main", label: "Main Stream", url: STREAM_URL, description: "Primary worker stream" },
  { key: "backup", label: "Backup Stream", url: "https://my.idjstream.com/8686/stream", description: "Direct backup stream" },
  { key: "sunshine", label: "Sunshine Stream", url: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/", description: "Additional source" }
];

const audio = document.getElementById("audioPlayer");
audio.crossOrigin = "anonymous";
audio.volume = 0.85;

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
  playerTrack: document.getElementById("playerTrack"),
  timeCurrent: document.getElementById("timeCurrent"),
  timeDuration: document.getElementById("timeDuration"),
  progressRange: document.getElementById("progressRange"),
  volumeRange: document.getElementById("volumeRange"),
  sourceGrid: document.getElementById("sourceGrid"),
  statusJsonBox: document.getElementById("statusJsonBox")
};

function formatTime(sec){
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2,"0");
  const s = Math.floor(sec % 60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

function setWorkerState(ok){
  const val = ok ? "ONLINE" : "OFFLINE";
  els.workerMini.textContent = val;
  els.workerStatus.textContent = val;
  els.heroLive.textContent = ok ? "LIVE SIGNAL LOCKED" : "SIGNAL LOST";
}

function setSource(source){
  els.sourceValue.textContent = source.key;
  els.heroSource.textContent = source.key;
  els.playerTrack.textContent = `${source.label} — ${source.url}`;
}

function loadSource(key){
  const source = SOURCES.find(s => s.key === key) || SOURCES[0];
  audio.src = source.url;
  setSource(source);
}

async function fetchStatus(){
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function updateStatus(){
  try{
    const data = await fetchStatus();
    setWorkerState(true);
    els.listenersValue.textContent = data.listeners ?? 0;
    els.bitrateValue.textContent = data.bitrate ?? 0;
    els.djValue.textContent = data.dj || "---";
    els.heroDj.textContent = data.dj || "---";
    els.songTitle.textContent = data.song || "---";
    els.statusJsonBox.textContent = JSON.stringify(data, null, 2);
  }catch(err){
    setWorkerState(false);
    els.statusJsonBox.textContent = String(err);
  }
}

function buildMeters(){
  ["leftMeter","rightMeter"].forEach(id=>{
    const node = document.getElementById(id);
    for(let i=0;i<20;i++){
      const d=document.createElement("div");
      d.className="meter-bar";
      node.appendChild(d);
    }
  });
}
function updateMeters(level){
  ["leftMeter","rightMeter"].forEach(id=>{
    const bars=[...document.getElementById(id).children];
    const active=Math.max(1, Math.floor(level*bars.length));
    bars.forEach((bar, idx)=>bar.classList.toggle("active", idx >= bars.length-active));
  });
}

function renderSources(){
  els.sourceGrid.innerHTML = SOURCES.map(source => `
    <article class="source-card">
      <h3>${source.label}</h3>
      <p>${source.description}</p>
      <button class="cyber-btn" data-source="${source.key}">LOAD</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-source]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      loadSource(btn.dataset.source);
      audio.play().catch(()=>{});
    });
  });
}

function bindNav(){
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
    });
  });
}

document.getElementById("playMainBtn").addEventListener("click", ()=>{ loadSource("main"); audio.play().catch(()=>{}); });
document.getElementById("playBackupBtn").addEventListener("click", ()=>{ loadSource("backup"); audio.play().catch(()=>{}); });
document.getElementById("stopBtnCenter").addEventListener("click", ()=>{ audio.pause(); audio.currentTime = 0; });
document.getElementById("playBtn").addEventListener("click", ()=> audio.play().catch(()=>{}));
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

audio.addEventListener("play", ()=> updateMeters(0.78));
audio.addEventListener("pause", ()=> updateMeters(0.08));
audio.addEventListener("ended", ()=> updateMeters(0.08));

els.progressRange.addEventListener("input", e => {
  if (isFinite(audio.duration) && audio.duration > 0){
    audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
  }
});

buildMeters();
renderSources();
bindNav();
loadSource("main");
updateMeters(0.08);
updateStatus();
setInterval(updateStatus, 5000);
setInterval(()=>{
  if(!audio.paused){ updateMeters(0.35 + Math.random()*0.6); }
}, 250);
