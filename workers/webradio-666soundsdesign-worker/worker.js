import { handleDiscordNotifyV3 } from './worker-addons/discord-notify-addon-v3.js';
import { handleRadioAdminConfigAddon } from './worker-addons/radio-admin-config-addon.js';
import { handleSkipApi } from './worker-addons/skip-api-addon.js';
// ==========================================================
// 666SOUNDsDESIGn — v66 The Dark Dancer Route
// Zweck: /The-Dark-Dancer direkt über die Domain ausliefern.
// ==========================================================
async function darkDancerResponse(request, env) {
  const url = new URL(request.url);
  const path = String(url.pathname || '').replace(/\/+$/, '') || '/';
  let assetPath = '';
  if (path === '/The-Dark-Dancer' || path === '/The-Dark-Dancer.html' || path === '/the-dark-dancer' || path === '/666SOUNDsDESIGn/The-Dark-Dancer.html') {
    assetPath = '/666SOUNDsDESIGn/The-Dark-Dancer.html';
  } else if (path === '/666SOUNDsDESIGn/the-dark-dancer-header-source.jpeg' || path === '/the-dark-dancer-header-source.jpeg') {
    assetPath = '/666SOUNDsDESIGn/the-dark-dancer-header-source.jpeg';
  } else {
    return null;
  }
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') return null;
  const target = new URL(request.url);
  target.pathname = assetPath;
  target.search = '';
  const response = await env.ASSETS.fetch(new Request(target.toString(), { method: 'GET', headers: request.headers }));
  if (!response || !response.ok) return null;
  const headers = new Headers(response.headers);
  headers.set('cache-control', assetPath.endsWith('.html') ? 'public, max-age=300' : 'public, max-age=86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
// ==========================================================

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
// ÄNDERUNG: ROOT_MIGRATION_REPAIR_v1. External-Player ist Hauptplayer in Root; /extern und /external-player bleiben Alias.
// ÄNDERUNG: STREAM_FAILOVER_REPAIR_v1. /stream schaltet bei HTTP-Fehler/Timeout auf Backup-Varianten um.
// HINWEIS: Nicht eigenmächtig kürzen. Root-Worker und Worker-Unterordner müssen identisch sein.
// ==========================================

const PRIMARY_STREAM_URLS = [
  "https://my.idjstream.com/666soundsdesign/stream",
  "https://my.idjstream.com/666soundsdesign",
  "http://my.idjstream.com/666soundsdesign/stream",
  "http://my.idjstream.com/666soundsdesign"
];
const FALLBACK_STREAM_URLS = [
  "https://my.idjstream.com:8686/stream",
  "https://my.idjstream.com:8686",
  "http://my.idjstream.com:8686/stream",
  "http://my.idjstream.com:8686"
];
const FALLBACK_STREAM_URLS_ALT = [
  "https://my.idjstream.com/8686/stream",
  "http://my.idjstream.com/8686/stream"
];
const METADATA_URLS = [
  "https://my.idjstream.com/cp/get_info.php?p=8686",
  "http://my.idjstream.com/cp/get_info.php?p=8686",
  "https://idjstream.app/cp/get_info.php?p=8686"
];
const STATIC_ROOT_INDEX_PATH = "/index.html";
const RADIO_RUNTIME_KV_KEY = "radio-runtime:current";
const RADIO_RUNTIME_CACHE_MS = 15000;
let radioRuntimeCache = { expiresAt: 0, value: null, source: "none" };

const DEFAULT_RADIO_RUNTIME_CONFIG = Object.freeze({
  schema: "radio-runtime-config-v2",
  version: 2,
  primaryStream: PRIMARY_STREAM_URLS[0],
  backupStream: FALLBACK_STREAM_URLS[0],
  emergencyStream: FALLBACK_STREAM_URLS_ALT[0],
  primaryStreams: PRIMARY_STREAM_URLS,
  backupStreams: FALLBACK_STREAM_URLS,
  emergencyStreams: FALLBACK_STREAM_URLS_ALT,
  metadataUpstreams: METADATA_URLS
});

function normalizedHttpUrls(value, fallback = []) {
  const candidates = Array.isArray(value) ? value : (value ? [value] : []);
  const unique = [];
  for (const entry of candidates) {
    try {
      const url = new URL(String(entry).trim());
      if (!/^https?:$/.test(url.protocol)) continue;
      const normalized = url.toString();
      if (!unique.includes(normalized)) unique.push(normalized);
    } catch {}
  }
  return unique.length ? unique : [...fallback];
}

function normalizeRadioRuntimeConfig(raw = {}) {
  const primary = normalizedHttpUrls(raw.primaryStreams || raw.primaryStream, PRIMARY_STREAM_URLS);
  const backup = normalizedHttpUrls(raw.backupStreams || raw.backupStream, FALLBACK_STREAM_URLS);
  const emergency = normalizedHttpUrls(raw.emergencyStreams || raw.emergencyStream, FALLBACK_STREAM_URLS_ALT);
  const metadata = normalizedHttpUrls(raw.metadataUpstreams, METADATA_URLS);
  return {
    ...DEFAULT_RADIO_RUNTIME_CONFIG,
    ...raw,
    primaryStream: primary[0],
    backupStream: backup[0],
    emergencyStream: emergency[0],
    primaryStreams: primary,
    backupStreams: backup,
    emergencyStreams: emergency,
    metadataUpstreams: metadata
  };
}

async function loadRadioRuntimeConfig(request, env, force = false) {
  const now = Date.now();
  if (!force && radioRuntimeCache.value && radioRuntimeCache.expiresAt > now) return radioRuntimeCache;

  if (env?.RADIO_CONFIG_KV && typeof env.RADIO_CONFIG_KV.get === "function") {
    try {
      const kvValue = await env.RADIO_CONFIG_KV.get(RADIO_RUNTIME_KV_KEY, { type: "json" });
      if (kvValue && typeof kvValue === "object") {
        radioRuntimeCache = { value: normalizeRadioRuntimeConfig(kvValue), source: "kv", expiresAt: now + RADIO_RUNTIME_CACHE_MS };
        return radioRuntimeCache;
      }
    } catch {}
  }

  if (env?.ASSETS && typeof env.ASSETS.fetch === "function") {
    try {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/config/radio-runtime.json";
      assetUrl.search = `?runtime=${now}`;
      const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), { headers: { "cache-control": "no-store" } }));
      if (response?.ok) {
        const assetValue = await response.json();
        radioRuntimeCache = { value: normalizeRadioRuntimeConfig(assetValue), source: "asset", expiresAt: now + RADIO_RUNTIME_CACHE_MS };
        return radioRuntimeCache;
      }
    } catch {}
  }

  radioRuntimeCache = { value: normalizeRadioRuntimeConfig(DEFAULT_RADIO_RUNTIME_CONFIG), source: "defaults", expiresAt: now + RADIO_RUNTIME_CACHE_MS };
  return radioRuntimeCache;
}

const HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>666SOUNDsDESIGn Radio — Internal</title>
  <link rel="icon" type="image/png" href="/assets/veluna/icons/icon-32x32.png?v=veluna-v1212" />
  <link rel="apple-touch-icon" href="/assets/veluna/icons/apple-touch-icon.png?v=veluna-v1212" />
  <link rel="stylesheet" href="/css/main.css?v=smfp-v83-discord-embed-pc-iphone-integration-20260505-0245" />
  <link rel="stylesheet" href="/css/veluna-theme.css?v=2026-07-19-pc-fit-v1224" />
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
        <div class="brand">666SOUNDsDESIGn RADIO</div>
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
        <div class="mini-box"><div class="mini-label">DJ / Status</div><div id="djText" class="mini-value">LYVRA DJ</div></div>
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

  <script type="module" src="/js/app.js?v=smfp-v83-discord-embed-pc-iphone-integration-20260505-0245"></script>
  <script src="/config/veluna-assets.js?v=2026-07-09-veluna-v1212"></script>
  <script defer src="/js/veluna-ui.js?v=2026-07-09-veluna-v1212"></script>
</body>
</html>`;

const CSS = `*{box-sizing:border-box}:root{--bg:#07080f;--bg2:#0a0d1a;--cyan:#16fff3;--pink:#ff3dbb;--green:#47ff8a;--red:#ff5570;--text:#eef7ff;--muted:#afbfcc;--border:rgba(22,255,243,.28);--shadow-cyan:0 0 18px rgba(22,255,243,.22);--shadow-pink:0 0 18px rgba(255,61,187,.18)}html,body{margin:0;min-height:100%;background:radial-gradient(circle at top left,rgba(255,61,187,.10),transparent 28%),radial-gradient(circle at bottom right,rgba(22,255,243,.11),transparent 30%),linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font-family:'Courier New',Courier,monospace}body{min-height:100vh}.app-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}.player-card,.boot-panel{width:min(94vw,560px);background:linear-gradient(180deg,rgba(21,25,32,.98),rgba(18,21,27,.98));border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow-cyan),var(--shadow-pink);backdrop-filter:blur(10px)}.player-card{padding:16px}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:14px}.topbar-line{height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);box-shadow:0 0 12px rgba(22,255,243,.25)}.brand,.boot-title{text-align:center;font-weight:700;letter-spacing:.05em;color:var(--cyan);text-shadow:0 0 12px rgba(22,255,243,.34)}.brand{font-size:1.55rem}.boot-title{font-size:1.5rem;margin-bottom:8px}.status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.lamp-box,.pill,.mini-box,.display-window,.control-btn,.small-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px}.lamp-box{display:flex;align-items:center;gap:8px;padding:10px 12px;min-height:50px}.lamp-box-source{justify-content:flex-start}.lamp-side-label{margin-left:auto;font-size:.82rem;font-weight:700;letter-spacing:.05em;color:var(--pink);text-shadow:0 0 10px rgba(255,61,187,.28)}.lamp{width:12px;height:12px;border-radius:999px;display:inline-block;border:1px solid rgba(255,255,255,.20);box-shadow:0 0 10px currentColor}.lamp-purple{color:#b14dff;background:#b14dff}.lamp-red{color:var(--pink);background:var(--pink)}.lamp-cyan{color:var(--cyan);background:var(--cyan)}.lamp-label,.display-label,.boot-subtitle,.boot-note,.mini-label{color:var(--muted)}.pill-row{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}.pill{padding:8px 12px;font-size:.92rem}.pill-dim{color:var(--muted)}.display-block{position:relative;margin-bottom:12px}.display-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.display-window{height:54px;overflow:hidden;display:flex;align-items:center;border-color:rgba(22,255,243,.22)}.marquee-track{white-space:nowrap;display:inline-block;padding-left:100%;font-size:1.08rem;font-weight:700;color:var(--pink);text-shadow:0 0 10px rgba(255,61,187,.3);animation:marquee 12s linear infinite}@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}.tiny-btn{appearance:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text);padding:6px 10px;font-size:.85rem;cursor:pointer}.history-overlay{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:10;border-radius:16px;padding:12px;background:rgba(13,16,22,.98);border:1px solid rgba(255,61,187,.25);box-shadow:var(--shadow-pink)}.history-overlay.hidden{display:none}.history-title{color:var(--cyan);font-weight:700;margin-bottom:8px}.history-list{margin:0;padding-left:18px;max-height:200px;overflow:auto}.mini-grid{display:grid;gap:10px;margin-bottom:12px}.mini-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.mini-box{padding:10px 12px}.mini-value{font-weight:700;margin-top:4px}.control-strip,.audio-tools{display:grid;gap:10px;align-items:stretch}.control-strip-3{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:10px}.audio-tools-4{grid-template-columns:repeat(4,minmax(0,1fr))}.control-btn,.small-btn{padding:12px 12px;color:var(--text);font-weight:700;cursor:pointer;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));box-shadow:var(--shadow-cyan)}.control-btn.main{border-color:rgba(255,61,187,.35);box-shadow:var(--shadow-pink)}.small-btn{border-color:rgba(255,61,187,.28);box-shadow:var(--shadow-pink)}.source-btn.is-active{border-color:rgba(22,255,243,.45);box-shadow:0 0 14px rgba(22,255,243,.28)}.overlay{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(7,10,14,.86)}.overlay.hidden{display:none}.boot-panel{padding:22px;text-align:center}.neon-button{appearance:none;border:1px solid rgba(22,255,243,.45);border-radius:16px;padding:14px 18px;background:linear-gradient(180deg,rgba(22,255,243,.16),rgba(255,61,187,.08));color:var(--text);font-size:1rem;font-weight:700;cursor:pointer;box-shadow:var(--shadow-cyan)}.progress-wrap{width:100%;height:12px;margin-top:18px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.progress-bar{width:0%;height:100%;background:linear-gradient(90deg,var(--pink),var(--cyan));transition:width .12s linear}.progress-text{margin-top:10px;font-weight:700}@media (max-width:560px){.mini-grid-3{grid-template-columns:1fr}.audio-tools-4{grid-template-columns:repeat(2,minmax(0,1fr))}}`;

const APP_JS = `import { STREAM_CONFIG } from "../config/stream.config.js?v=smfp-v83-discord-embed-pc-iphone-integration-20260505-0245";
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
function cleanMetaText(value){return String(value??"").replace(/<[^>]*>/g," ").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim()}
function firstMetaText(...values){for(const value of values){if(value===undefined||value===null)continue;if(typeof value==="string"||typeof value==="number"){const text=cleanMetaText(value);if(text)return text;continue}if(value&&typeof value==="object"){const nested=value.display_title??value.normalized_title??value.text??value.title??value.name??value.songtitle??value.song??value.current??value.now_playing??value.nowPlaying;if(nested!==value){const text=firstMetaText(nested);if(text)return text}}}return ""}
function metaHasIdentity(value){return /(?:fraggle(?:\s*power)?(?:\s*666)?|fraggel(?:\s*power)?(?:\s*666)?|666\s*sounds?\s*design|666soundsdesign|666\s*sound\s*system|666soundsystem|l\.?\s*y\.?\s*v\.?\s*r\.?\s*a\.?|lyvra)/i.test(cleanMetaText(value))}
function cleanMetaTitle(value){let text=cleanMetaText(value).replace(/^\s*(?:unknown title|loading metadata|metadata unavailable|metadaten werden geladen|no dj)\s*(?:[-:|–—·•]+\s*)*/i,"").replace(/(?:\s*[-–—|·•]\s*){2,}/g," - ").replace(/\s{2,}/g," ").replace(/^\s*[-:|–—·•]+\s*|\s*[-:|–—·•]+\s*$/g,"").trim();text=text.replace(/666\s*sounds?\s*design/ig,"666SOUNDsDESIGn").replace(/lyvra/ig,"LYVRA");const parts=text.split(/\s+(?:-|–|—|\||·|•)\s+/).map(v=>v.trim()).filter(Boolean);const seen=new Set(),out=[];for(const part of parts){const key=part.toLowerCase().replace(/[^a-z0-9]+/g,"");if(!key||seen.has(key))continue;seen.add(key);out.push(part)}return out.length?out.join(" - "):text}
function normalizeTitle(data){const served=firstMetaText(data?.display_title,data?.normalized_title,data?.title_display);if(served)return cleanMetaTitle(served);const raw=firstMetaText(data?.song,data?.title,data?.songtitle,data?.currentSong,data?.current_song,data?.track,data?.now_playing,data?.nowPlaying);const artist=firstMetaText(data?.artist,data?.song?.artist,data?.now_playing?.song?.artist);const title=cleanMetaTitle(raw);if(!title)return lastTitle||"Live Stream";let candidate=title;if(artist&&metaHasIdentity(artist)&&!title.toLowerCase().includes(cleanMetaTitle(artist).toLowerCase()))candidate=cleanMetaTitle(artist+" - "+title);return metaHasIdentity(candidate)?candidate:"LYVRA is alive · 666SOUNDsDESIGn · "+candidate}
function normalizeDjDisplay(value){const raw=cleanMetaText(value);if(!raw)return "LYVRA DJ";const lowered=raw.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(!lowered||["unknown","none","null","undefined","offline","n a","na","no dj","nodj","no dj status","dj 666","666 dj","666soundsdesign dj","666 sounds design dj","lyvra dj"].includes(lowered)||lowered.includes("auto dj")||lowered.includes("autodj"))return "LYVRA DJ";return raw}
function renderHistory(items){if(!historyList)return;historyList.innerHTML="";if(!Array.isArray(items)||!items.length){const li=document.createElement("li");li.textContent="No history loaded";historyList.appendChild(li);return}items.slice(0,12).forEach((item)=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));historyList.appendChild(li)})}
async function fetchMetadata(){try{const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});if(!res.ok)throw new Error("metadata fetch failed");const data=await res.json();const title=normalizeTitle(data);lastTitle=title;if(nowPlaying)nowPlaying.textContent=title;const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);const bitrate=pickValue(data,["bitrate"],"Unknown");const djStatus=normalizeDjDisplay(firstMetaText(data?.dj_display,data?.dj,data?.djusername,data?.djstatus,data?.live_dj,data?.streamer,data?.presenter,data?.client,data?.live?.streamer_name,data?.live?.streamer,data?.live?.name));if(listenersText)listenersText.textContent=String(Number.isFinite(listeners)?listeners:0)+" / "+String(STREAM_CONFIG.listener_capacity);if(bitrateText)bitrateText.textContent=bitrate?(String(bitrate).replace(/\s*kbps$/i,"")+" kbps"):"Unknown";if(djText)djText.textContent=String(djStatus||"LYVRA DJ");renderHistory(pickValue(data,["history"],[]));setMetadataStatus("Online");setLamp(metaLamp,"lamp-cyan")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red")}}
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


function timingSafeEqualText(a, b){
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  let mismatch = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for(let i = 0; i < max; i += 1){
    mismatch |= (left[i] || 0) ^ (right[i] || 0);
  }
  return mismatch === 0;
}

function playerAlertCookie(request, name){
  const raw = request.headers.get('cookie') || '';
  for(const part of raw.split(';').map(v => v.trim())){
    const eq = part.indexOf('=');
    if(eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return '';
}

function playerAlertBearerToken(request){
  const auth = String(request.headers.get('authorization') || '').trim();
  if(auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}

function playerAlertSameOriginRequest(request){
  const requestOrigin = new URL(request.url).origin;
  const origin = String(request.headers.get('origin') || '').trim();
  const referer = String(request.headers.get('referer') || '').trim();
  if(origin && origin !== requestOrigin) return false;
  if(referer){
    try{
      if(new URL(referer).origin !== requestOrigin) return false;
    }catch(err){
      return false;
    }
  }
  return true;
}

async function verifyPlayerAlertWrite(request, env){
  const configuredToken = String((env && (env.PLAYER_ALERT_WRITE_TOKEN || env.PLAYER_ALERT_BACKEND_TOKEN || env.PLAYER_ALERT_TOKEN)) || '').trim();
  const providedToken = String(request.headers.get('x-player-alert-token') || playerAlertBearerToken(request) || '').trim();
  if(configuredToken && providedToken && timingSafeEqualText(providedToken, configuredToken)){
    return { ok: true, mode: 'service-token' };
  }

  // Public player message route: every listener may send from the WebRadio player.
  // No admin session and no password worker are required here.
  // Cross-origin browser calls remain rejected; text cleanup and rate limiting stay active.
  if(!playerAlertSameOriginRequest(request)){
    return { ok: false, error: configuredToken && providedToken ? 'invalid_token' : 'origin_mismatch' };
  }
  return { ok: true, mode: 'public-player-same-origin' };
}

function metadataSafeText(value, max = 512){
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const AUTO_DJ_DISPLAY_NAME = 'LYVRA DJ';
const BROADCAST_TITLE_PREFIX = 'LYVRA is alive · 666SOUNDsDESIGn · ';

function metadataFirstText(...values){
  for(const value of values){
    if(value === undefined || value === null) continue;
    if(typeof value === 'string' || typeof value === 'number'){
      const text = metadataSafeText(value, 512);
      if(text) return text;
      continue;
    }
    if(value && typeof value === 'object'){
      const nested = value.display_title ?? value.normalized_title ?? value.text ?? value.title ?? value.name ?? value.songtitle ?? value.song ?? value.current ?? value.now_playing ?? value.nowPlaying;
      if(nested !== value){
        const text = metadataFirstText(nested);
        if(text) return text;
      }
    }
  }
  return '';
}

function metadataAutoDjValue(value){
  const lowered = metadataSafeText(value, 160).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if(!lowered) return true;
  if(['unknown','none','null','undefined','offline','n a','na','no dj','nodj','no dj status','dj 666','666 dj','666soundsdesign dj','666 sounds design dj','lyvra dj'].includes(lowered)) return true;
  return lowered.includes('auto dj') || lowered.includes('autodj');
}

function normalizeBroadcastDjName(value){
  const raw = metadataSafeText(value, 160);
  return metadataAutoDjValue(raw) ? AUTO_DJ_DISPLAY_NAME : raw;
}

function metadataHasBrandIdentity(value){
  return /(?:fraggle(?:\s*power)?(?:\s*666)?|fraggel(?:\s*power)?(?:\s*666)?|666\s*sounds?\s*design|666soundsdesign|666\s*sound\s*system|666soundsystem|l\.?\s*y\.?\s*v\.?\s*r\.?\s*a\.?|\blyvra\b)/i.test(metadataSafeText(value, 512));
}

function normalizeBroadcastTitleText(value){
  let text = metadataSafeText(value, 512)
    .replace(/^\s*(?:unknown title|loading metadata|metadata unavailable|metadaten werden geladen|no dj)\s*(?:[-:|–—·•]+\s*)*/i, '')
    .replace(/(?:\s*[-–—|·•]\s*){2,}/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-:|–—·•]+\s*|\s*[-:|–—·•]+\s*$/g, '')
    .trim();
  text = text.replace(/666\s*sounds?\s*design/ig, '666SOUNDsDESIGn').replace(/\blyvra\b/ig, 'LYVRA');
  const segments = text.split(/\s+(?:-|–|—|\||·|•)\s+/).map(part => part.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for(const segment of segments){
    const key = segment.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if(!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(segment);
  }
  return unique.length ? unique.join(' - ') : text;
}

function normalizeBroadcastDisplayTitle(rawTitle, rawArtist = ''){
  const title = normalizeBroadcastTitleText(rawTitle);
  if(!title) return '';
  const artist = normalizeBroadcastTitleText(rawArtist);
  let candidate = title;
  if(artist && metadataHasBrandIdentity(artist) && !title.toLowerCase().includes(artist.toLowerCase())){
    candidate = normalizeBroadcastTitleText(`${artist} - ${title}`);
  }
  if(metadataHasBrandIdentity(candidate)) return candidate;
  return `${BROADCAST_TITLE_PREFIX}${candidate}`;
}

function normalizeMetadataBroadcastPayload(payload){
  if(!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const rawDj = metadataFirstText(
    payload.dj_display, payload.dj, payload.djusername, payload.djstatus, payload.live_dj,
    payload.streamer, payload.presenter, payload.client,
    payload.live?.streamer_name, payload.live?.streamer, payload.live?.name
  );
  const dj = normalizeBroadcastDjName(rawDj);
  const rawTitle = metadataFirstText(
    payload.display_title, payload.normalized_title, payload.title_display,
    payload.title, payload.current_title, payload.currentTitle, payload.nowplaying, payload.nowPlaying,
    payload.currenttrack, payload.currentTrack, payload.current_song, payload.currentSong,
    payload.songtitle, payload.song, payload.track, payload.stream_title, payload.streamTitle,
    payload.now_playing?.song?.text, payload.now_playing?.song?.title
  );
  const rawArtist = metadataFirstText(payload.artist, payload.song?.artist, payload.now_playing?.song?.artist);
  const displayTitle = normalizeBroadcastDisplayTitle(rawTitle, rawArtist);
  return Object.assign({}, payload, {
    raw_title: normalizeBroadcastTitleText(rawTitle),
    display_title: displayTitle,
    normalized_title: displayTitle,
    dj,
    dj_display: dj,
    dj_mode: dj === AUTO_DJ_DISPLAY_NAME ? 'autodj' : 'live'
  });
}

function normalizeMetadataDjPayload(payload){
  return normalizeMetadataBroadcastPayload(payload);
}

function sanitizeMetadataValue(value, depth = 0){
  if(depth > 6) return null;
  if(typeof value === 'string') return metadataSafeText(value);
  if(typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if(Array.isArray(value)) return value.slice(0, 60).map((entry) => sanitizeMetadataValue(entry, depth + 1));
  if(value && typeof value === 'object'){
    const out = {};
    for(const [key, entry] of Object.entries(value).slice(0, 80)) out[key] = sanitizeMetadataValue(entry, depth + 1);
    return out;
  }
  return null;
}

async function fetchMetadataProxyPayload(request, env){
  const runtime = await loadRadioRuntimeConfig(request, env);
  let lastError = null;
  for(let index = 0; index < runtime.value.metadataUpstreams.length; index += 1){
    const upstreamUrl = runtime.value.metadataUpstreams[index];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try{
      const upstream = await fetch(upstreamUrl,{headers:{"cache-control":"no-store"},signal:controller.signal});
      if(!upstream.ok) throw new Error(`metadata_http_${upstream.status}`);
      const body = await upstream.text();
      let payload = body;
      try{
        payload = JSON.stringify(normalizeMetadataBroadcastPayload(sanitizeMetadataValue(JSON.parse(body))));
      }catch(err){
        payload = JSON.stringify({ raw: metadataSafeText(body, 1024) });
      }
      return { ok: true, status: upstream.status, payload, source: `upstream-${index + 1}`, configSource: runtime.source };
    }catch(err){
      lastError = { source: `upstream-${index + 1}`, error: err?.name === "AbortError" ? "metadata_timeout" : String(err && err.message || err) };
    }finally{
      clearTimeout(timer);
    }
  }
  return { ok: false, error: lastError || { error: "metadata_proxy_failed" }, configSource: runtime.source };
}


// ==========================================================
// PLAYER_ALERT_V180_BACKEND_PRIMARY_KV_FALLBACK
// Zweck: Player-Nachrichten zuerst an Renda/Render Backend senden.
// Fallback-Reihenfolge: Backend -> PLAYER_ALERT_KV -> Cloudflare Cache.
// Discord ist hier NICHT das primäre Player-Nachrichtensystem.
// ==========================================================
const PLAYER_ALERT_CACHE_KEY = 'https://666soundsdesign.local/player-alert/current';
const PLAYER_ALERT_RATE_KEY = 'https://666soundsdesign.local/player-alert/rate';
const PLAYER_ALERT_RATE_MS = 180000;
const PLAYER_ALERT_KV_CURRENT_KEY = 'player-alert:current';
const PLAYER_ALERT_KV_RATE_KEY = 'player-alert:rate';
const PLAYER_ALERT_KV_HISTORY_KEY = 'player-alert:history';
function playerAlertJson(data, status = 200){
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store'}});
}
function playerAlertCleanText(value){
  return String(value || '').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}
function playerAlertBackendUrl(env){
  const raw = (env && (env.PLAYER_ALERT_BACKEND_URL || env.RENDA_PLAYER_ALERT_URL || env.RENDER_PLAYER_ALERT_URL || env.RENDA_BACKEND_URL || env.RENDER_BACKEND_URL)) || '';
  if(!raw) return '';
  try{
    const url = new URL(String(raw));
    if(!/\/api\/player-alert\/?$/.test(url.pathname)) url.pathname = url.pathname.replace(/\/$/,'') + '/api/player-alert';
    return url.toString();
  }catch(e){ return ''; }
}
async function playerAlertBackendFetch(env, path, init){
  const base = playerAlertBackendUrl(env);
  if(!base) return null;
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/$/,'') + path;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 6500);
  try{
    const headers = new Headers((init && init.headers) || {});
    if(!headers.has('content-type')) headers.set('content-type','application/json');
    const serviceToken = String((env && (env.PLAYER_ALERT_SERVICE_TOKEN || env.PLAYER_ALERT_BACKEND_TOKEN)) || '').trim();
    if(serviceToken) headers.set('x-player-alert-service-token', serviceToken);
    const res = await fetch(url.toString(), Object.assign({}, init || {}, {signal:controller.signal, headers}));
    clearTimeout(timer);
    let data = null; try{ data = await res.json(); }catch(e){ data = {ok:res.ok,status:res.status}; }
    return {ok:res.ok, status:res.status, data};
  }catch(err){
    clearTimeout(timer);
    return {ok:false, status:0, data:{ok:false,error:'backend_unreachable', detail:String(err && err.message || err)}};
  }
}
async function playerAlertKvGet(env, key){
  try{ if(env && env.PLAYER_ALERT_KV) return await env.PLAYER_ALERT_KV.get(key, {type:'json'}); }catch(e){}
  return null;
}
async function playerAlertKvPut(env, key, value, ttl=900){
  try{ if(env && env.PLAYER_ALERT_KV) { await env.PLAYER_ALERT_KV.put(key, JSON.stringify(value), {expirationTtl:ttl}); return true; } }catch(e){}
  return false;
}
async function playerAlertHistoryAppend(env, alert){
  const current = await playerAlertKvGet(env, PLAYER_ALERT_KV_HISTORY_KEY) || [];
  const next = Array.isArray(current) ? current.slice(0,19) : [];
  next.unshift(alert);
  await playerAlertKvPut(env, PLAYER_ALERT_KV_HISTORY_KEY, next, 86400);
}
async function playerAlertCacheGet(key){
  try{ const hit = await caches.default.match(new Request(key)); if(hit) return await hit.json(); }catch(e){}
  return null;
}
async function playerAlertCachePut(key, value, maxAge=900){
  try{ await caches.default.put(new Request(key), new Response(JSON.stringify(value), {headers:{'content-type':'application/json; charset=UTF-8','cache-control':'public, max-age='+String(maxAge)}})); return true; }catch(e){ return false; }
}
function playerAlertRateKvKey(rateKey){
  return `${PLAYER_ALERT_KV_RATE_KEY}:${String(rateKey || 'anonymous').slice(0,96)}`;
}
function playerAlertRateCacheKey(rateKey){
  return `${PLAYER_ALERT_RATE_KEY}/${String(rateKey || 'anonymous').slice(0,96)}`;
}
function playerAlertPublicPayload(value){
  if(Array.isArray(value)) return value.map(playerAlertPublicPayload);
  if(value && typeof value === 'object'){
    const out = {};
    for(const [key, entry] of Object.entries(value)){
      if(key === 'rateKey' || key === 'rateIdentity' || key === 'clientFingerprint') continue;
      out[key] = playerAlertPublicPayload(entry);
    }
    return out;
  }
  return value;
}
async function playerAlertRateIdentity(request, env){
  const ip = String(request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown').trim();
  const userAgent = String(request.headers.get('user-agent') || 'unknown').slice(0,200);
  const salt = String((env && (env.PLAYER_ALERT_RATE_SALT || env.PLAYER_ALERT_SERVICE_TOKEN)) || 's666-player-alert-rate-v2');
  const input = `${salt}|${ip}|${userAgent}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((value)=>value.toString(16).padStart(2,'0')).join('');
}
async function handlePlayerAlertV152(request, env){
  const url = new URL(request.url);
  if(!url.pathname.startsWith('/api/player-alert/')) return null;
  if(request.method === 'OPTIONS') return playerAlertJson({ok:true});
  if(url.pathname === '/api/player-alert/status' && request.method === 'GET'){
    return playerAlertJson({ok:true, backendConfigured:!!playerAlertBackendUrl(env), kvConfigured:!!(env && env.PLAYER_ALERT_KV), mode:'backend-primary-optional-kv-cache-fallback', rateIdentity:'server-controlled-ip-ua-sha256', rateSaltConfigured:!!(env && (env.PLAYER_ALERT_RATE_SALT || env.PLAYER_ALERT_SERVICE_TOKEN)), releaseVersion:String((env&&env.RELEASE_VERSION)||'FULLVERSION_RADIO_ONLY_CLEANUP_v1.2.22')});
  }
  if(url.pathname === '/api/player-alert/current' && request.method === 'GET'){
    const backend = await playerAlertBackendFetch(env, '/current', {method:'GET'});
    if(backend && backend.ok) return playerAlertJson(Object.assign({}, playerAlertPublicPayload(backend.data), {source:'backend'}));
    const kv = await playerAlertKvGet(env, PLAYER_ALERT_KV_CURRENT_KEY);
    if(kv) return playerAlertJson(Object.assign({}, playerAlertPublicPayload(kv), {clientSource:kv.source||'', source:'kv-fallback'}));
    const cache = await playerAlertCacheGet(PLAYER_ALERT_CACHE_KEY);
    if(cache) return playerAlertJson(Object.assign({}, playerAlertPublicPayload(cache), {clientSource:cache.source||'', source:'cache-tertiary'}));
    return playerAlertJson({active:false, source:'none'});
  }
  if(url.pathname === '/api/player-alert/history' && request.method === 'GET'){
    const backend = await playerAlertBackendFetch(env, '/history', {method:'GET'});
    if(backend && backend.ok) return playerAlertJson(Object.assign({}, playerAlertPublicPayload(backend.data), {source:'backend'}));
    const kv = await playerAlertKvGet(env, PLAYER_ALERT_KV_HISTORY_KEY) || [];
    return playerAlertJson({ok:true, source:kv.length?'kv-fallback':'none', items:playerAlertPublicPayload(kv)});
  }
  if(url.pathname === '/api/player-alert/send' && request.method === 'POST'){
    const writeAccess = await verifyPlayerAlertWrite(request, env);
    if(!writeAccess.ok) return playerAlertJson({ok:false,error:writeAccess.error},401);
    let payload = {};
    try{ payload = await request.json(); }catch(err){ return playerAlertJson({ok:false,error:'invalid_json'},400); }
    const message = playerAlertCleanText(payload.message);
    const senderId = playerAlertCleanText(payload.senderId || payload.clientId || 'anonymous').slice(0,80) || 'anonymous';
    const username = playerAlertCleanText(payload.username || payload.name || 'Broadcast').slice(0,28) || 'Broadcast';
    if(!message) return playerAlertJson({ok:false,error:'empty_message'},400);
    const now = Date.now();
    const rateKey = await playerAlertRateIdentity(request, env);
    const rateKvKey = playerAlertRateKvKey(rateKey);
    const rateCacheKey = playerAlertRateCacheKey(rateKey);
    const rate = (await playerAlertKvGet(env, rateKvKey)) || (await playerAlertCacheGet(rateCacheKey));
    if(rate){
      const last = Number(rate.last || 0);
      if(last && (now - last) < PLAYER_ALERT_RATE_MS) return playerAlertJson({ok:false,error:'rate_limited',retryAfterMs:PLAYER_ALERT_RATE_MS - (now-last)},429);
    }
    const alert = {ok:true,active:true,id:String(now)+'-'+Math.random().toString(36).slice(2,8),message,username,senderId,clientId:senderId,createdAt:new Date(now).toISOString(),timestamp:now,version:playerAlertCleanText(payload.version||''),source:playerAlertCleanText(payload.source||'web-player')};
    const backend = await playerAlertBackendFetch(env, '/send', {method:'POST', body:JSON.stringify(alert)});
    if(backend && backend.ok){
      await playerAlertKvPut(env, rateKvKey, {last:now}, 180);
      return playerAlertJson(Object.assign({ok:true,delivered:true,source:'backend',fallback:false}, backend.data));
    }
    const kvOk = await playerAlertKvPut(env, PLAYER_ALERT_KV_CURRENT_KEY, alert, 900);
    if(kvOk){
      await playerAlertKvPut(env, rateKvKey, {last:now}, 180);
      await playerAlertHistoryAppend(env, alert);
      return playerAlertJson(Object.assign({}, alert, {clientSource:alert.source||'', source:'kv-fallback',backend:backend?backend.data:null}));
    }
    await playerAlertCachePut(PLAYER_ALERT_CACHE_KEY, alert, 900);
    await playerAlertCachePut(rateCacheKey, {last:now}, 180);
    return playerAlertJson(Object.assign({}, alert, {clientSource:alert.source||'', source:'cache-tertiary',backend:backend?backend.data:null}));
  }
  return playerAlertJson({ok:false,error:'not_found'},404);
}
// END PLAYER_ALERT_V180_BACKEND_PRIMARY_KV_FALLBACK

function passthroughHeaders(sourceHeaders){
  const headers=new Headers();
  const allow=["content-type","content-length","accept-ranges","content-range","cache-control","icy-br","icy-description","icy-genre","icy-metaint","icy-name","icy-notice1","icy-notice2","icy-pub","icy-url","transfer-encoding"];
  for(const key of allow){const value=sourceHeaders.get(key);if(value)headers.set(key,value)}
  headers.set("access-control-allow-origin","*");
  headers.set("x-radio-proxy","666soundsdesign-worker");
  return headers;
}
function streamNumberEnv(env, key, fallback, min, max){
  const value = Number(env && env[key]);
  if(!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
function streamUniqueCandidates(groups){
  const seen = new Set();
  const ordered = [];
  for(const group of groups){
    const https = (group.urls || []).filter((url)=>String(url).startsWith('https://'));
    const http = (group.urls || []).filter((url)=>String(url).startsWith('http://'));
    for(const upstream of [...https, ...http]){
      const clean = String(upstream || '').trim();
      if(!clean || seen.has(clean)) continue;
      seen.add(clean);
      ordered.push({upstream:clean,targetName:group.name});
    }
  }
  return ordered;
}
async function proxyStream(request, upstream, targetName = "unknown", timeoutMs = 2500){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const init={method:request.method,headers:new Headers(),signal:controller.signal};
  const range=request.headers.get("range");
  const userAgent=request.headers.get("user-agent");
  const accept=request.headers.get("accept");
  const icyMeta=request.headers.get("icy-metadata");
  if(range)init.headers.set("range",range);
  if(userAgent)init.headers.set("user-agent",userAgent);
  if(accept)init.headers.set("accept",accept);
  if(icyMeta)init.headers.set("icy-metadata",icyMeta);
  try{
    const response=await fetch(upstream,init);
    if(!response.ok && response.status >= 400) throw new Error(`upstream_${targetName}_http_${response.status}`);
    const headers=passthroughHeaders(response.headers);
    headers.set("x-active-stream-target",targetName);
    headers.set("x-failover-state",targetName === "main" ? "primary" : "fallback");
    headers.set("x-upstream-protocol",upstream.startsWith("https://") ? "https" : "http");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }finally{
    clearTimeout(timeout);
  }
}
async function proxyStreamPlan(request, env, groups, errorName){
  const attemptTimeout = streamNumberEnv(env,'STREAM_ATTEMPT_TIMEOUT_MS',2500,1000,5000);
  const budget = streamNumberEnv(env,'STREAM_FAILOVER_BUDGET_MS',12000,4000,20000);
  const deadline = Date.now() + budget;
  const candidates = streamUniqueCandidates(groups);
  const failures = [];
  for(const candidate of candidates){
    const remaining = deadline - Date.now();
    if(remaining <= 250){ failures.push({target:candidate.targetName,code:'global_budget_exhausted'}); break; }
    try{
      return await proxyStream(request,candidate.upstream,candidate.targetName,Math.min(attemptTimeout,remaining));
    }catch(error){
      failures.push({target:candidate.targetName,protocol:candidate.upstream.startsWith('https://')?'https':'http',code:streamFailureCode(error)});
    }
  }
  return new Response(JSON.stringify({error:errorName,failures,budgetMs:budget,attemptTimeoutMs:attemptTimeout}),{
    status:502,
    headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*','x-radio-proxy':'666soundsdesign-worker','x-failover-state':'failed'}
  });
}
async function proxyStreamFailover(request, env){
  const runtime=await loadRadioRuntimeConfig(request,env);
  return proxyStreamPlan(request,env,[
    {name:'main',urls:runtime.value.primaryStreams},
    {name:'backup',urls:runtime.value.backupStreams},
    {name:'backup-alt',urls:runtime.value.emergencyStreams}
  ],'stream_proxy_failed');
}
function streamFailureCode(error){
  const message=String(error&&error.message||error||'stream_failed');
  if(error&&error.name==='AbortError')return 'stream_timeout';
  const http=message.match(/http_(\d{3})/i);
  if(http)return `stream_http_${http[1]}`;
  return 'stream_unreachable';
}
async function proxyFallbackStream(request, env){
  const runtime=await loadRadioRuntimeConfig(request,env);
  return proxyStreamPlan(request,env,[
    {name:'backup',urls:runtime.value.backupStreams},
    {name:'backup-alt',urls:runtime.value.emergencyStreams}
  ],'fallback_stream_proxy_failed');
}


function buildExternalProxyHeaders(sourceHeaders){
  const headers = new Headers(sourceHeaders);
  headers.delete("content-length");
  if(!headers.get("cache-control")) headers.set("cache-control", "no-store");
  headers.set("x-player-mode", "local-project-asset");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return headers;
}

async function serveProjectAsset(request, env, pathname){
  if(!(env && env.ASSETS && typeof env.ASSETS.fetch === 'function')) return null;
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if(!response || response.status === 404) return null;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildExternalProxyHeaders(response.headers)
  });
}

async function fetchExternalAsset(pathname, request, env){
  let suffix = pathname.replace(/^\/(?:extern|external-player)\/?/, "");
  suffix = suffix.replace(/^\//, "");
  const localPath = suffix ? `/${suffix}` : STATIC_ROOT_INDEX_PATH;
  const response = await serveProjectAsset(request, env, localPath);
  return response || new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
}

async function serveExternalIndex(request, env){
  const response = await serveProjectAsset(request, env, STATIC_ROOT_INDEX_PATH);
  return response || new Response(HTML, {status:200,headers:{"content-type":"text/html; charset=UTF-8","cache-control":"no-store","x-player-mode":"embedded-emergency-fallback","x-player-version":"legacy-embedded"}});
}

function normalizedRoutePath(pathname){
  let value = String(pathname || '/');
  try{ value = decodeURIComponent(value); }catch(err){}
  value = value.replace(/\/{2,}/g, '/');
  if(value.length > 1) value = value.replace(/\/+$/, '');
  return value.toLowerCase();
}
function isVelunaPlayerPath(pathname){
  const path = normalizedRoutePath(pathname);
  return path === '/veluna' || path === '/veluna/index.html';
}
async function serveVelunaPlayer(request, env){
  if(request.method !== 'GET' && request.method !== 'HEAD'){
    return new Response(JSON.stringify({ok:false,error:'method_not_allowed',allowed:['GET','HEAD']}),{status:405,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','allow':'GET, HEAD'}});
  }
  const response = await serveProjectAsset(request, env, "/veluna/index.html") || await serveProjectAsset(request, env, "/VELUNA/index.html");
  if(!response){
    return new Response("VELUNA player asset unavailable",{status:503,headers:{"content-type":"text/plain; charset=UTF-8","cache-control":"no-store","x-player-mode":"veluna-asset-missing"}});
  }
  const headers = new Headers(response.headers);
  headers.set("cache-control","no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma","no-cache");
  headers.set("expires","0");
  headers.set("content-location","/veluna/");
  headers.set("x-player-mode","veluna-lyvra-minimal");
  headers.set("x-player-version","v1.2.12");
  headers.set("x-veluna-route-lock","standalone-only");
  return new Response(request.method === "HEAD" ? null : response.body,{status:response.status,statusText:response.statusText,headers});
}




// ROUTE_LIVE_DEBUG_HARDENING_V1_20260525
const ROUTE_LIVE_DEBUG_VERSION = "route-live-debug-hardening-v1-20260525";

function s666Json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "x-666-debug-version": ROUTE_LIVE_DEBUG_VERSION
    }
  });
}

function s666BoolEnv(env, names) {
  const out = {};
  for (const name of names) out[name] = Boolean(env && env[name]);
  return out;
}

function s666RouteTable() {
  return [
    { priority: 1, route: "/The-Dark-Dancer", handler: "darkDancerResponse", purpose: "The Dark Dancer story page" },
    { priority: 2, route: "/api/admin/*", handler: "handleRadioAdminConfigAddon", purpose: "Admin auth/config/GitHub backup" },
    { priority: 3, route: "/api/player-alert/*", handler: "handlePlayerAlertV152", purpose: "PC+iPhone broadcast relay" },
    { priority: 4, route: "/api/discord/*", handler: "handleDiscordNotifyV3", purpose: "Discord shooter / webhook bridge" },
    { priority: 5, route: "/api/skip/status", handler: "handleSkipApi", purpose: "skip status / diagnostics" },
    { priority: 6, route: "/api/admin/skip + /skip", handler: "handleSkipApi", purpose: "protected shoutcast autodj skip" },
    { priority: 9, route: "/external-player /extern", handler: "root alias", purpose: "external player alias" },
    { priority: 10, route: "/veluna", handler: "serveVelunaPlayer", purpose: "VELUNA LYVRA minimal recovery player" },
    { priority: 11, route: "/internal", handler: "embedded internal player", purpose: "existing internal emergency player" },
    { priority: 12, route: "/stream", handler: "stream proxy/failover", purpose: "primary stream" },
    { priority: 13, route: "/fallback-stream", handler: "fallback stream proxy", purpose: "hard fallback stream" },
    { priority: 14, route: "/api/nowplaying", handler: "metadata proxy", purpose: "metadata / now playing" },
    { priority: 15, route: "/health", handler: "s666LiveHealth", purpose: "live module health" },
    { priority: 16, route: "/debug", handler: "s666LiveDebug", purpose: "safe debug overview" },
    { priority: 17, route: "/debug/routes", handler: "s666RouteTable", purpose: "route priority table" },
    { priority: 18, route: "/debug/modules", handler: "s666ModuleStatus", purpose: "module status table" }
  ];
}

function s666ModuleStatus(env) {
  return {
    version: ROUTE_LIVE_DEBUG_VERSION,
    generatedAt: new Date().toISOString(),
    modules: {
      playerRoot: { ok: true, files: ["index.html", "worker.js"] },
      emergencyFallback: {
        ok: true,
        routes: ["/external-player", "/fallback-stream", "/stream"],
        primary: PRIMARY_STREAM_URLS[0],
        fallback: FALLBACK_STREAM_URLS[0]
      },
      velunaMinimalPlayer: {
        ok: true,
        routes: ["/veluna", "/veluna/", "/VELUNA", "/VELUNA/", "/veluna/index.html", "/VELUNA/index.html"],
        primary: "https://my.idjstream.com:8686",
        fallback: "https://my.idjstream.com:8686/stream",
        emergencyChain: ["/stream", "/fallback-stream"],
        internalPlayerPreserved: true
      },
      darkDancer: {
        ok: typeof darkDancerResponse === "function",
        routes: ["/The-Dark-Dancer", "/The-Dark-Dancer.html"]
      },
      broadcast: {
        ok: typeof handlePlayerAlertV152 === "function",
        routes: ["/api/player-alert/send", "/api/player-alert/current", "/api/player-alert/status", "/api/player-alert/history"]
      },
      skip: {
        ok: typeof handleSkipApi === "function",
        routes: ["/api/skip/status", "/api/admin/skip", "/skip"],
        env: s666BoolEnv(env, ["SHOUTCAST_ADMIN_URL","SHOUTCAST_ADMIN_USER","SHOUTCAST_ADMIN_PASSWORD","SHOUTCAST_SID","SONICPANEL_SKIP_URL","SONICPANEL_SKIP_TOKEN","ADMIN_AUTH_VERIFY_URL","PW_VERIFY_URL","PW_AUTH_SECRET"])
      },
      admin: {
        ok: typeof handleRadioAdminConfigAddon === "function",
        routes: ["/api/admin/auth-check", "/api/admin/config/current", "/api/admin/config/update", "/api/admin/config/rollback"],
        env: s666BoolEnv(env, ["ADMIN_AUTH_VERIFY_URL", "ADMIN_AUTH_LOGIN_URL", "GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH"])
      },
      discord: {
        ok: typeof handleDiscordNotifyV3 === "function",
        routes: ["/api/discord/status", "/api/discord/manual", "/api/discord/test", "/api/discord/nowplaying"],
        env: s666BoolEnv(env, ["DISCORD_WEBHOOK_URL", "DISCORD_WEBHOOK", "DISCORD_ADMIN_TOKEN", "DISCORD_GATE_CODE", "ADMIN_AUTH_VERIFY_URL"])
      },
      goveeFxSceneSync: { ok: true, files: ["js/system-extra/govee/govee-sync-config.js","js/system-extra/govee/govee-bridge-client.js","js/system-extra/govee/govee-scene-sync.js","js/system-extra/govee/govee-fx-control-hooks.js"], secretPolicy: "no frontend secrets" },
      soundControl: {
        ok: true,
        files: ["js/sound-control-overlay-v1.js", "css/sound-control-overlay-v1.css"]
      },
      rendererResource: {
        ok: true,
        folder: "renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer"
      }
    }
  };
}

async function s666LiveHealth(request, env) {
  const runtime = await loadRadioRuntimeConfig(request, env);
  return s666Json({
    ok: true,
    service: "666SOUNDsDESIGn WebRadio",
    version: "FULLVERSION_RADIO_ONLY_CLEANUP_v1.2.22",
    time: new Date().toISOString(),
    runtimeConfig: { source: runtime.source, version: runtime.value.version || null },
    routes: { root: "/", veluna: "/veluna", internal: "/internal", stream: "/stream", metadata: "/api/nowplaying" }
  });
}

async function s666LiveDebug(request, env) {
  const url = new URL(request.url);
  return s666Json({
    ok: true,
    service: "666SOUNDsDESIGn WebRadio Live Debug",
    version: ROUTE_LIVE_DEBUG_VERSION,
    time: new Date().toISOString(),
    request: { path: url.pathname, host: url.host, cacheBust: url.searchParams.get("t") || url.searchParams.get("v") || null },
    safeEnvNamesOnly: Object.keys(s666BoolEnv(env, [
      "ADMIN_AUTH_VERIFY_URL", "ADMIN_AUTH_LOGIN_URL",
      "GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH",
      "PLAYER_ALERT_BACKEND_URL", "DISCORD_WEBHOOK_URL", "DISCORD_WEBHOOK",
    ])).filter((k) => env && env[k]),
    routes: s666RouteTable(),
    modules: s666ModuleStatus(env).modules,
    warnings: [
      "No secret values are displayed here.",
      "If Admin opens Hello World, the Admin button is navigating to Auth/PW worker instead of opening local overlay."
    ]
  });
}

function diagnosticAccessAllowed(request, env){
  if(String(env?.ENABLE_PUBLIC_DEBUG || "").toLowerCase() === "true") return true;
  const expected = String(env?.DEBUG_TOKEN || "").trim();
  if(!expected) return false;
  const auth = String(request.headers.get("authorization") || "").trim();
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = String(request.headers.get("x-debug-token") || bearer || "").trim();
  return provided && timingSafeEqualText(provided, expected);
}

function apiNotFound(pathname){
  return s666Json({ok:false,error:"not_found",path:pathname},404);
}

function requestAcceptsHtml(request){
  const accept = String(request.headers.get("accept") || "").toLowerCase();
  return accept.includes("text/html") || accept === "" || accept.includes("*/*");
}

export default {
  async fetch(request, env, ctx){

    const __darkDancerResponse = await darkDancerResponse(request, env);
    if (__darkDancerResponse) return __darkDancerResponse;
const url=new URL(request.url);
    if(isVelunaPlayerPath(url.pathname)) return await serveVelunaPlayer(request, env);
    if (url.pathname === "/health") return s666LiveHealth(request, env);
    if (url.pathname === "/api/runtime-config/status" && (request.method === "GET" || request.method === "HEAD")) {
      const runtime = await loadRadioRuntimeConfig(request, env, true);
      return s666Json({
        ok: true,
        source: runtime.source,
        schema: runtime.value.schema || null,
        version: runtime.value.version || null,
        updatedAt: runtime.value.updatedAt || null,
        primaryStream: runtime.value.primaryStreams[0] || null,
        backupStream: runtime.value.backupStreams[0] || null,
        emergencyStream: runtime.value.emergencyStreams[0] || null,
        metadataUpstreamCount: runtime.value.metadataUpstreams.length
      });
    }
    if (["/debug", "/debug/routes", "/debug/modules"].includes(url.pathname) && !diagnosticAccessAllowed(request, env)) return apiNotFound(url.pathname);
    if (url.pathname === "/debug") return s666LiveDebug(request, env);
    if (url.pathname === "/debug/routes") return s666Json({ ok: true, version: ROUTE_LIVE_DEBUG_VERSION, routes: s666RouteTable() });
    if (url.pathname === "/debug/modules") return s666Json(s666ModuleStatus(env));

    const radioAdminConfigResponse = await handleRadioAdminConfigAddon(request, env);
    if (radioAdminConfigResponse) return radioAdminConfigResponse;

    const skipResponse = await handleSkipApi(request, env);
    if (skipResponse) return skipResponse;

    const playerAlertV152Response = await handlePlayerAlertV152(request, env);
    if (playerAlertV152Response) return playerAlertV152Response;
    // DISCORD_ADDON_V3_SAFE_ROUTE: nur /api/discord/* wird abgefangen. Stream/Player/Notfallplayer bleiben unberührt.
    const discordV3Response = await handleDiscordNotifyV3(request, env);
    if (discordV3Response) return discordV3Response;

    if((url.pathname==="/" || url.pathname==="/index.html") && url.searchParams.get("player")!=="internal"){
      return await serveExternalIndex(request, env);
    }

    if(url.pathname==="/extern" || url.pathname==="/extern/"){
      return await serveExternalIndex(request, env);
    }
    if(url.pathname.startsWith("/extern/")){
      return await fetchExternalAsset(url.pathname, request, env);
    }
    if(url.pathname==="/external-player" || url.pathname==="/external-player/"){
      return await serveExternalIndex(request, env);
    }
    if(url.pathname.startsWith("/external-player/")){
      return await fetchExternalAsset(url.pathname, request, env);
    }

    // Interner Player explizit direkt erreichbar halten.
    if(url.pathname==="/internal" || url.pathname==="/internal/"){
      return new Response(HTML,{status:200,headers:{"content-type":"text/html; charset=UTF-8"}});
    }

    // Metadaten-Proxy NICHT umbauen, damit iPhone-App und bestehende Clients stabil bleiben.
    if(url.pathname==="/api/nowplaying"){
      const metadata = await fetchMetadataProxyPayload(request, env);
      if(metadata.ok){
        return new Response(metadata.payload,{status:metadata.status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store","access-control-allow-origin":"*","x-radio-proxy":"666soundsdesign-worker","x-radio-meta-source":metadata.source,"x-radio-config-source":metadata.configSource}});
      }
      return new Response(JSON.stringify({error:"metadata_proxy_failed",detail:metadata.error}),{status:502,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store","access-control-allow-origin":"*"}});
    }

    // STREAM_FAILOVER_REPAIR_v1:
    // /stream versucht MAIN und fällt bei HTTP-Fehler/Timeout automatisch auf BACKUP zurück.
    // /fallback-stream versucht Backup-Varianten gezielt.
    if(url.pathname==="/stream"){
      return await proxyStreamFailover(request, env)
    }
    if(url.pathname==="/fallback-stream"){
      return await proxyFallbackStream(request, env)
    }

    // Interner Notfall-Player bleibt komplett erhalten.
    if(url.pathname==="/assets/assets/icons/internal-icon.png"){
      const internalIcon = await serveProjectAsset(request, env, "/assets/veluna/icons/icon-512x512.png");
      if(internalIcon) return internalIcon;
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

    if(url.pathname==="/dashboard" || url.pathname==="/dashboard/"){
      const dashboard = await serveProjectAsset(request, env, "/dashboard/index.html");
      if(dashboard) return dashboard;
    }

    if(request.method === "GET" || request.method === "HEAD"){
      const localAsset = await serveProjectAsset(request, env, url.pathname);
      if(localAsset) return localAsset;
    }

    if(url.pathname.startsWith("/api/")) return apiNotFound(url.pathname);
    if(request.method !== "GET" && request.method !== "HEAD") {
      return s666Json({ok:false,error:"method_not_allowed",allowed:["GET","HEAD"]},405);
    }
    const lastSegment = url.pathname.split("/").pop() || "";
    if(lastSegment.includes(".") || !requestAcceptsHtml(request)) {
      return new Response("Not found", {status:404,headers:{"content-type":"text/plain; charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
    }
    return await serveExternalIndex(request, env);
  }
};
