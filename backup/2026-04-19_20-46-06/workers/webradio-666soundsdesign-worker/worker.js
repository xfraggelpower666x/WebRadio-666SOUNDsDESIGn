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
  <title>666SOUNDsDESIGn Radio — Internal W4</title>
  <link rel="icon" type="image/png" href="/icons/internal-icon.png" />
  <link rel="apple-touch-icon" href="/icons/internal-icon.png" />
  <link rel="stylesheet" href="/css/main.css" />
</head>
<body data-internal-build="W4">
  <div id="bootOverlay" class="overlay">
    <div class="boot-panel">
      <div class="boot-title">666SOUNDsDESIGn</div>
      <div class="boot-subtitle">Internal Fallback Player</div>
      <button id="bootButton" class="neon-button">OK</button>
      <div class="progress-wrap"><div id="progressBar" class="progress-bar"></div></div>
      <div id="progressText" class="progress-text">0%</div>
      <div class="boot-note">Ein Tipp auf OK initialisiert Audio für iPhone / iPad.</div>
    </div>
  </div>

  <main class="app-shell">
    <section class="player-card">
      <header class="player-header">
        <div class="brand-wrap">
          <div class="brand">666SOUNDsDESIGn</div>
          <div class="player-sub">INTERNAL FALLBACK PLAYER</div>
        </div>
        <div class="status-orbs">
          <button id="playerModeOrb" class="status-orb" type="button" title="Interner Fallback-Player">
            <span id="playerModeLamp" class="status-orb-dot status-orb-dot-purple"></span>
            <span id="playerModeText">INT</span>
          </button>
          <button id="streamModeOrb" class="status-orb" type="button" title="Hauptstream aktiv">
            <span id="streamModeLamp" class="status-orb-dot status-orb-dot-cyan"></span>
            <span id="streamModeText">MAIN</span>
          </button>
          <button id="audioModeOrb" class="status-orb" type="button" title="Audio nicht aktiv">
            <span id="audioModeLamp" class="status-orb-dot status-orb-dot-pink"></span>
            <span id="audioModeText">AUD</span>
          </button>
          <button id="metaModeOrb" class="status-orb" type="button" title="Metadaten werden geladen">
            <span id="metaModeLamp" class="status-orb-dot status-orb-dot-off"></span>
            <span id="metaModeText">META</span>
          </button>
        </div>
      </header>

      <section class="now-playing-card">
        <div class="now-top">
          <div class="now-texts">
            <div class="section-label">Now Playing</div>
            <div id="nowPlaying" class="now-title">Loading metadata...</div>
            <div id="metaText" class="now-subtitle">Loading...</div>
          </div>
          <div class="visual-shell" aria-hidden="true">
            <div class="visual-grid">
              <div class="visual-col" id="eqBar0"></div>
              <div class="visual-col" id="eqBar1"></div>
              <div class="visual-col" id="eqBar2"></div>
              <div class="visual-col" id="eqBar3"></div>
              <div class="visual-col" id="eqBar4"></div>
              <div class="visual-col" id="eqBar5"></div>
              <div class="visual-col" id="eqBar6"></div>
              <div class="visual-col" id="eqBar7"></div>
              <div class="visual-col" id="eqBar8"></div>
              <div class="visual-col" id="eqBar9"></div>
              <div class="visual-col" id="eqBar10"></div>
              <div class="visual-col" id="eqBar11"></div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Listeners</div>
            <div id="listenersText" class="info-value">0 / 250</div>
          </div>
          <div class="info-box">
            <div class="info-label">Bitrate</div>
            <div id="bitrateText" class="info-value">Unknown</div>
          </div>
          <div class="info-box info-box-wide">
            <div class="info-label">DJ / Status</div>
            <div id="djText" class="info-value">666SOUNDsDESIGn DJ</div>
          </div>
        </div>
      </section>

      <div class="controls-row controls-row-main">
        <button id="playBtn" class="control-btn control-btn-main" type="button">Play</button>
        <button id="pauseBtn" class="control-btn" type="button">Pause</button>
        <button id="stopBtn" class="control-btn" type="button">Stop</button>
      </div>

      <div class="controls-row controls-row-secondary">
        <button id="reconnectBtn" class="small-btn" type="button">Reconnect</button>
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <button id="streamMainBtn" class="small-btn stream-btn is-active" type="button">MAIN</button>
        <button id="streamBackBtn" class="small-btn stream-btn" type="button">BACK</button>
      </div>

      <div class="bottom-row">
        <div class="volume-panel">
          <label for="volumeRange">Volume</label>
          <input id="volumeRange" type="range" min="0" max="1" step="0.01" value="1" />
          <div id="volumeHint" class="volume-hint hidden">Use iPhone buttons</div>
        </div>
        <div class="mini-meter-panel" aria-hidden="true">
          <div class="mini-meter-track"><div id="miniMeterLeft" class="mini-meter-fill"></div></div>
          <div class="mini-meter-track"><div id="miniMeterRight" class="mini-meter-fill"></div></div>
        </div>
      </div>

      <button id="historyToggle" class="history-btn" type="button">History</button>
      <div id="historyOverlay" class="history-overlay hidden">
        <div class="history-title">Last Tracks</div>
        <ul id="historyList" class="history-list">
          <li>No history loaded</li>
        </ul>
      </div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/js/app.js"></script>
</body>
</html>`;

const CSS = `*{box-sizing:border-box}
:root{
  --bg:#130f1d;--bg2:#0d1117;--panel:#171c26;--line:rgba(0,234,255,.24);
  --cyan:#00eaff;--pink:#ff2bd6;--purple:#b366ff;--text:#eef7ff;--muted:#aab6c7;
  --shadow-cyan:0 0 22px rgba(0,234,255,.18);--shadow-pink:0 0 24px rgba(255,43,214,.16)
}
html,body{
  margin:0;min-height:100%;
  background:
    radial-gradient(circle at top left,rgba(255,43,214,.18),transparent 26%),
    radial-gradient(circle at bottom right,rgba(0,234,255,.16),transparent 28%),
    linear-gradient(180deg,var(--bg),var(--bg2));
  color:var(--text);font-family:Arial,Helvetica,sans-serif
}
body{min-height:100vh}
.app-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}
.player-card,.boot-panel{
  width:min(94vw,620px);
  background:linear-gradient(180deg,rgba(20,24,33,.98),rgba(13,17,23,.98));
  border:1px solid var(--line);border-radius:28px;box-shadow:var(--shadow-cyan),var(--shadow-pink);
  backdrop-filter:blur(10px);position:relative
}
.player-card{padding:18px;display:grid;gap:14px}
.player-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.brand-wrap{display:flex;flex-direction:column;gap:4px}
.brand{font-size:1.45rem;font-weight:900;color:var(--cyan);letter-spacing:.02em}
.player-sub{font-size:.72rem;letter-spacing:.16em;color:var(--pink)}
.status-orbs{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.status-orb,.control-btn,.small-btn,.history-btn,.neon-button{
  appearance:none;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);
  color:var(--text);cursor:pointer;transition:.16s ease
}
.status-orb{
  border-radius:999px;padding:7px 11px;display:inline-flex;align-items:center;gap:7px;font-weight:700
}
.status-orb:hover,.control-btn:hover,.small-btn:hover,.history-btn:hover,.neon-button:hover{transform:translateY(-1px)}
.status-orb-dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid transparent}
.status-orb-dot-cyan{background:var(--cyan);box-shadow:0 0 12px rgba(0,234,255,.48)}
.status-orb-dot-purple{background:var(--purple);box-shadow:0 0 12px rgba(179,102,255,.48)}
.status-orb-dot-pink{background:var(--pink);box-shadow:0 0 12px rgba(255,43,214,.48)}
.status-orb-dot-off{background:transparent;border-color:rgba(255,255,255,.24);box-shadow:0 0 8px rgba(255,255,255,.10)}
.now-playing-card{
  border:1px solid rgba(255,255,255,.10);border-radius:24px;background:rgba(255,255,255,.03);
  padding:14px;display:grid;gap:14px
}
.now-top{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:14px;align-items:center}
.section-label,.info-label,.volume-panel label,.history-title,.boot-subtitle,.boot-note{color:var(--muted)}
.now-title{font-size:1.35rem;font-weight:900;color:var(--text);line-height:1.1}
.now-subtitle{font-size:.92rem;color:var(--pink)}
.visual-shell{
  height:132px;border-radius:18px;border:1px solid rgba(255,255,255,.10);padding:12px;
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01))
}
.visual-grid{height:100%;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end}
.visual-col{
  border-radius:999px 999px 6px 6px;min-height:18%;height:28%;
  background:linear-gradient(180deg,var(--pink) 0%,var(--purple) 48%,var(--cyan) 100%);
  box-shadow:0 0 10px rgba(255,43,214,.18)
}
.info-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.info-box{
  border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.03);padding:10px 12px
}
.info-box-wide{grid-column:span 1}
.info-value{font-weight:800;margin-top:2px}
.controls-row{display:grid;gap:8px}
.controls-row-main{grid-template-columns:repeat(3,minmax(0,1fr))}
.controls-row-secondary{grid-template-columns:repeat(4,minmax(0,1fr))}
.control-btn,.small-btn{border-radius:15px;padding:10px 12px;font-weight:800}
.control-btn-main{border-color:rgba(255,43,214,.45);box-shadow:0 0 12px rgba(255,43,214,.16) inset}
.stream-btn.is-active{box-shadow:0 0 12px rgba(0,234,255,.18) inset}
.bottom-row{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:12px;align-items:end}
.volume-panel{
  border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.03);padding:10px 12px;
  display:flex;flex-direction:column;gap:6px
}
.volume-panel input[type="range"]{width:100%}
.volume-hint{font-size:.72rem;color:var(--muted);line-height:1.2}
.volume-hint.hidden{display:none}
.mini-meter-panel{
  border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.03);padding:8px;
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;height:74px
}
.mini-meter-track{
  border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);padding:4px;display:flex;align-items:flex-end
}
.mini-meter-fill{
  width:100%;height:10%;border-radius:8px;background:linear-gradient(180deg,var(--purple) 0%,var(--cyan) 100%);
  box-shadow:0 0 10px rgba(179,102,255,.35)
}
.history-btn{justify-self:end;border-radius:12px;padding:8px 12px;font-size:.85rem}
.history-overlay{
  position:absolute;left:18px;right:18px;bottom:18px;z-index:12;border-radius:18px;padding:12px;
  background:rgba(11,14,20,.98);border:1px solid rgba(255,43,214,.24);box-shadow:var(--shadow-pink)
}
.history-overlay.hidden{display:none}
.history-list{margin:0;padding-left:18px;max-height:180px;overflow:auto}
.overlay{position:fixed;inset:0;background:rgba(10,12,16,.92);display:flex;align-items:center;justify-content:center;z-index:50}
.overlay.hidden{display:none}
.boot-panel{padding:18px;display:grid;gap:10px;text-align:center}
.boot-title{font-size:1.2rem;font-weight:900;color:var(--cyan)}
.neon-button{border-radius:16px;padding:12px 14px;font-weight:900;border-color:rgba(255,43,214,.44)}
.progress-wrap{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.progress-bar{height:100%;width:0;background:linear-gradient(90deg,var(--pink),var(--cyan))}
.progress-text{font-size:.9rem;color:var(--muted)}
@media (max-width:640px){
  .player-card,.boot-panel{width:min(94vw,560px)}
  .now-top{grid-template-columns:1fr}
  .visual-shell{height:104px}
}
@media (max-width:520px){
  .player-card{padding:14px}
  .brand{font-size:1.18rem}
  .player-sub{font-size:.64rem}
  .info-grid{grid-template-columns:1fr}
  .controls-row-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bottom-row{grid-template-columns:1fr 70px}
}`;

const APP_JS = `import { STREAM_CONFIG } from "../config/stream.config.js";
document.title="666SOUNDsDESIGn Internal W4";
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
const eqBars=Array.from({length:12},(_,i)=>document.getElementById("eqBar"+i));
const audio=document.getElementById("radio");

let booted=false,muted=false,metadataTimer=null,lastTitle="Loading metadata...",historyOpen=false,streamMode="main",usingFallback=false,userVolume=1,intentionalDisconnect=false,audioCtx=null,mediaNode=null,analyser=null,meterBuffer=null,meterRaf=null;

function setLamp(el,state){
  if(!el) return;
  el.className=el.className.split(" ").filter(cls=>!cls.startsWith("status-orb-dot-")).join(" ").trim();
  el.className=(el.className?el.className+" ":"")+state;
}
function updateAudioIndicator(isActive){
  if(audioModeOrb) audioModeOrb.title=isActive?"Audio aktiv":"Audio nicht aktiv";
  if(audioModeLamp) setLamp(audioModeLamp,isActive?"status-orb-dot-purple":"status-orb-dot-pink");
}
function updateMetaIndicator(state){
  if(metaModeOrb) metaModeOrb.title=state==="online"?"Metadaten online":state==="offline"?"Metadaten offline":"Metadaten laden";
  if(metaModeLamp) setLamp(metaModeLamp,state==="online"?"status-orb-dot-cyan":state==="offline"?"status-orb-dot-pink":"status-orb-dot-off");
}
function updateStreamModeUi(){
  const backup=streamMode==="backup";
  if(streamModeText) streamModeText.textContent=backup?"BACK":"MAIN";
  if(streamMainBtn) streamMainBtn.classList.toggle("is-active",!backup);
  if(streamBackBtn) streamBackBtn.classList.toggle("is-active",backup);
  if(streamModeLamp) setLamp(streamModeLamp,backup?"status-orb-dot-purple":"status-orb-dot-cyan");
  if(streamModeOrb) streamModeOrb.title=backup?"Fallback-Stream aktiv":"Hauptstream aktiv";
}
function setSource(isFallback){
  usingFallback=!!isFallback;
  updateStreamModeUi();
}
function rememberUserVolume(){
  const fromSlider=Number(volumeRange?.value);
  const fromAudio=Number(audio?.volume);
  const next=Number.isFinite(fromSlider)?fromSlider:(Number.isFinite(fromAudio)?fromAudio:userVolume);
  userVolume=Math.max(0,Math.min(1,next||1));
}
function applyUserVolume(){
  const safe=Math.max(0,Math.min(1,Number(userVolume||1)));
  userVolume=safe;
  if(volumeRange) volumeRange.value=String(safe);
  if(audio){
    audio.volume=safe;
    audio.muted=muted;
  }
}
function stopMetadataLoop(){
  if(metadataTimer) clearInterval(metadataTimer);
  metadataTimer=null;
}
function stopMiniMeter(){
  if(meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf=null;
  if(miniMeterLeft) miniMeterLeft.style.height="10%";
  if(miniMeterRight) miniMeterRight.style.height="10%";
  eqBars.forEach((bar,idx)=>{ if(bar) bar.style.height=((idx%3)*8+20)+"%"; });
}
async function ensureMeter(){
  if(audioCtx||!audio) return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    audioCtx=new AudioCtx();
    mediaNode=audioCtx.createMediaElementSource(audio);
    analyser=audioCtx.createAnalyser();
    analyser.fftSize=128;
    meterBuffer=new Uint8Array(analyser.frequencyBinCount);
    mediaNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }catch(err){}
}
function startMiniMeter(){
  if(!analyser) return;
  if(meterRaf) cancelAnimationFrame(meterRaf);
  const tick=()=>{
    if(!analyser||audio.paused){
      meterRaf=null;
      return;
    }
    analyser.getByteFrequencyData(meterBuffer);
    const len=meterBuffer.length||1;
    const half=Math.max(1,Math.floor(len/2));
    const quarter=Math.max(1,Math.floor(len/4));
    let left=0,right=0,bass=0;
    for(let i=0;i<len;i++){
      const v=meterBuffer[i]/255;
      if(i<half) left+=v; else right+=v;
      if(i<quarter) bass+=v;
    }
    left=(left/half)*0.70+(bass/quarter)*0.55;
    right=(right/Math.max(1,len-half))*0.70+(bass/quarter)*0.55;
    const lh=Math.max(10,Math.min(100,left*100));
    const rh=Math.max(10,Math.min(100,right*100));
    if(miniMeterLeft) miniMeterLeft.style.height=\`\${lh.toFixed(1)}%\`;
    if(miniMeterRight) miniMeterRight.style.height=\`\${rh.toFixed(1)}%\`;
    eqBars.forEach((bar,idx)=>{
      if(!bar) return;
      const v=(meterBuffer[Math.min(meterBuffer.length-1,idx*4)]||0)/255;
      const h=Math.max(18,Math.min(100,(v*82)+(idx%3)*4));
      bar.style.height=\`\${h.toFixed(1)}%\`;
    });
    meterRaf=requestAnimationFrame(tick);
  };
  meterRaf=requestAnimationFrame(tick);
}
function hardDisconnect(){
  rememberUserVolume();
  intentionalDisconnect=true;
  stopMetadataLoop();
  stopMiniMeter();
  if(audio){
    audio.pause();
    audio.removeAttribute("src");
    audio.src="";
    audio.load();
  }
  applyUserVolume();
  updateAudioIndicator(false);
}
function setMetadataStatus(text){
  if(metaText) metaText.textContent=text;
}
function pickValue(obj,keys,fallback=""){
  for(const key of keys){
    const value=obj?.[key];
    if(value!==undefined&&value!==null&&String(value).trim()!=="") return value;
  }
  return fallback;
}
function normalizeTitle(data){
  return String(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"],lastTitle||"Live Stream"));
}
function normalizeDjStatus(raw){
  const value=String(raw||"").trim();
  const lower=value.toLowerCase();
  if(!value||lower==="autodj"||lower==="auto dj"||lower==="unknown"||lower==="none"||lower==="client"||lower==="no dj"){
    return "666SOUNDsDESIGn DJ";
  }
  return value;
}
function renderHistory(items){
  if(!historyList) return;
  historyList.innerHTML="";
  if(!Array.isArray(items)||!items.length){
    const li=document.createElement("li");
    li.textContent="No history loaded";
    historyList.appendChild(li);
    return;
  }
  items.slice(0,12).forEach((item)=>{
    const li=document.createElement("li");
    li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));
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
    if(bitrateText) bitrateText.textContent=bitrate?\`\${String(bitrate)} kbps\`:"Unknown";
    if(djText) djText.textContent=String(djStatus);
    renderHistory(pickValue(data,["history"],[]));
    setMetadataStatus("Online");
    updateMetaIndicator("online");
  }catch(err){
    if(nowPlaying) nowPlaying.textContent=lastTitle||"Metadata unavailable";
    setMetadataStatus("Offline");
    updateMetaIndicator("offline");
  }
}
function startMetadataLoop(){
  if(metadataTimer) clearInterval(metadataTimer);
  fetchMetadata();
  metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms);
}
async function tryPlayPrimary(){
  audio.src=STREAM_CONFIG.stream_url;
  applyUserVolume();
  await audio.play();
  applyUserVolume();
  setSource(false);
}
async function tryPlayFallback(){
  audio.src=STREAM_CONFIG.fallback_stream_url;
  applyUserVolume();
  await audio.play();
  applyUserVolume();
  setSource(true);
}
async function safePlay(){
  intentionalDisconnect=false;
  rememberUserVolume();
  applyUserVolume();
  try{
    if(streamMode==="backup"){ await tryPlayFallback(); }
    else { await tryPlayPrimary(); }
    updateAudioIndicator(true);
    await ensureMeter();
    if(audioCtx&&audioCtx.state==="suspended"){ try{await audioCtx.resume();}catch(err){} }
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
      if(percent>=100){ clearInterval(timer); resolve(); }
    },42);
  });
}
bootButton?.addEventListener("click",async()=>{
  if(booted) return;
  booted=true;
  bootButton.disabled=true;
  await runBootSequence();
  overlay?.classList.add("hidden");
  await safePlay();
});
playBtn?.addEventListener("click",async()=>{ await safePlay(); });
pauseBtn?.addEventListener("click",()=>{ hardDisconnect(); });
stopBtn?.addEventListener("click",()=>{ hardDisconnect(); });
reconnectBtn?.addEventListener("click",async()=>{ hardDisconnect(); await safePlay(); });
muteBtn?.addEventListener("click",()=>{ muted=!muted; applyUserVolume(); muteBtn.textContent=muted?"Unmute":"Mute"; });
streamMainBtn?.addEventListener("click",async()=>{ streamMode="main"; updateStreamModeUi(); if(audio&&!audio.paused){ hardDisconnect(); await safePlay(); }});
streamBackBtn?.addEventListener("click",async()=>{ streamMode="backup"; updateStreamModeUi(); if(audio&&!audio.paused){ hardDisconnect(); await safePlay(); }});
streamModeOrb?.addEventListener("click",async()=>{ streamMode=streamMode==="backup"?"main":"backup"; updateStreamModeUi(); if(audio&&!audio.paused){ hardDisconnect(); await safePlay(); }});
volumeRange?.addEventListener("input",()=>{ userVolume=Number(volumeRange.value); applyUserVolume(); });
historyToggle?.addEventListener("click",()=>{ historyOpen=!historyOpen; historyOverlay?.classList.toggle("hidden",!historyOpen); });
audio?.addEventListener("playing",async()=>{ intentionalDisconnect=false; applyUserVolume(); updateAudioIndicator(true); await ensureMeter(); if(audioCtx&&audioCtx.state==="suspended"){ try{await audioCtx.resume();}catch(err){} } startMiniMeter(); });
audio?.addEventListener("error",()=>{ if(intentionalDisconnect){ intentionalDisconnect=false; return; } updateAudioIndicator(false); stopMiniMeter(); });
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(isiOS&&volumeHint) volumeHint.classList.remove("hidden");
if(playerModeText) playerModeText.textContent="INT";
if(playerModeOrb) playerModeOrb.title="Interner Fallback-Player";
updateMetaIndicator("loading");
updateAudioIndicator(false);
updateStreamModeUi();
setSource(false);
setMetadataStatus("Loading...");
applyUserVolume();
fetchMetadata();
stopMiniMeter();`;if(bitrateText)bitrateText.textContent=bitrate?\`\${String(bitrate)} kbps\`:"Unknown";if(djText)djText.textContent=String(djStatus);renderHistory(pickValue(data,["history"],[]));setMetadataStatus("Online");setLamp(metaLamp,"lamp-green")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red")}}
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
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);document.body?.setAttribute("data-live-marker","W3.2");if(isiOS&&volumeHint)volumeHint.textContent="Use iPhone buttons";if(playerModeText)playerModeText.textContent="INT";setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-pink");setLamp(sourceLamp,"lamp-cyan");updateStreamModeUi();setSource(false);setMetadataStatus("Loading...");applyUserVolume();fetchMetadata();`;

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
