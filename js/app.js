const STREAM_CONFIG = {
  stream_url: "/stream",
  fallback_stream_url: "/fallback-stream",
  metadata_url: "/api/nowplaying",
  poll_interval_ms: 8000,
  listener_capacity: 250,
  use_webhook: false
};

const overlay=document.getElementById("bootOverlay");
const bootButton=document.getElementById("bootButton");
const progressBar=document.getElementById("bootProgress");
const progressText=document.getElementById("bootPercent");
const playBtn=document.getElementById("playBtn");
const pauseBtn=document.getElementById("pauseBtn");
const reconnectBtn=document.getElementById("reconnectBtn");
const muteBtn=document.getElementById("muteBtn");
const volumeRange=document.getElementById("volumeRange");
const historyToggle=document.getElementById("historyToggle");
const historyPanel=document.getElementById("historyPanel");
const metaLamp=document.getElementById("metaLamp");
const audioLamp=document.getElementById("audioLamp");
const sourceLamp=document.getElementById("sourceLamp");
const healthLamp=document.getElementById("healthLamp");
const sourceText=document.getElementById("sourceText");
const stateText=document.getElementById("stateText");
const healthText=document.getElementById("healthText");
const audioText=document.getElementById("audioText");
const trackTitle=document.getElementById("trackTitle");
const metaText=document.getElementById("metaText");
const listenersText=document.getElementById("listenersText");
const bitrateText=document.getElementById("bitrateText");
const djText=document.getElementById("djText");
const historyList=document.getElementById("historyList");
const volumeHint=document.getElementById("volumeHint");
const audio=document.getElementById("radio");

let booted=false,usingFallback=false,muted=false,metadataTimer=null,healthTimer=null,lastTitle="Loading metadata...",historyOpen=false;

function setLamp(el,state){if(!el)return;el.classList.remove("lamp-green","lamp-red","lamp-cyan");el.classList.add(state)}
function pickValue(obj,keys,fallback=""){for(const key of keys){const value=obj?.[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value}return fallback}
function renderHistory(items){if(!historyList)return;historyList.innerHTML="";if(!Array.isArray(items)||!items.length){historyList.innerHTML="<li>No history loaded</li>";return}items.slice(0,12).forEach((item)=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));historyList.appendChild(li)})}
async function checkHealth(){try{const res=await fetch("/health",{cache:"no-store"});if(!res.ok)throw new Error("health");healthText.textContent="Online";setLamp(healthLamp,"lamp-green")}catch{healthText.textContent="Offline";setLamp(healthLamp,"lamp-red")}}
async function fetchMetadata(){try{const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});if(!res.ok)throw new Error("metadata");const data=await res.json();const title=String(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"],lastTitle||"Live Stream"));lastTitle=title;trackTitle.textContent=title;const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);listenersText.textContent=`${Number.isFinite(listeners)?listeners:0} / ${STREAM_CONFIG.listener_capacity}`;const bitrate=pickValue(data,["bitrate"],"Unknown");bitrateText.textContent=bitrate?`${String(bitrate)} kbps`:"Unknown";const dj=pickValue(data,["djusername","djstatus","client"],"AutoDJ");djText.textContent=String(dj);renderHistory(pickValue(data,["history"],[]));metaText.textContent="Online";setLamp(metaLamp,"lamp-green")}catch{trackTitle.textContent=lastTitle||"Metadata unavailable";metaText.textContent="Offline";setLamp(metaLamp,"lamp-red")}}
function startMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);fetchMetadata();metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms)}
async function tryPlayPrimary(){audio.src=STREAM_CONFIG.stream_url;await audio.play();usingFallback=false;sourceText.textContent="Primary";setLamp(sourceLamp,"lamp-cyan")}
async function tryPlayFallback(){audio.src=STREAM_CONFIG.fallback_stream_url;await audio.play();usingFallback=true;sourceText.textContent="Fallback";setLamp(sourceLamp,"lamp-red")}
async function safePlay(){try{await tryPlayPrimary();stateText.textContent="Playing";audioText.textContent="Active";setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e1){try{await tryPlayFallback();stateText.textContent="Playing";audioText.textContent="Fallback Active";setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e2){stateText.textContent="Audio Error";audioText.textContent="Failed";setLamp(audioLamp,"lamp-red");return false}}}
function runBootSequence(){return new Promise((resolve)=>{let percent=0;const timer=setInterval(()=>{percent+=4;if(percent>100)percent=100;if(progressBar)progressBar.style.width=`${percent}%`;if(progressText)progressText.textContent=`${percent}%`;if(percent>=100){clearInterval(timer);resolve()}},42)})}
bootButton?.addEventListener("click",async()=>{if(booted)return;booted=true;bootButton.disabled=true;await runBootSequence();overlay?.classList.add("hidden");await safePlay()});
playBtn?.addEventListener("click",async()=>{await safePlay()});
pauseBtn?.addEventListener("click",()=>{audio.pause();stateText.textContent="Paused";audioText.textContent="Paused";setLamp(audioLamp,"lamp-red")});
reconnectBtn?.addEventListener("click",async()=>{audio.pause();audio.src="";await safePlay()});
muteBtn?.addEventListener("click",()=>{muted=!muted;audio.muted=muted;muteBtn.textContent=muted?"Unmute":"Mute";volumeHint.textContent=muted?"Muted":"Live Volume"});
volumeRange?.addEventListener("input",()=>{audio.volume=Number(volumeRange.value);volumeHint.textContent=`Level ${(Number(volumeRange.value)*100).toFixed(0)}%`});
historyToggle?.addEventListener("click",()=>{historyOpen=!historyOpen;historyPanel?.classList.toggle("hidden",!historyOpen)});
audio?.addEventListener("playing",()=>{stateText.textContent="Playing";audioText.textContent=usingFallback?"Fallback Active":"Active";setLamp(audioLamp,"lamp-green")});
audio?.addEventListener("error",async()=>{if(!usingFallback){try{await tryPlayFallback();stateText.textContent="Playing";audioText.textContent="Fallback Active";setLamp(audioLamp,"lamp-green");startMetadataLoop();return}catch(e){}}stateText.textContent="Audio Error";audioText.textContent="Failed";setLamp(audioLamp,"lamp-red")});

const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(isiOS&&volumeHint)volumeHint.textContent="Use iPhone buttons";
setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-red");setLamp(sourceLamp,"lamp-cyan");setLamp(healthLamp,"lamp-red");
sourceText.textContent="Primary";stateText.textContent="Ready";checkHealth();healthTimer=setInterval(checkHealth,10000);fetchMetadata();
