// ==========================================
// DATEI: AKTIVER_WORKER_MIRROR
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-20
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
const EXTERNAL_PLAYER_URL = "https://raw.githubusercontent.com/xfraggelpower666x/WebRadio-666SOUNDsDESIGn/WebRadio-666SOUNDsDESIGn/";
const SWITCH_TIMEOUT_MS = 2000;
const EXTERNAL_PLAYER_PREFIX = "/extern";

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
        <div class="brand">666SOUNDsDESIGn DJ</div>
        <div class="topbar-line"></div>
      </header>

      <div class="status-grid">
        <div class="lamp-box"><span id="metaLamp" class="lamp lamp-red"></span><span class="lamp-label">Meta</span></div>
        <div class="lamp-box"><span id="audioLamp" class="lamp lamp-red"></span><span class="lamp-label">Audio</span></div>
        <div class="lamp-box lamp-box-source">
          <span id="sourceLamp" class="lamp lamp-cyan"></span>
          <span class="lamp-label">Source</span>
          <span id="playerTypeLabel" class="lamp-side-label">INTERNAL</span>
        </div>
      </div>

      <div class="pill-row">
        <span id="streamStatus" class="pill">Ready</span>
        <span id="sourceLabel" class="pill pill-dim">MAIN</span>
        <span id="fallbackText" class="pill pill-dim">Standby</span>
      </div>

      <div class="display-block">
        <div class="display-head">
          <div class="display-label">Now Playing</div>
          <button id="historyToggle" class="tiny-btn" type="button">History</button>
        </div>
        <div id="metaText" class="display-label" style="margin-bottom:6px;">Loading...</div>
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

      <div class="mini-grid mini-grid-3">
        <div class="mini-box"><div class="mini-label">Listeners</div><div id="listenersText" class="mini-value">0 / 250</div></div>
        <div class="mini-box"><div class="mini-label">Bitrate</div><div id="bitrateText" class="mini-value">Unknown</div></div>
        <div class="mini-box"><div class="mini-label">DJ / Status</div><div id="djText" class="mini-value">666SOUNDsDESIGn DJ</div></div>
      </div>

      <div class="control-strip control-strip-3">
        <button id="playBtn" class="control-btn main" type="button">Play</button>
        <button id="pauseBtn" class="control-btn" type="button">Pause</button>
        <button id="stopBtn" class="control-btn" type="button">Stop</button>
      </div>

      <div class="audio-tools audio-tools-4">
        <button id="reconnectBtn" class="small-btn" type="button">Reconnect</button>
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <button id="primaryBtn" class="small-btn source-btn is-active" type="button">MAIN</button>
        <button id="backupBtn" class="small-btn source-btn" type="button">BACK</button>
      </div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/js/app.js"></script>
</body>
</html>`;

const CSS = `*{box-sizing:border-box}:root{--bg:#1d2128;--bg2:#12151b;--cyan:#20f2ff;--pink:#ff4db3;--green:#47ff8a;--red:#ff5570;--text:#eef7ff;--muted:#afbfcc;--border:rgba(32,242,255,.28);--shadow-cyan:0 0 18px rgba(32,242,255,.18);--shadow-pink:0 0 18px rgba(255,77,179,.14)}html,body{margin:0;min-height:100%;background:radial-gradient(circle at top left,rgba(255,77,179,.10),transparent 28%),radial-gradient(circle at bottom right,rgba(32,242,255,.11),transparent 30%),linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font-family:Arial,Helvetica,sans-serif}body{min-height:100vh}.app-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}.player-card,.boot-panel{width:min(94vw,560px);background:linear-gradient(180deg,rgba(21,25,32,.98),rgba(18,21,27,.98));border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow-cyan),var(--shadow-pink);backdrop-filter:blur(10px)}.player-card{padding:16px}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:14px}.topbar-line{height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);box-shadow:0 0 12px rgba(32,242,255,.25)}.brand,.boot-title{text-align:center;font-weight:700;letter-spacing:.05em;color:var(--cyan);text-shadow:0 0 12px rgba(32,242,255,.34)}.brand{font-size:1.55rem}.boot-title{font-size:1.5rem;margin-bottom:8px}.status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.lamp-box,.pill,.mini-box,.display-window,.control-btn,.small-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px}.lamp-box{display:flex;align-items:center;gap:8px;padding:10px 12px;min-height:50px}.lamp-box-source{justify-content:flex-start}.lamp-side-label{margin-left:auto;font-size:.82rem;font-weight:700;letter-spacing:.05em;color:var(--pink);text-shadow:0 0 10px rgba(255,77,179,.28)}.lamp{width:12px;height:12px;border-radius:999px;display:inline-block;border:1px solid rgba(255,255,255,.20);box-shadow:0 0 10px currentColor}.lamp-purple{color:#b14dff;background:#b14dff}.lamp-red{color:var(--pink);background:var(--pink)}.lamp-cyan{color:var(--cyan);background:var(--cyan)}.lamp-label,.display-label,.boot-subtitle,.boot-note,.mini-label{color:var(--muted)}.pill-row{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}.pill{padding:8px 12px;font-size:.92rem}.pill-dim{color:var(--muted)}.display-block{position:relative;margin-bottom:12px}.display-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.display-window{height:54px;overflow:hidden;display:flex;align-items:center;border-color:rgba(32,242,255,.22)}.marquee-track{white-space:nowrap;display:inline-block;padding-left:100%;font-size:1.08rem;font-weight:700;color:var(--pink);text-shadow:0 0 10px rgba(255,77,179,.3);animation:marquee 12s linear infinite}@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}.tiny-btn{appearance:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text);padding:6px 10px;font-size:.85rem;cursor:pointer}.history-overlay{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:10;border-radius:16px;padding:12px;background:rgba(13,16,22,.98);border:1px solid rgba(255,77,179,.25);box-shadow:var(--shadow-pink)}.history-overlay.hidden{display:none}.history-title{color:var(--cyan);font-weight:700;margin-bottom:8px}.history-list{margin:0;padding-left:18px;max-height:200px;overflow:auto}.mini-grid{display:grid;gap:10px;margin-bottom:12px}.mini-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.mini-box{padding:10px 12px}.mini-value{font-weight:700;margin-top:4px}.control-strip,.audio-tools{display:grid;gap:10px;align-items:stretch}.control-strip-3{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:10px}.audio-tools-4{grid-template-columns:repeat(4,minmax(0,1fr))}.control-btn,.small-btn{padding:12px 12px;color:var(--text);font-weight:700;cursor:pointer;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));box-shadow:var(--shadow-cyan)}.control-btn.main{border-color:rgba(255,77,179,.35);box-shadow:var(--shadow-pink)}.small-btn{border-color:rgba(255,77,179,.28);box-shadow:var(--shadow-pink)}.source-btn.is-active{border-color:rgba(32,242,255,.45);box-shadow:0 0 14px rgba(32,242,255,.28)}.overlay{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(7,10,14,.86)}.overlay.hidden{display:none}.boot-panel{padding:22px;text-align:center}.neon-button{appearance:none;border:1px solid rgba(32,242,255,.45);border-radius:16px;padding:14px 18px;background:linear-gradient(180deg,rgba(32,242,255,.16),rgba(255,77,179,.08));color:var(--text);font-size:1rem;font-weight:700;cursor:pointer;box-shadow:var(--shadow-cyan)}.progress-wrap{width:100%;height:12px;margin-top:18px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.progress-bar{width:0%;height:100%;background:linear-gradient(90deg,var(--pink),var(--cyan));transition:width .12s linear}.progress-text{margin-top:10px;font-weight:700}@media (max-width:560px){.mini-grid-3{grid-template-columns:1fr}.audio-tools-4{grid-template-columns:repeat(2,minmax(0,1fr))}}`;

const APP_JS = `import { STREAM_CONFIG } from "../config/stream.config.js";
const overlay=document.getElementById("bootOverlay");
const bootButton=document.getElementById("bootButton");
const progressBar=document.getElementById("progressBar");
const progressText=document.getElementById("progressText");
const playBtn=document.getElementById("playBtn");
const pauseBtn=document.getElementById("pauseBtn");
const reconnectBtn=document.getElementById("reconnectBtn");
const stopBtn=document.getElementById("stopBtn");
const muteBtn=document.getElementById("muteBtn");
const primaryBtn=document.getElementById("primaryBtn");
const backupBtn=document.getElementById("backupBtn");
const historyToggle=document.getElementById("historyToggle");
const metaLamp=document.getElementById("metaLamp");
const audioLamp=document.getElementById("audioLamp");
const sourceLamp=document.getElementById("sourceLamp");
const streamStatus=document.getElementById("streamStatus");
const sourceLabel=document.getElementById("sourceLabel");
const fallbackText=document.getElementById("fallbackText");
const nowPlaying=document.getElementById("nowPlaying");
const metaText=document.getElementById("metaText");
const listenersText=document.getElementById("listenersText");
const bitrateText=document.getElementById("bitrateText");
const djText=document.getElementById("djText");
const historyOverlay=document.getElementById("historyOverlay");
const historyList=document.getElementById("historyList");
const audio=document.getElementById("radio");

let booted=false,usingFallback=false,muted=false,metadataTimer=null,lastTitle="Loading metadata...",historyOpen=false,manualSource="main",userStopped=false,switchingSource=false;

function setLamp(el,state){if(!el)return;el.classList.remove("lamp-purple","lamp-red","lamp-cyan");el.classList.add(state)}
function setStatus(text){if(streamStatus)streamStatus.textContent=text}
function updateSourceButtons(){if(primaryBtn)primaryBtn.classList.toggle("is-active",manualSource==="main");if(backupBtn)backupBtn.classList.toggle("is-active",manualSource==="backup")}
function setSource(isFallback){usingFallback=isFallback;if(sourceLabel)sourceLabel.textContent=isFallback?"BACK":"MAIN";if(fallbackText)fallbackText.textContent=isFallback?"Manual":"Manual";setLamp(sourceLamp,isFallback?"lamp-purple":"lamp-cyan");updateSourceButtons()}
function setMetadataStatus(text){if(metaText)metaText.textContent=text}
function pickValue(obj,keys,fallback=""){for(const key of keys){const value=obj?.[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value}return fallback}
function normalizeTitle(data){return String(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"],lastTitle||"Live Stream"))}
function renderHistory(items){if(!historyList)return;historyList.innerHTML="";if(!Array.isArray(items)||!items.length){const li=document.createElement("li");li.textContent="No history loaded";historyList.appendChild(li);return}items.slice(0,12).forEach((item)=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));historyList.appendChild(li)})}
async function fetchMetadata(){try{const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});if(!res.ok)throw new Error("metadata fetch failed");const data=await res.json();const title=normalizeTitle(data);lastTitle=title;if(nowPlaying)nowPlaying.textContent=title;const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);const bitrate=pickValue(data,["bitrate"],"Unknown");const djStatus=pickValue(data,["djusername","djstatus","client"],"666SOUNDsDESIGn DJ");if(listenersText)listenersText.textContent=String(Number.isFinite(listeners)?listeners:0)+" / "+String(STREAM_CONFIG.listener_capacity);if(bitrateText)bitrateText.textContent=bitrate?(String(bitrate)+" kbps"):"Unknown";if(djText)djText.textContent=String(djStatus||"666SOUNDsDESIGn DJ");renderHistory(pickValue(data,["history"],[]));setMetadataStatus("Online");setLamp(metaLamp,"lamp-cyan")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red")}}
function startMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);fetchMetadata();metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms)}
function stopMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);metadataTimer=null}
function hardDisconnect(stateText="Stopped"){stopMetadataLoop();if(audio){audio.pause();audio.removeAttribute("src");audio.src="";audio.load()}setStatus(stateText);setLamp(audioLamp,"lamp-red")}
function resetAudioForNewSource(){if(audio){audio.pause();audio.removeAttribute("src");audio.src="";audio.load()}}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function tryPlayPrimary(){resetAudioForNewSource();audio.src=STREAM_CONFIG.stream_url;await delay(120);await audio.play();setSource(false)}
async function tryPlayFallback(){resetAudioForNewSource();audio.src=STREAM_CONFIG.fallback_stream_url;await delay(120);await audio.play();setSource(true)}
async function safePlay(){userStopped=false;try{if(manualSource==="backup"){await tryPlayFallback()}else{await tryPlayPrimary()}setStatus("Playing");setLamp(audioLamp,"lamp-purple");startMetadataLoop();return true}catch(e){setStatus("Audio Error");setLamp(audioLamp,"lamp-red");return false}}
async function switchSource(nextSource){if(switchingSource||manualSource===nextSource)return;switchingSource=true;userStopped=false;manualSource=nextSource;updateSourceButtons();setStatus(nextSource==="backup"?"Switching to BACK":"Switching to MAIN");try{if(nextSource==="backup"){await tryPlayFallback()}else{await tryPlayPrimary()}setStatus("Playing");setLamp(audioLamp,"lamp-purple");startMetadataLoop()}catch(err){setStatus("Audio Error");setLamp(audioLamp,"lamp-red")}finally{switchingSource=false}}
function runBootSequence(){return new Promise((resolve)=>{let percent=0;const timer=setInterval(()=>{percent+=4;if(percent>100)percent=100;if(progressBar)progressBar.style.width=String(percent)+"%";if(progressText)progressText.textContent=String(percent)+"%";if(percent>=100){clearInterval(timer);resolve()}},42)})}
bootButton?.addEventListener("click",async()=>{if(booted)return;booted=true;bootButton.disabled=true;await runBootSequence();overlay?.classList.add("hidden");await safePlay()});
playBtn?.addEventListener("click",async()=>{await safePlay()});
pauseBtn?.addEventListener("click",()=>{audio.pause();stopMetadataLoop();setStatus("Paused");setLamp(audioLamp,"lamp-red")});
stopBtn?.addEventListener("click",()=>{userStopped=true;switchingSource=false;hardDisconnect("Stopped")});
reconnectBtn?.addEventListener("click",async()=>{userStopped=false;hardDisconnect("Reconnecting");await safePlay()});
muteBtn?.addEventListener("click",()=>{muted=!muted;if(audio)audio.muted=muted;muteBtn.textContent=muted?"Unmute":"Mute"});
primaryBtn?.addEventListener("click",async()=>{await switchSource("main")});
backupBtn?.addEventListener("click",async()=>{await switchSource("backup")});
historyToggle?.addEventListener("click",()=>{historyOpen=!historyOpen;historyOverlay?.classList.toggle("hidden",!historyOpen)});
audio?.addEventListener("playing",()=>{if(userStopped||switchingSource)return;setStatus("Playing");setLamp(audioLamp,"lamp-purple")});
audio?.addEventListener("error",async()=>{if(userStopped||switchingSource)return;setStatus("Audio Error");setLamp(audioLamp,"lamp-red")});
setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-red");setLamp(sourceLamp,"lamp-purple");updateSourceButtons();setSource(false);setMetadataStatus("Loading...");fetchMetadata();`;

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


function buildExternalProxyHeaders(sourceHeaders, pathname = ""){
  // Relevante Header des externen Players sauber an den Browser weiterreichen.
  const headers = new Headers(sourceHeaders);
  headers.set("cache-control", "no-store");
  headers.delete("content-security-policy");
  headers.delete("x-frame-options");
  headers.delete("content-length");
  headers.set("x-player-mode", "external-proxy");

  // Content-Type für Raw-GitHub-Antworten auf sinnvolle Werte setzen.
  if (pathname.endsWith(".html") || pathname === "/" || pathname === "/extern") {
    headers.set("content-type", "text/html; charset=UTF-8");
  } else if (pathname.endsWith(".css")) {
    headers.set("content-type", "text/css; charset=UTF-8");
  } else if (pathname.endsWith(".js")) {
    headers.set("content-type", "application/javascript; charset=UTF-8");
  }

  return headers;
}

function getExternalUpstreamPath(pathname){
  if (pathname === "/" || pathname === "/index.html" || pathname === "/extern") return "index.html";
  if (pathname.startsWith("/extern/")) return pathname.replace(/^\/extern\//, "");
  if (pathname === "/css/extern.css") return "css/extern.css";
  if (pathname === "/js/extern.js") return "js/extern.js";
  if (pathname.startsWith("/assets/")) return pathname.replace(/^\//, "");
  return null;
}

async function fetchExternalAsset(pathname, request){
  // Externe Player-Dateien unter derselben Domain ausliefern, damit github/raw nicht sichtbar wird.
  const upstreamPath = getExternalUpstreamPath(pathname);
  if(!upstreamPath){
    return null;
  }

  const upstreamUrl = new URL(upstreamPath, EXTERNAL_PLAYER_URL).toString();
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
    headers: buildExternalProxyHeaders(response.headers, pathname)
  });
}

async function serveExternalIndex(request, pathname = "/"){
  const response = await fetchExternalAsset(pathname, request);
  if(response) return response;
  return null;
}

export default {
  async fetch(request){
    const url=new URL(request.url);

    // Standardmodus: externer Player zuerst. Nur bei Fehler auf internen Worker-Player wechseln.
    if((url.pathname==="/" || url.pathname==="/index.html") && url.searchParams.get("player")!=="internal"){
      const externalOk = await checkExternal();
      if(externalOk){
        const externalResponse = await serveExternalIndex(request, "/");
        if(externalResponse) return externalResponse;
      }
    }

    // Externer Player direkt unter /extern und seine Root-Dateien über dieselbe Domain ausliefern.
    if(url.pathname==="/extern" || url.pathname==="/extern/"){
      const externalResponse = await serveExternalIndex(request, "/extern");
      if(externalResponse) return externalResponse;
    }
    if(url.pathname==="/css/extern.css" || url.pathname==="/js/extern.js" || url.pathname.startsWith("/assets/")){
      const externalAsset = await fetchExternalAsset(url.pathname, request);
      if(externalAsset) return externalAsset;
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
