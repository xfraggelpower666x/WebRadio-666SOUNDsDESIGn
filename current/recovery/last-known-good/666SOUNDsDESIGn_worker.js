// ==========================================
// DATEI: AKTIVER_WORKER_MIRROR
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// STATUS: AKTIV
// ZWECK: Gespiegelter Haupt-Worker für 666SOUNDsDESIGn Radio mit externem Standard-Player,
//        internem Notfall-Fallback, Stream-/Metadaten-Proxy und stabiler Domain-Auslieferung.
// ÄNDERUNG: Redirect auf github.io entfernt; externer Player wird jetzt per Proxy unter
//           derselben Domain ausgeliefert. Interner Fallback-Player, Streams und Metadaten
//           bleiben bewusst unangetastet.
// HINWEIS: Nicht eigenmächtig kürzen. Root-Worker und Worker-Unterordner müssen identisch sein.
// ==========================================

const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";
const EXTERNAL_PLAYER_URL = "https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/";
const SWITCH_TIMEOUT_MS = 2000;

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>666SOUNDsDESIGn Radio — Internal</title>
  <link rel="icon" type="image/png" href="/icons/internal-icon.png" />
  <link rel="apple-touch-icon" href="/icons/internal-icon.png" />
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
        <div class="brand-wrap">
          <div class="brand">666SOUNDsDESIGn</div>
          <div class="build-tag">W3.1 ACTIVE</div>
        </div>
        <div class="topbar-line"></div>
      </header>

      <div class="status-inline">
        <button id="playerModeOrb" class="mode-orb" type="button" title="Interner Fallback-Player">
          <span id="playerModeLamp" class="mode-orb-dot mode-orb-dot-purple"></span>
          <span id="playerModeText">INT</span>
        </button>
        <button id="streamModeOrb" class="mode-orb" type="button" title="Hauptstream aktiv">
          <span id="streamModeLamp" class="mode-orb-dot mode-orb-dot-cyan"></span>
          <span id="streamModeText">MAIN</span>
        </button>
        <button id="audioModeOrb" class="mode-orb" type="button" title="Audio nicht aktiv">
          <span id="audioModeLamp" class="mode-orb-dot mode-orb-dot-pink"></span>
          <span id="audioModeText">AUD</span>
        </button>
        <button id="metaModeOrb" class="mode-orb" type="button" title="Metadaten werden geladen">
          <span id="metaModeLamp" class="mode-orb-dot mode-orb-dot-off"></span>
          <span id="metaModeText">META</span>
        </button>
      </div>

      <div class="display-block">
        <div class="display-head">
          <div class="display-label">Now Playing</div>
          <button id="historyToggle" class="tiny-btn" type="button">History</button>
        </div>
        <div id="metaText" class="display-label meta-line">Loading...</div>
        <div class="display-window">
          <div id="nowPlaying" class="marquee-track">Loading metadata...</div>
        </div>
        <div id="historyOverlay" class="history-overlay hidden">
          <div class="history-title">Last Tracks</div>
          <ul id="historyList" class="history-list">
            <li>No history loaded</li>
          </ul>
        </div>
      </div>

      <div class="mini-grid">
        <div class="mini-box">
          <div class="mini-label">Listeners</div>
          <div id="listenersText" class="mini-value">0 / 250</div>
        </div>
        <div class="mini-box">
          <div class="mini-label">Bitrate</div>
          <div id="bitrateText" class="mini-value">Unknown</div>
        </div>
        <div class="mini-box">
          <div class="mini-label">DJ / Status</div>
          <div id="djText" class="mini-value">666SOUNDsDESIGn DJ</div>
        </div>
      </div>

      <div class="control-strip">
        <button id="playBtn" class="control-btn main" type="button">Play</button>
        <button id="pauseBtn" class="control-btn" type="button">Pause</button>
        <button id="stopBtn" class="control-btn" type="button">Stop</button>
      </div>

      <div class="audio-tools">
        <button id="reconnectBtn" class="small-btn" type="button">Reconnect</button>
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <button id="streamMainBtn" class="small-btn stream-mini-btn is-active" type="button">MAIN</button>
        <button id="streamBackBtn" class="small-btn stream-mini-btn" type="button">BACK</button>
      </div>

      <div class="volume-meter-row">
        <div class="volume-wrap">
          <label for="volumeRange">Volume</label>
          <input id="volumeRange" type="range" min="0" max="1" step="0.01" value="1" />
          <div id="volumeHint" class="volume-hint hidden">Use iPhone buttons</div>
        </div>
        <div class="mini-level-wrap" aria-hidden="true">
          <div class="mini-level-track"><div id="miniMeterLeft" class="mini-level-fill"></div></div>
          <div class="mini-level-track"><div id="miniMeterRight" class="mini-level-fill"></div></div>
        </div>
      </div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/js/app.js"></script>
</body>
</html>`;

const CSS = `*{box-sizing:border-box}
:root{
  --bg:#1d2128;--bg2:#12151b;--cyan:#20f2ff;--pink:#ff4db3;--purple:#b366ff;
  --text:#eef7ff;--muted:#afbfcc;--border:rgba(32,242,255,.28);
  --shadow-cyan:0 0 18px rgba(32,242,255,.18);--shadow-pink:0 0 18px rgba(255,77,179,.14)
}
html,body{
  margin:0;min-height:100%;
  background:
    radial-gradient(circle at top left,rgba(255,77,179,.10),transparent 28%),
    radial-gradient(circle at bottom right,rgba(32,242,255,.11),transparent 30%),
    linear-gradient(180deg,var(--bg),var(--bg2));
  color:var(--text);font-family:Arial,Helvetica,sans-serif
}
body{min-height:100vh}
.app-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}
.player-card,.boot-panel{
  width:min(94vw,560px);
  background:linear-gradient(180deg,rgba(21,25,32,.98),rgba(18,21,27,.98));
  border:1px solid var(--border);border-radius:24px;
  box-shadow:var(--shadow-cyan),var(--shadow-pink);backdrop-filter:blur(10px)
}
.player-card{padding:16px}
.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:12px}
.topbar-line{height:2px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:.8}
.brand-wrap{display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap}
.brand{font-size:1.15rem;font-weight:800;color:var(--cyan);letter-spacing:.02em}
.build-tag{font-size:.68rem;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:var(--muted);background:rgba(255,255,255,.04)}
.status-inline{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.mode-orb,.tiny-btn,.control-btn,.small-btn{
  appearance:none;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);
  color:var(--text);cursor:pointer;transition:.15s ease
}
.mode-orb{
  border-radius:999px;padding:6px 10px;display:inline-flex;align-items:center;gap:6px
}
.mode-orb:hover,.tiny-btn:hover,.control-btn:hover,.small-btn:hover{transform:translateY(-1px)}
.mode-orb-dot{
  width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid transparent
}
.mode-orb-dot-cyan{background:var(--cyan);box-shadow:0 0 10px rgba(32,242,255,.45)}
.mode-orb-dot-purple{background:var(--purple);box-shadow:0 0 10px rgba(179,102,255,.45)}
.mode-orb-dot-pink{background:var(--pink);box-shadow:0 0 10px rgba(255,77,179,.45)}
.mode-orb-dot-off{background:transparent;border-color:rgba(255,255,255,.24);box-shadow:0 0 8px rgba(255,255,255,.12)}
.display-block{position:relative;margin-bottom:12px}
.display-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.display-label,.boot-subtitle,.boot-note,.mini-label,.volume-wrap label,.meta-line,.history-title{color:var(--muted)}
.display-window{
  height:54px;overflow:hidden;display:flex;align-items:center;border:1px solid rgba(32,242,255,.22);
  border-radius:14px;padding:0 12px;background:rgba(255,255,255,.03)
}
.marquee-track{
  white-space:nowrap;display:inline-block;padding-left:100%;font-size:1.08rem;font-weight:700;
  color:var(--pink);text-shadow:0 0 10px rgba(255,77,179,.3);animation:marquee 12s linear infinite
}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}
.tiny-btn{border-radius:12px;padding:6px 10px;font-size:.85rem}
.history-overlay{
  position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:10;border-radius:16px;padding:12px;
  background:rgba(13,16,22,.98);border:1px solid rgba(255,77,179,.25);box-shadow:var(--shadow-pink)
}
.history-overlay.hidden{display:none}
.history-list{margin:0;padding-left:18px;max-height:200px;overflow:auto}
.mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
.mini-box{
  border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.03);padding:10px 12px
}
.mini-value{font-weight:700;margin-top:2px}
.control-strip,.audio-tools{display:grid;gap:8px;margin-bottom:10px}
.control-strip{grid-template-columns:repeat(3,minmax(0,1fr))}
.audio-tools{grid-template-columns:repeat(4,minmax(0,1fr))}
.control-btn,.small-btn{
  border-radius:14px;padding:10px 12px;font-weight:700
}
.control-btn.main{border-color:rgba(255,77,179,.45);box-shadow:0 0 10px rgba(255,77,179,.16) inset}
.stream-mini-btn.is-active{box-shadow:0 0 12px rgba(32,242,255,.16) inset}
.volume-meter-row{display:grid;grid-template-columns:minmax(0,1fr) 74px;gap:10px;align-items:end}
.volume-wrap{display:flex;flex-direction:column;gap:6px}
.volume-wrap input[type="range"]{width:100%}
.volume-hint{font-size:.72rem;color:var(--muted);line-height:1.2}
.volume-hint.hidden{display:none}
.mini-level-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;align-items:end;height:56px}
.mini-level-track{
  height:56px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);
  padding:4px;display:flex;align-items:flex-end
}
.mini-level-fill{
  width:100%;height:10%;border-radius:8px;background:linear-gradient(180deg,var(--purple) 0%,var(--cyan) 100%);
  box-shadow:0 0 10px rgba(179,102,255,.35)
}
.overlay{position:fixed;inset:0;background:rgba(10,12,16,.92);display:flex;align-items:center;justify-content:center;z-index:50}
.overlay.hidden{display:none}
.boot-panel{padding:18px;display:grid;gap:10px;text-align:center}
.boot-title{font-size:1.2rem;font-weight:800;color:var(--cyan)}
.neon-button{
  appearance:none;border:1px solid rgba(255,77,179,.45);background:rgba(255,255,255,.04);color:var(--text);
  border-radius:16px;padding:12px 14px;font-weight:800;cursor:pointer
}
.progress-wrap{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.progress-bar{height:100%;width:0;background:linear-gradient(90deg,var(--pink),var(--cyan))}
.progress-text{font-size:.9rem;color:var(--muted)}
@media (max-width:520px){
  .mini-grid{grid-template-columns:1fr}
  .audio-tools{grid-template-columns:repeat(2,minmax(0,1fr))}
  .volume-meter-row{grid-template-columns:1fr 64px}
}`;

const APP_JS = `import { STREAM_CONFIG } from "../config/stream.config.js";
const overlay=document.getElementById("bootOverlay");
const bootButton=document.getElementById("bootButton");
const progressBar=document.getElementById("progressBar");
const progressText=document.getElementById("progressText");
const playBtn=document.getElementById("playBtn");
const pauseBtn=document.getElementById("pauseBtn");
const stopBtn=document.getElementById("stopBtn");
const reconnectBtn=document.getElementById("reconnectBtn");
const muteBtn=document.getElementById("muteBtn");
const streamMainBtn=document.getElementById("streamMainBtn");
const streamBackBtn=document.getElementById("streamBackBtn");
const volumeRange=document.getElementById("volumeRange");
const historyToggle=document.getElementById("historyToggle");
const playerModeOrb=document.getElementById("playerModeOrb");
const playerModeLamp=document.getElementById("playerModeLamp");
const playerModeText=document.getElementById("playerModeText");
const streamModeOrb=document.getElementById("streamModeOrb");
const streamModeLamp=document.getElementById("streamModeLamp");
const streamModeText=document.getElementById("streamModeText");
const audioModeOrb=document.getElementById("audioModeOrb");
const audioModeLamp=document.getElementById("audioModeLamp");
const metaModeOrb=document.getElementById("metaModeOrb");
const metaModeLamp=document.getElementById("metaModeLamp");
const nowPlaying=document.getElementById("nowPlaying");
const metaText=document.getElementById("metaText");
const listenersText=document.getElementById("listenersText");
const bitrateText=document.getElementById("bitrateText");
const djText=document.getElementById("djText");
const historyOverlay=document.getElementById("historyOverlay");
const historyList=document.getElementById("historyList");
const volumeHint=document.getElementById("volumeHint");
const miniMeterLeft=document.getElementById("miniMeterLeft");
const miniMeterRight=document.getElementById("miniMeterRight");
const audio=document.getElementById("radio");

let booted=false;
let muted=false;
let metadataTimer=null;
let lastTitle="Loading metadata...";
let historyOpen=false;
let streamMode="main";
let usingFallback=false;
let userVolume=1;
let intentionalDisconnect=false;
let audioCtx=null;
let mediaNode=null;
let analyser=null;
let meterBuffer=null;
let meterRaf=null;

function setLamp(el,state){
  if(!el) return;
  el.className = el.className
    .split(" ")
    .filter(cls => !cls.startsWith("mode-orb-dot-"))
    .join(" ")
    .trim();
  el.className = (el.className ? el.className + " " : "") + state;
}

function updateAudioIndicator(isActive){
  if(audioModeOrb) audioModeOrb.title=isActive?"Audio aktiv":"Audio nicht aktiv";
  if(audioModeLamp) setLamp(audioModeLamp,isActive?"mode-orb-dot-purple":"mode-orb-dot-pink");
}

function updateMetaIndicator(state){
  if(metaModeOrb) metaModeOrb.title = state==="online" ? "Metadaten online" : state==="offline" ? "Metadaten offline" : "Metadaten laden";
  if(metaModeLamp) setLamp(metaModeLamp, state==="online" ? "mode-orb-dot-cyan" : state==="offline" ? "mode-orb-dot-pink" : "mode-orb-dot-off");
}

function updateStreamModeUi(){
  const backup = streamMode==="backup";
  if(streamModeText) streamModeText.textContent = backup ? "BACK" : "MAIN";
  if(streamMainBtn) streamMainBtn.classList.toggle("is-active", !backup);
  if(streamBackBtn) streamBackBtn.classList.toggle("is-active", backup);
  if(streamModeLamp) setLamp(streamModeLamp, backup ? "mode-orb-dot-purple" : "mode-orb-dot-cyan");
  if(streamModeOrb) streamModeOrb.title = backup ? "Fallback-Stream aktiv" : "Hauptstream aktiv";
}

function setSource(isFallback){
  usingFallback = !!isFallback;
  updateStreamModeUi();
}

function rememberUserVolume(){
  const fromSlider = Number(volumeRange?.value);
  const fromAudio = Number(audio?.volume);
  const next = Number.isFinite(fromSlider) ? fromSlider : (Number.isFinite(fromAudio) ? fromAudio : userVolume);
  userVolume = Math.max(0, Math.min(1, next || 1));
}

function applyUserVolume(){
  const safe = Math.max(0, Math.min(1, Number(userVolume || 1)));
  userVolume = safe;
  if(volumeRange) volumeRange.value = String(safe);
  if(audio){
    audio.volume = safe;
    audio.muted = muted;
  }
}

function stopMetadataLoop(){
  if(metadataTimer) clearInterval(metadataTimer);
  metadataTimer = null;
}

function stopMiniMeter(){
  if(meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = null;
  if(miniMeterLeft) miniMeterLeft.style.height = "10%";
  if(miniMeterRight) miniMeterRight.style.height = "10%";
}

async function ensureMeter(){
  if(audioCtx || !audio) return;
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    audioCtx = new AudioCtx();
    mediaNode = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    meterBuffer = new Uint8Array(analyser.frequencyBinCount);
    mediaNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }catch(err){}
}

function startMiniMeter(){
  if(!analyser) return;
  if(meterRaf) cancelAnimationFrame(meterRaf);
  const tick = () => {
    if(!analyser || audio.paused){
      meterRaf = null;
      return;
    }
    analyser.getByteFrequencyData(meterBuffer);
    const len = meterBuffer.length || 1;
    const half = Math.max(1, Math.floor(len/2));
    const quarter = Math.max(1, Math.floor(len/4));
    let left=0,right=0,bass=0;
    for(let i=0;i<len;i++){
      const v = meterBuffer[i]/255;
      if(i<half) left += v; else right += v;
      if(i<quarter) bass += v;
    }
    left = (left/half)*0.70 + (bass/quarter)*0.55;
    right = (right/Math.max(1,len-half))*0.70 + (bass/quarter)*0.55;
    const lh = Math.max(10, Math.min(100, left*100));
    const rh = Math.max(10, Math.min(100, right*100));
    if(miniMeterLeft) miniMeterLeft.style.height = \`\${lh.toFixed(1)}%\`;
    if(miniMeterRight) miniMeterRight.style.height = \`\${rh.toFixed(1)}%\`;
    meterRaf = requestAnimationFrame(tick);
  };
  meterRaf = requestAnimationFrame(tick);
}

function hardDisconnect(mode="pause"){
  rememberUserVolume();
  intentionalDisconnect = true;
  stopMetadataLoop();
  stopMiniMeter();
  if(audio){
    audio.pause();
    audio.removeAttribute("src");
    audio.src = "";
    audio.load();
  }
  applyUserVolume();
  updateAudioIndicator(false);
}

function setMetadataStatus(text){
  if(metaText) metaText.textContent = text;
}

function pickValue(obj,keys,fallback=""){
  for(const key of keys){
    const value = obj?.[key];
    if(value!==undefined && value!==null && String(value).trim()!=="") return value;
  }
  return fallback;
}

function normalizeTitle(data){
  return String(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"], lastTitle || "Live Stream"));
}

function normalizeDjStatus(raw){
  const value = String(raw || "").trim();
  const lower = value.toLowerCase();
  if(!value || lower==="autodj" || lower==="auto dj" || lower==="unknown" || lower==="none" || lower==="client" || lower==="no dj"){
    return "666SOUNDsDESIGn DJ";
  }
  return value;
}

function renderHistory(items){
  if(!historyList) return;
  historyList.innerHTML = "";
  if(!Array.isArray(items) || !items.length){
    const li=document.createElement("li");
    li.textContent="No history loaded";
    historyList.appendChild(li);
    return;
  }
  items.slice(0,12).forEach((item)=>{
    const li=document.createElement("li");
    li.textContent=typeof item==="string" ? item : String(pickValue(item,["song","title","track","name"],"Unknown track"));
    historyList.appendChild(li);
  });
}

async function fetchMetadata(){
  try{
    const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});
    if(!res.ok) throw new Error("metadata fetch failed");
    const data=await res.json();
    const title=normalizeTitle(data);
    lastTitle=title;
    if(nowPlaying) nowPlaying.textContent=title;

    const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);
    const bitrate=pickValue(data,["bitrate"],"Unknown");
    const djStatus=normalizeDjStatus(pickValue(data,["djusername","djstatus","client"],"AutoDJ"));

    if(listenersText) listenersText.textContent=\`\${Number.isFinite(listeners)?listeners:0} / \${STREAM_CONFIG.listener_capacity}\`;
    if(bitrateText) bitrateText.textContent = bitrate ? \`\${String(bitrate)} kbps\` : "Unknown";
    if(djText) djText.textContent = String(djStatus);

    renderHistory(pickValue(data,["history"],[]));
    setMetadataStatus("Online");
    updateMetaIndicator("online");
  }catch(err){
    if(nowPlaying) nowPlaying.textContent = lastTitle || "Metadata unavailable";
    setMetadataStatus("Offline");
    updateMetaIndicator("offline");
  }
}

function startMetadataLoop(){
  if(metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer = setInterval(fetchMetadata, STREAM_CONFIG.poll_interval_ms);
}

async function tryPlayPrimary(){
  audio.src = STREAM_CONFIG.stream_url;
  applyUserVolume();
  await audio.play();
  applyUserVolume();
  setSource(false);
}

async function tryPlayFallback(){
  audio.src = STREAM_CONFIG.fallback_stream_url;
  applyUserVolume();
  await audio.play();
  applyUserVolume();
  setSource(true);
}

async function safePlay(){
  intentionalDisconnect = false;
  rememberUserVolume();
  applyUserVolume();
  try{
    if(streamMode==="backup"){
      await tryPlayFallback();
    }else{
      await tryPlayPrimary();
    }
    updateAudioIndicator(true);
    await ensureMeter();
    if(audioCtx && audioCtx.state==="suspended"){
      try{ await audioCtx.resume(); }catch(err){}
    }
    startMiniMeter();
    startMetadataLoop();
    return true;
  }catch(err){
    updateAudioIndicator(false);
    stopMiniMeter();
    return false;
  }
}

function runBootSequence(){
  return new Promise((resolve)=>{
    let percent=0;
    const timer=setInterval(()=>{
      percent+=4;
      if(percent>100) percent=100;
      if(progressBar) progressBar.style.width=\`\${percent}%\`;
      if(progressText) progressText.textContent=\`\${percent}%\`;
      if(percent>=100){
        clearInterval(timer);
        resolve();
      }
    },42);
  });
}

bootButton?.addEventListener("click", async()=>{
  if(booted) return;
  booted = true;
  bootButton.disabled = true;
  await runBootSequence();
  overlay?.classList.add("hidden");
  await safePlay();
});

playBtn?.addEventListener("click", async()=>{ await safePlay(); });
pauseBtn?.addEventListener("click", ()=>{ hardDisconnect("pause"); });
stopBtn?.addEventListener("click", ()=>{ hardDisconnect("stop"); });
reconnectBtn?.addEventListener("click", async()=>{ hardDisconnect("stop"); await safePlay(); });

muteBtn?.addEventListener("click", ()=>{
  muted = !muted;
  applyUserVolume();
  muteBtn.textContent = muted ? "Unmute" : "Mute";
});

streamMainBtn?.addEventListener("click", async()=>{
  streamMode="main";
  updateStreamModeUi();
  if(audio && !audio.paused){
    hardDisconnect("stop");
    await safePlay();
  }
});

streamBackBtn?.addEventListener("click", async()=>{
  streamMode="backup";
  updateStreamModeUi();
  if(audio && !audio.paused){
    hardDisconnect("stop");
    await safePlay();
  }
});

streamModeOrb?.addEventListener("click", async()=>{
  streamMode = streamMode==="backup" ? "main" : "backup";
  updateStreamModeUi();
  if(audio && !audio.paused){
    hardDisconnect("stop");
    await safePlay();
  }
});

volumeRange?.addEventListener("input", ()=>{
  userVolume = Number(volumeRange.value);
  applyUserVolume();
});

historyToggle?.addEventListener("click", ()=>{
  historyOpen = !historyOpen;
  historyOverlay?.classList.toggle("hidden", !historyOpen);
});

audio?.addEventListener("playing", async()=>{
  intentionalDisconnect = false;
  applyUserVolume();
  updateAudioIndicator(true);
  await ensureMeter();
  if(audioCtx && audioCtx.state==="suspended"){
    try{ await audioCtx.resume(); }catch(err){}
  }
  startMiniMeter();
});

audio?.addEventListener("error", ()=>{
  if(intentionalDisconnect){
    intentionalDisconnect = false;
    return;
  }
  updateAudioIndicator(false);
  stopMiniMeter();
});

const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(isiOS && volumeHint) volumeHint.classList.remove("hidden");
if(playerModeText) playerModeText.textContent="INT";
if(playerModeOrb) playerModeOrb.title="Interner Fallback-Player";
updateMetaIndicator("loading");
updateAudioIndicator(false);
updateStreamModeUi();
setSource(false);
setMetadataStatus("Loading...");
applyUserVolume();
fetchMetadata();`;if(bitrateText)bitrateText.textContent=bitrate?\`\${String(bitrate)} kbps\`:"Unknown";if(djText)djText.textContent=String(djStatus);renderHistory(pickValue(data,["history"],[]));setMetadataStatus("Online");setLamp(metaLamp,"lamp-green")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red")}}
function startMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);fetchMetadata();metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms)}
async function tryPlayPrimary(){audio.src=STREAM_CONFIG.stream_url;applyUserVolume();await audio.play();applyUserVolume();setSource(false)}
async function tryPlayFallback(){audio.src=STREAM_CONFIG.fallback_stream_url;applyUserVolume();await audio.play();applyUserVolume();setSource(true)}
async function safePlay(){
  intentionalDisconnect=false;
  rememberUserVolume();
  applyUserVolume();
  try{
    if(streamMode==="backup"){
      await tryPlayFallback();
    }else{
      await tryPlayPrimary();
    }
    setStatus("Playing");
    setLamp(audioLamp,"lamp-green");
    startMetadataLoop();
    return true;
  }catch(e1){
    setStatus("Audio Error");
    setLamp(audioLamp,"lamp-pink");
    return false;
  }
}
function runBootSequence(){return new Promise((resolve)=>{let percent=0;const timer=setInterval(()=>{percent+=4;if(percent>100)percent=100;if(progressBar)progressBar.style.width=\`\${percent}%\`;if(progressText)progressText.textContent=\`\${percent}%\`;if(percent>=100){clearInterval(timer);resolve()}},42)})}
bootButton?.addEventListener("click",async()=>{if(booted)return;booted=true;bootButton.disabled=true;await runBootSequence();overlay?.classList.add("hidden");await safePlay()});
playBtn?.addEventListener("click",async()=>{await safePlay()});
pauseBtn?.addEventListener("click",()=>{hardDisconnect("pause")});
stopBtn?.addEventListener("click",()=>{hardDisconnect("stop")});
reconnectBtn?.addEventListener("click",async()=>{hardDisconnect("stop");await safePlay()});
muteBtn?.addEventListener("click",()=>{muted=!muted;applyUserVolume();muteBtn.textContent=muted?"Unmute":"Mute"});
streamMainBtn?.addEventListener("click",async()=>{streamMode="main";updateStreamModeUi();if(audio && !audio.paused){hardDisconnect("stop");await safePlay()}});
streamBackBtn?.addEventListener("click",async()=>{streamMode="backup";updateStreamModeUi();if(audio && !audio.paused){hardDisconnect("stop");await safePlay()}});
volumeRange?.addEventListener("input",()=>{userVolume=Number(volumeRange.value);applyUserVolume()});
historyToggle?.addEventListener("click",()=>{historyOpen=!historyOpen;historyOverlay?.classList.toggle("hidden",!historyOpen)});
audio?.addEventListener("playing",()=>{intentionalDisconnect=false;applyUserVolume();setStatus("Playing");setLamp(audioLamp,"lamp-green")});
audio?.addEventListener("error",async()=>{if(intentionalDisconnect){intentionalDisconnect=false;return}setStatus("Audio Error");setLamp(audioLamp,"lamp-pink")});
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);if(isiOS&&volumeHint)volumeHint.textContent="Use iPhone buttons";if(playerModeText)playerModeText.textContent="INT";setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-pink");setLamp(sourceLamp,"lamp-cyan");updateStreamModeUi();setSource(false);setMetadataStatus("Loading...");applyUserVolume();fetchMetadata();`;

const CONFIG_JS = `export const STREAM_CONFIG = {
  "stream_url": "/stream",
  "fallback_stream_url": "/fallback-stream",
  "metadata_url": "/api/nowplaying",
  "poll_interval_ms": 8000,
  "listener_capacity": 250,
  "use_webhook": false,
  "primary_upstream": "https://my.idjstream.com/666soundsdesign/stream",
  "fallback_upstream": "https://my.idjstream.com:8686/stream"
};`;


async function checkExternal(){
  try{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), SWITCH_TIMEOUT_MS);
    const response = await fetch(EXTERNAL_PLAYER_URL, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "cache-control": "no-store" }
    });
    clearTimeout(timer);
    return response.ok;
  }catch(err){
    return false;
  }
}

function passthroughHeaders(sourceHeaders){
  const headers=new Headers();
  const allow=["content-type","content-length","accept-ranges","content-range","cache-control","icy-br","icy-description","icy-genre","icy-metaint","icy-name","icy-notice1","icy-notice2","icy-pub","icy-url","transfer-encoding"];
  for(const key of allow){const value=sourceHeaders.get(key);if(value)headers.set(key,value)}
  headers.set("access-control-allow-origin","*");
  headers.set("x-radio-proxy","666soundsdesign-worker");
  return headers;
}
async function proxyStream(request,upstream){
  const init={method:request.method,headers:new Headers()};
  const range=request.headers.get("range");
  const userAgent=request.headers.get("user-agent");
  const accept=request.headers.get("accept");
  const icyMeta=request.headers.get("icy-metadata");
  if(range)init.headers.set("range",range);
  if(userAgent)init.headers.set("user-agent",userAgent);
  if(accept)init.headers.set("accept",accept);
  if(icyMeta)init.headers.set("icy-metadata",icyMeta);
  const response=await fetch(upstream,init);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:passthroughHeaders(response.headers)});
}


function buildExternalProxyHeaders(sourceHeaders){
  // Relevante Header des externen Players sauber an den Browser weiterreichen.
  const headers = new Headers(sourceHeaders);
  headers.set("cache-control", "no-store");
  headers.delete("content-security-policy");
  headers.delete("x-frame-options");
  headers.delete("content-length");
  headers.set("x-player-mode", "external-proxy");
  return headers;
}

async function fetchExternalAsset(pathname, request){
  // Externe Player-Dateien unter derselben Domain ausliefern, damit github.io nicht sichtbar wird.
  const suffix = pathname.replace(/^\/external-player\/?/, "");
  const upstreamUrl = new URL(suffix || "", EXTERNAL_PLAYER_URL).toString();
  const init = {
    method: request.method,
    headers: {
      "user-agent": request.headers.get("user-agent") || "Cloudflare-Worker",
      "cache-control": "no-store"
    },
    redirect: "follow"
  };
  const response = await fetch(upstreamUrl, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildExternalProxyHeaders(response.headers)
  });
}

async function serveExternalIndex(request){
  // Startseite des externen Players laden und mit Base-Tag versehen.
  // Dadurch bleiben Asset-Pfade stabil, obwohl die Domain oben gleich bleibt.
  const response = await fetch(EXTERNAL_PLAYER_URL, {
    method: "GET",
    headers: {
      "user-agent": request.headers.get("user-agent") || "Cloudflare-Worker",
      "cache-control": "no-store"
    },
    redirect: "follow"
  });
  let html = await response.text();
  if (!html.includes('<base href="/external-player/">')) {
    html = html.replace("<head>", '<head>\n  <base href="/external-player/">');
  }
  const headers = buildExternalProxyHeaders(response.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request){
    const url=new URL(request.url);

    // Standardmodus: externer Player zuerst. Nur bei Fehler auf internen Worker-Player wechseln.
    if((url.pathname==="/" || url.pathname==="/index.html") && url.searchParams.get("player")!=="internal"){
      const externalOk = await checkExternal();
      if(externalOk){
        return await serveExternalIndex(request);
      }
    }

    // Direkte Proxy-Auslieferung für alle externen Player-Assets unter derselben Domain.
    if(url.pathname==="/external-player" || url.pathname==="/external-player/"){
      return await serveExternalIndex(request);
    }
    if(url.pathname.startsWith("/external-player/")){
      return await fetchExternalAsset(url.pathname, request);
    }

    // Permanente interne Fallback-Player-Routen.
    if(url.pathname==="/internal" || url.pathname==="/internal/" || url.pathname==="/internal-test" || url.pathname==="/internal-test/"){
      return new Response(HTML,{status:200,headers:{"content-type":"text/html; charset=UTF-8"}});
    }

    // Gesundheitscheck unverändert lassen.
    if(url.pathname==="/health"){
      return new Response("OK",{status:200,headers:{"content-type":"text/plain; charset=UTF-8","cache-control":"no-store","access-control-allow-origin":"*"}});
    }

    // Metadaten-Proxy NICHT umbauen, damit iPhone-App und bestehende Clients stabil bleiben.
    if(url.pathname==="/api/nowplaying"){
      try{
        const upstream=await fetch(METADATA_URL,{headers:{"cache-control":"no-store"}});
        const body=await upstream.text();
        return new Response(body,{status:upstream.status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store","access-control-allow-origin":"*","x-radio-proxy":"666soundsdesign-worker"}});
      }catch(err){
        return new Response(JSON.stringify({error:"metadata_proxy_failed"}),{status:502,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store","access-control-allow-origin":"*"}});
      }
    }

    // Stream-Routen unverändert lassen.
    if(url.pathname==="/stream"){
      try{return await proxyStream(request,PRIMARY_STREAM_URL)}catch(err){return await proxyStream(request,FALLBACK_STREAM_URL)}
    }
    if(url.pathname==="/fallback-stream"){
      return await proxyStream(request,FALLBACK_STREAM_URL)
    }

    // Interner Notfall-Player bleibt komplett erhalten.
    if(url.pathname==="/icons/internal-icon.png"){
      return fetch("https://raw.githubusercontent.com/xfraggelpower666x/WebRadio-666SOUNDsDESIGn/WebRadio-666SOUNDsDESIGn/icons/internal-icon.png", {headers: {"cache-control":"no-store"}});
    }
    if(url.pathname==="/css/main.css"){
      return new Response(CSS,{headers:{"content-type":"text/css; charset=UTF-8"}});
    }
    if(url.pathname==="/js/app.js"){
      return new Response(APP_JS,{headers:{"content-type":"application/javascript; charset=UTF-8"}});
    }
    if(url.pathname==="/config/stream.config.js"){
      return new Response(CONFIG_JS,{headers:{"content-type":"application/javascript; charset=UTF-8"}});
    }
    return new Response(HTML,{status:200,headers:{"content-type":"text/html; charset=UTF-8"}});
  }
};
