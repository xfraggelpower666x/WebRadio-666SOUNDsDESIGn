// SAME-URL ASSET FIX
// Reason:
// Some public routes appear to deliver "/" but not the extra file paths reliably.
// This build keeps the player separated in repo files, but serves CSS/JS/CONFIG
// through the SAME URL using query markers:
// /?asset=css
// /?asset=js
// /?asset=config

const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>666SOUNDsDESIGn Radio</title>
  <link rel="stylesheet" href="/?asset=css" />
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
        <div class="lamp-box"><span id="metaLamp" class="lamp lamp-red"></span><span class="lamp-label">Meta</span></div>
        <div class="lamp-box"><span id="audioLamp" class="lamp lamp-red"></span><span class="lamp-label">Audio</span></div>
        <div class="lamp-box"><span id="sourceLamp" class="lamp lamp-cyan"></span><span class="lamp-label">Source</span></div>
      </div>

      <div class="pill-row">
        <span id="streamStatus" class="pill">Ready</span>
        <span id="sourceLabel" class="pill pill-dim">Primary</span>
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

      <div class="mini-grid">
        <div class="mini-box"><div class="mini-label">Listeners</div><div id="listenersText" class="mini-value">0 / 250</div></div>
        <div class="mini-box"><div class="mini-label">Bitrate</div><div id="bitrateText" class="mini-value">Unknown</div></div>
        <div class="mini-box"><div class="mini-label">DJ / Status</div><div id="djText" class="mini-value">Unknown</div></div>
        <div class="mini-box"><div class="mini-label">Volume</div><div id="volumeHint" class="mini-value">Use iPhone buttons</div></div>
      </div>

      <div class="control-strip">
        <button id="playBtn" class="control-btn main" type="button">Play</button>
        <button id="pauseBtn" class="control-btn" type="button">Pause</button>
        <button id="reconnectBtn" class="control-btn" type="button">Reconnect</button>
      </div>

      <div class="audio-tools">
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <div class="volume-wrap">
          <label for="volumeRange">Volume</label>
          <input id="volumeRange" type="range" min="0" max="1" step="0.01" value="1" />
        </div>
      </div>

      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>

  <script type="module" src="/?asset=js"></script>
</body>
</html>`;
const CSS = `*{box-sizing:border-box}:root{--bg:#1d2128;--bg2:#12151b;--cyan:#20f2ff;--pink:#ff4db3;--green:#47ff8a;--red:#ff5570;--text:#eef7ff;--muted:#afbfcc;--border:rgba(32,242,255,.28);--shadow-cyan:0 0 18px rgba(32,242,255,.18);--shadow-pink:0 0 18px rgba(255,77,179,.14)}html,body{margin:0;min-height:100%;background:radial-gradient(circle at top left,rgba(255,77,179,.10),transparent 28%),radial-gradient(circle at bottom right,rgba(32,242,255,.11),transparent 30%),linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font-family:Arial,Helvetica,sans-serif}body{min-height:100vh}.app-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}.player-card,.boot-panel{width:min(94vw,560px);background:linear-gradient(180deg,rgba(21,25,32,.98),rgba(18,21,27,.98));border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow-cyan),var(--shadow-pink);backdrop-filter:blur(10px)}.player-card{padding:16px}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:14px}.topbar-line{height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);box-shadow:0 0 12px rgba(32,242,255,.25)}.brand,.boot-title{text-align:center;font-weight:700;letter-spacing:.05em;color:var(--cyan);text-shadow:0 0 12px rgba(32,242,255,.34)}.brand{font-size:1.55rem}.boot-title{font-size:1.5rem;margin-bottom:8px}.status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.lamp-box,.pill,.mini-box,.display-window,.control-btn,.small-btn,.volume-wrap{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px}.lamp-box{display:flex;align-items:center;gap:8px;padding:10px 12px;min-height:50px}.lamp{width:12px;height:12px;border-radius:50%;display:inline-block;box-shadow:0 0 10px currentColor}.lamp-green{color:var(--green);background:var(--green)}.lamp-red{color:var(--red);background:var(--red)}.lamp-cyan{color:var(--cyan);background:var(--cyan)}.lamp-label,.display-label,.boot-subtitle,.boot-note,.mini-label,.volume-wrap label{color:var(--muted)}.pill-row{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}.pill{padding:8px 12px;font-size:.92rem}.pill-dim{color:var(--muted)}.display-block{position:relative;margin-bottom:12px}.display-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.display-window{height:54px;overflow:hidden;display:flex;align-items:center;border-color:rgba(32,242,255,.22)}.marquee-track{white-space:nowrap;display:inline-block;padding-left:100%;font-size:1.08rem;font-weight:700;color:var(--pink);text-shadow:0 0 10px rgba(255,77,179,.3);animation:marquee 12s linear infinite}@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}.tiny-btn{appearance:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text);padding:6px 10px;font-size:.85rem;cursor:pointer}.history-overlay{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:10;border-radius:16px;padding:12px;background:rgba(13,16,22,.98);border:1px solid rgba(255,77,179,.25);box-shadow:var(--shadow-pink)}.history-overlay.hidden{display:none}.history-title{color:var(--cyan);font-weight:700;margin-bottom:8px}.history-list{margin:0;padding-left:18px;max-height:200px;overflow:auto}.history-list li{margin-bottom:6px}.mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}.mini-box{padding:10px 12px;min-height:68px}.mini-value{margin-top:6px;font-weight:700}.control-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.control-btn,.small-btn{appearance:none;border:1px solid rgba(32,242,255,.35);color:var(--text);padding:14px 12px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:var(--shadow-cyan);background:linear-gradient(180deg,rgba(32,242,255,.14),rgba(255,77,179,.06))}.control-btn.main{border-color:rgba(255,77,179,.35);box-shadow:var(--shadow-pink)}.audio-tools{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:stretch}.small-btn{border-color:rgba(255,77,179,.28);box-shadow:var(--shadow-pink)}.volume-wrap{padding:10px 12px;display:grid;gap:8px}input[type=range]{width:100%}.overlay{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(7,10,14,.86)}.overlay.hidden{display:none}.boot-panel{padding:22px;text-align:center}.neon-button{appearance:none;border:1px solid rgba(32,242,255,.45);border-radius:16px;padding:14px 18px;background:linear-gradient(180deg,rgba(32,242,255,.16),rgba(255,77,179,.08));color:var(--text);font-size:1rem;font-weight:700;cursor:pointer;box-shadow:var(--shadow-cyan)}.progress-wrap{width:100%;height:12px;margin-top:18px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.progress-bar{width:0%;height:100%;background:linear-gradient(90deg,var(--pink),var(--cyan));transition:width .12s linear}.progress-text{margin-top:10px;font-weight:700}`;
const APP_JS = `import { STREAM_CONFIG } from "/?asset=config";
const overlay=document.getElementById("bootOverlay");
const bootButton=document.getElementById("bootButton");
const progressBar=document.getElementById("progressBar");
const progressText=document.getElementById("progressText");
const playBtn=document.getElementById("playBtn");
const pauseBtn=document.getElementById("pauseBtn");
const reconnectBtn=document.getElementById("reconnectBtn");
const muteBtn=document.getElementById("muteBtn");
const volumeRange=document.getElementById("volumeRange");
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
const volumeHint=document.getElementById("volumeHint");
const audio=document.getElementById("radio");
let booted=false,usingFallback=false,muted=false,metadataTimer=null,lastTitle="Loading metadata...",historyOpen=false;
function setLamp(el,state){if(!el)return;el.classList.remove("lamp-green","lamp-red","lamp-cyan");el.classList.add(state)}
function setStatus(text){if(streamStatus)streamStatus.textContent=text}
function setSource(isFallback){usingFallback=isFallback;if(sourceLabel)sourceLabel.textContent=isFallback?"Fallback":"Primary";if(fallbackText)fallbackText.textContent=isFallback?"Active":"Standby";setLamp(sourceLamp,isFallback?"lamp-red":"lamp-cyan")}
function setMetadataStatus(text){if(metaText)metaText.textContent=text}
function pickValue(obj,keys,fallback=""){for(const key of keys){const value=obj?.[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value}return fallback}
function normalizeTitle(data){return String(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"],lastTitle||"Live Stream"))}
function renderHistory(items){if(!historyList)return;historyList.innerHTML="";if(!Array.isArray(items)||!items.length){const li=document.createElement("li");li.textContent="No history loaded";historyList.appendChild(li);return}items.slice(0,12).forEach((item)=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));historyList.appendChild(li)})}
async function fetchMetadata(){try{const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});if(!res.ok)throw new Error("metadata fetch failed");const data=await res.json();const title=normalizeTitle(data);lastTitle=title;if(nowPlaying)nowPlaying.textContent=title;const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);const bitrate=pickValue(data,["bitrate"],"Unknown");const djStatus=pickValue(data,["djusername","djstatus","client"],"AutoDJ");if(listenersText)listenersText.textContent=\\\`\\\${Number.isFinite(listeners)?listeners:0} / \\\${STREAM_CONFIG.listener_capacity}\\\`;if(bitrateText)bitrateText.textContent=bitrate?\\\`\\\${String(bitrate)} kbps\\\`:"Unknown";if(djText)djText.textContent=String(djStatus);renderHistory(pickValue(data,["history"],[]));setMetadataStatus("Online");setLamp(metaLamp,"lamp-green")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red")}}
function startMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);fetchMetadata();metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms)}
async function tryPlayPrimary(){audio.src=STREAM_CONFIG.stream_url;await audio.play();setSource(false)}
async function tryPlayFallback(){audio.src=STREAM_CONFIG.fallback_stream_url;await audio.play();setSource(true)}
async function safePlay(){try{await tryPlayPrimary();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e1){try{await tryPlayFallback();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e2){setStatus("Audio Error");setLamp(audioLamp,"lamp-red");return false}}}
function runBootSequence(){return new Promise((resolve)=>{let percent=0;const timer=setInterval(()=>{percent+=4;if(percent>100)percent=100;if(progressBar)progressBar.style.width=\\\`\\\${percent}%\\\`;if(progressText)progressText.textContent=\\\`\\\${percent}%\\\`;if(percent>=100){clearInterval(timer);resolve()}},42)})}
bootButton?.addEventListener("click",async()=>{if(booted)return;booted=true;bootButton.disabled=true;await runBootSequence();overlay?.classList.add("hidden");await safePlay()});
playBtn?.addEventListener("click",async()=>{await safePlay()});
pauseBtn?.addEventListener("click",()=>{audio.pause();setStatus("Paused");setLamp(audioLamp,"lamp-red")});
reconnectBtn?.addEventListener("click",async()=>{audio.pause();audio.src="";await safePlay()});
muteBtn?.addEventListener("click",()=>{muted=!muted;audio.muted=muted;muteBtn.textContent=muted?"Unmute":"Mute"});
volumeRange?.addEventListener("input",()=>{audio.volume=Number(volumeRange.value)});
historyToggle?.addEventListener("click",()=>{historyOpen=!historyOpen;historyOverlay?.classList.toggle("hidden",!historyOpen)});
audio?.addEventListener("playing",()=>{setStatus("Playing");setLamp(audioLamp,"lamp-green")});
audio?.addEventListener("error",async()=>{if(!usingFallback){try{await tryPlayFallback();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return}catch(e){}}setStatus("Audio Error");setLamp(audioLamp,"lamp-red")});
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);if(isiOS&&volumeHint)volumeHint.textContent="Use iPhone buttons";setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-red");setLamp(sourceLamp,"lamp-cyan");setSource(false);setMetadataStatus("Loading...");fetchMetadata();`;
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


export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = url.searchParams.get("asset");

    if (url.pathname === "/" && asset === "css") {
      return new Response(CSS, {
        status: 200,
        headers: {
          "content-type": "text/css; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/" && asset === "js") {
      return new Response(APP_JS, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/" && asset === "config") {
      return new Response(CONFIG_JS, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/health") {
      return new Response("OK", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/api/nowplaying") {
      try {
        const upstream = await fetch(METADATA_URL, { headers: { "cache-control": "no-store" } });
        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
            "x-radio-proxy": "666soundsdesign-worker"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "metadata_proxy_failed" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      }
    }

    if (url.pathname === "/stream") {
      try {
        return await proxyStream(request, PRIMARY_STREAM_URL);
      } catch (err) {
        return await proxyStream(request, FALLBACK_STREAM_URL);
      }
    }

    if (url.pathname === "/fallback-stream") {
      return await proxyStream(request, FALLBACK_STREAM_URL);
    }

    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      }
    });
  }
};
