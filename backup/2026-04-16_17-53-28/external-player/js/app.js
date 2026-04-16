// ==========================================
// DATEI: external-player/js/app.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Frontend-Logik des externen Standard-Players.
// ÄNDERUNG: Kopfzeile ergänzt für bessere Nachvollziehbarkeit im Projekt.
// ==========================================

import { STREAM_CONFIG } from "../config/stream.config.js";

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
const leftMeterFill=document.getElementById("leftMeterFill");
const rightMeterFill=document.getElementById("rightMeterFill");
const coverImage=document.getElementById("coverImage");
const titleText=document.getElementById("titleText");
const artistText=document.getElementById("artistText");
const streamNameText=document.getElementById("streamNameText");
const genreText=document.getElementById("genreText");
const serverText=document.getElementById("serverText");

let booted=false,usingFallback=false,muted=false,metadataTimer=null,lastTitle="Loading metadata...",historyOpen=false;
let audioContext=null,mediaSourceNode=null,analyser=null,analyserData=null,meterAnim=null;
const FALLBACK_COVER="./assets/images/fallback-cover.png";
const DEFAULT_DJ="666SOUNDsDESIGn DJ";

function setLamp(el,state){if(!el)return;el.classList.remove("lamp-green","lamp-red","lamp-cyan");el.classList.add(state)}
function setStatus(text){if(streamStatus)streamStatus.textContent=text}
function setSource(isFallback){usingFallback=isFallback;if(sourceLabel)sourceLabel.textContent=isFallback?"Fallback":"Primary";if(fallbackText)fallbackText.textContent=isFallback?"Active":"Standby";setLamp(sourceLamp,isFallback?"lamp-red":"lamp-cyan")}
function setMetadataStatus(text){if(metaText)metaText.textContent=text}
function pickValue(obj,keys,fallback=""){for(const key of keys){const value=obj?.[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value}return fallback}
function setMeterHeights(left,right){if(leftMeterFill)leftMeterFill.style.height=`${Math.max(2,Math.min(100,left))}%`;if(rightMeterFill)rightMeterFill.style.height=`${Math.max(2,Math.min(100,right))}%`}
function safeText(v,fallback=""){const s=String(v??"").trim();return s||fallback}
function splitTitle(title){const t=safeText(title,"Live Stream");if(t.includes(" - ")){const parts=t.split(" - ");return {artist:parts.shift(),title:parts.join(" - ")};}return {artist:"",title:t};}
function detectDJ(data){const raw=safeText(pickValue(data,["djusername","dj","dj_name","djstatus","client","source","autodj","servergenre"],""),"");const lower=raw.toLowerCase();if(!raw)return DEFAULT_DJ;if(lower.includes("autodj")||lower.includes("auto dj")||lower==="none"||lower==="unknown"||lower==="no dj")return DEFAULT_DJ;return raw}
function pickImageUrl(data){return safeText(pickValue(data,["artwork","cover","cover_url","image","imageurl","thumbnail","thumb","logo","picture","dj_image","album_art","albumart","art"],""),"")}
function normalizeTitle(data){return safeText(pickValue(data,["song","title","songtitle","currentSong","track","now_playing"],lastTitle||"Live Stream"),"Live Stream")}
function renderHistory(items){if(!historyList)return;historyList.innerHTML="";if(!Array.isArray(items)||!items.length){const li=document.createElement("li");li.textContent="No history loaded";historyList.appendChild(li);return}items.slice(0,12).forEach((item)=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(pickValue(item,["song","title","track","name"],"Unknown track"));historyList.appendChild(li)})}
function applyCover(url){if(!coverImage)return;coverImage.src=safeText(url,FALLBACK_COVER);coverImage.onerror=()=>{coverImage.src=FALLBACK_COVER}}
function applyMetadata(data){const fullTitle=normalizeTitle(data);lastTitle=fullTitle;if(nowPlaying)nowPlaying.textContent=fullTitle;const parts=splitTitle(fullTitle);if(titleText)titleText.textContent=parts.title||fullTitle;if(artistText)artistText.textContent=parts.artist||detectDJ(data);const listeners=Number.parseInt(pickValue(data,["listeners"],0),10);const bitrate=pickValue(data,["bitrate"],"Unknown");const djStatus=detectDJ(data);const streamName=safeText(pickValue(data,["servertitle","streamtitle","name","icy_name","server_name"],"666SOUNDsDESIGn Radio"),"666SOUNDsDESIGn Radio");const genre=safeText(pickValue(data,["genre","servergenre","icy_genre"],"Unknown"),"Unknown");const server=safeText(pickValue(data,["description","serverdescription","server","site","url"],"Live Stream"),"Live Stream");if(listenersText)listenersText.textContent=`${Number.isFinite(listeners)?listeners:0} / ${STREAM_CONFIG.listener_capacity}`;if(bitrateText)bitrateText.textContent=bitrate?`${String(bitrate)} kbps`:"Unknown";if(djText)djText.textContent=djStatus;if(streamNameText)streamNameText.textContent=streamName;if(genreText)genreText.textContent=genre;if(serverText)serverText.textContent=server;renderHistory(pickValue(data,["history"],[]));applyCover(pickImageUrl(data) || FALLBACK_COVER);}
async function fetchMetadata(){try{const res=await fetch(STREAM_CONFIG.metadata_url,{cache:"no-store"});if(!res.ok)throw new Error("metadata fetch failed");const data=await res.json();applyMetadata(data);setMetadataStatus("Online");setLamp(metaLamp,"lamp-green")}catch(err){if(nowPlaying)nowPlaying.textContent=lastTitle||"Metadata unavailable";if(titleText)titleText.textContent=lastTitle||"Metadata unavailable";if(artistText)artistText.textContent=DEFAULT_DJ;if(djText)djText.textContent=DEFAULT_DJ;if(streamNameText)streamNameText.textContent="666SOUNDsDESIGn Radio";if(genreText)genreText.textContent="Unknown";if(serverText)serverText.textContent="Live Stream";setMetadataStatus("Offline");setLamp(metaLamp,"lamp-red");applyCover(FALLBACK_COVER)}}
function startMetadataLoop(){if(metadataTimer)clearInterval(metadataTimer);fetchMetadata();metadataTimer=setInterval(fetchMetadata,STREAM_CONFIG.poll_interval_ms)}
async function setupAudioMeter(){try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)()}if(audioContext.state==="suspended"){await audioContext.resume()}if(!mediaSourceNode){mediaSourceNode=audioContext.createMediaElementSource(audio);analyser=audioContext.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0.84;analyserData=new Uint8Array(analyser.frequencyBinCount);mediaSourceNode.connect(analyser);analyser.connect(audioContext.destination)}if(!meterAnim){const tick=()=>{if(analyser&&analyserData){analyser.getByteFrequencyData(analyserData);const half=Math.floor(analyserData.length/2);let left=0,right=0;for(let i=0;i<half;i++)left+=analyserData[i];for(let i=half;i<analyserData.length;i++)right+=analyserData[i];left=(left/half)/255*100;right=(right/(analyserData.length-half))/255*100;setMeterHeights(left,right)}meterAnim=requestAnimationFrame(tick)};meterAnim=requestAnimationFrame(tick)}}catch(err){setMeterHeights(6,6)}}
async function tryPlayPrimary(){audio.src=STREAM_CONFIG.stream_url;await audio.play();setSource(false)}
async function tryPlayFallback(){audio.src=STREAM_CONFIG.fallback_stream_url;await audio.play();setSource(true)}
async function safePlay(){try{await setupAudioMeter();await tryPlayPrimary();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e1){try{await setupAudioMeter();await tryPlayFallback();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return true}catch(e2){setStatus("Audio Error");setLamp(audioLamp,"lamp-red");return false}}}
function runBootSequence(){return new Promise((resolve)=>{let percent=0;const timer=setInterval(()=>{percent+=4;if(percent>100)percent=100;if(progressBar)progressBar.style.width=`${percent}%`;if(progressText)progressText.textContent=`${percent}%`;if(percent>=100){clearInterval(timer);resolve()}},42)})}
bootButton?.addEventListener("click",async()=>{if(booted)return;booted=true;bootButton.disabled=true;await runBootSequence();overlay?.classList.add("hidden");await safePlay()});
playBtn?.addEventListener("click",async()=>{await safePlay()});
pauseBtn?.addEventListener("click",()=>{audio.pause();setStatus("Paused");setLamp(audioLamp,"lamp-red")});
reconnectBtn?.addEventListener("click",async()=>{audio.pause();audio.src="";await safePlay()});
muteBtn?.addEventListener("click",()=>{muted=!muted;audio.muted=muted;muteBtn.textContent=muted?"Unmute":"Mute"});
volumeRange?.addEventListener("input",()=>{audio.volume=Number(volumeRange.value)});
historyToggle?.addEventListener("click",()=>{historyOpen=!historyOpen;historyOverlay?.classList.toggle("hidden",!historyOpen)});
audio?.addEventListener("playing",async()=>{setStatus("Playing");setLamp(audioLamp,"lamp-green");await setupAudioMeter()});
audio?.addEventListener("pause",()=>{setMeterHeights(2,2)});
audio?.addEventListener("error",async()=>{if(!usingFallback){try{await setupAudioMeter();await tryPlayFallback();setStatus("Playing");setLamp(audioLamp,"lamp-green");startMetadataLoop();return}catch(e){}}setStatus("Audio Error");setLamp(audioLamp,"lamp-red");setMeterHeights(3,3)});
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);if(isiOS&&volumeHint)volumeHint.textContent="Use iPhone buttons";setLamp(metaLamp,"lamp-red");setLamp(audioLamp,"lamp-red");setLamp(sourceLamp,"lamp-cyan");setSource(false);setMetadataStatus("Loading...");setMeterHeights(2,2);applyCover(FALLBACK_COVER);if(djText)djText.textContent=DEFAULT_DJ;if(artistText)artistText.textContent=DEFAULT_DJ;fetchMetadata();
