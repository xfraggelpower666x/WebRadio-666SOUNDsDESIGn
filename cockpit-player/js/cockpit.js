/*
==========================================
DATEI: cockpit-player/js/cockpit.js
GEÄNDERT: 2026-04-21
VERSION: v33.4 TAP FIX REAL
ZWECK: Sauberer Start-Flow für den Cockpit-Player.
BASIS: Echter Stand aus deiner ZIP analysiert und dann gezielt ersetzt.
HINWEIS:
- Worker / Endpunkte bleiben unberührt
- Nutzt /stream und /api/nowplaying
- Start nur über sichtbares Start-Overlay
==========================================
*/

const audio = document.getElementById('radio');
const playBtn = document.getElementById('playBtn');
const muteBtn = document.getElementById('muteBtn');
const trackText = document.getElementById('trackText');
const coverImage = document.getElementById('coverImage');
const fallbackVisual = document.getElementById('fallbackVisual');
const sliderFill = document.getElementById('sliderFill');
const sliderKnob = document.getElementById('sliderKnob');
const leftBars = Array.from(document.querySelectorAll('#leftBars .bar'));
const rightBars = Array.from(document.querySelectorAll('#rightBars .bar'));
const startOverlay = document.getElementById('startOverlay');
const bootOverlay = document.getElementById('bootOverlay');

/*
==========================================
ZUSATZ: v33.5 ENDPOINT FIX
ZWECK: Cockpit-Player kann auf GitHub Pages laufen und trotzdem die
       Worker-Endpunkte nutzen. Relative /stream funktioniert auf
       xfraggelpower666x.github.io nicht, weil dort kein Worker liegt.
==========================================
*/
const WORKER_BASE = location.hostname.includes('github.io')
  ? 'https://webradio.666soundsdesign-broadcaster.com'
  : '';

const STREAM_ENDPOINT = `${WORKER_BASE}/stream`;
const META_ENDPOINT = `${WORKER_BASE}/api/nowplaying`;

audio.src = STREAM_ENDPOINT;
audio.volume = 1;

let playing = false;
let muted = false;
let initialized = false;
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;
let stallTimer = null;
let reconnecting = false;
let rafId = 0;

function setProgress(percent){
  const p = Math.max(8, Math.min(92, percent));
  if (sliderFill) sliderFill.style.width = `${p}%`;
  if (sliderKnob) sliderKnob.style.left = `${p}%`;
}

function updateBoot(value){
  const bar = document.getElementById('bootBar');
  const txt = document.getElementById('bootText');
  if (bar) bar.style.width = `${value}%`;
  if (txt) txt.textContent = `${value}%`;
}

function hideBoot(){
  if (bootOverlay) bootOverlay.style.display = 'none';
}

function showBoot(){
  if (bootOverlay) bootOverlay.style.display = 'flex';
}

function showFallbackVisual(){
  if (coverImage) coverImage.classList.add('hidden');
  if (fallbackVisual) fallbackVisual.classList.remove('hidden');
}

function showCover(url){
  if (!coverImage || !fallbackVisual) return;
  if (!url) {
    showFallbackVisual();
    return;
  }
  coverImage.src = url;
  coverImage.classList.remove('hidden');
  fallbackVisual.classList.add('hidden');
}

function setBarsFromData(){
  if (!analyser || !dataArray) return;

  analyser.getByteFrequencyData(dataArray);

  const bandsPerSide = Math.max(1, Math.floor(dataArray.length / 2 / 3));
  const leftData = dataArray.slice(0, Math.floor(dataArray.length / 2));
  const rightData = dataArray.slice(Math.floor(dataArray.length / 2));

  function avgChunk(arr, chunkIndex){
    const start = chunkIndex * bandsPerSide;
    const end = Math.min(arr.length, start + bandsPerSide);
    let total = 0;
    let count = 0;
    for(let i = start; i < end; i += 1){
      total += arr[i] || 0;
      count += 1;
    }
    return count ? total / count : 0;
  }

  leftBars.forEach((bar, i) => {
    const v = avgChunk(leftData, i);
    bar.style.height = `${18 + (v / 255) * 72}%`;
  });

  rightBars.forEach((bar, i) => {
    const v = avgChunk(rightData, i);
    bar.style.height = `${18 + (v / 255) * 72}%`;
  });

  const mixed = dataArray.reduce((a, b) => a + b, 0) / Math.max(1, dataArray.length);
  setProgress(20 + (mixed / 255) * 68);
}

function animateBarsIdle(){
  const run = playing ? 1 : 0.32;
  [...leftBars, ...rightBars].forEach((bar, i) => {
    const t = Date.now() / 180;
    const v = 18 + Math.abs(Math.sin(t + i * 0.45)) * 56 * run;
    bar.style.height = `${v}%`;
  });
  setProgress(playing ? 38 + Math.abs(Math.sin(Date.now()/450))*28 : 22);
}

function startVisualizerLoop(){
  if (rafId) cancelAnimationFrame(rafId);

  const loop = () => {
    if (analyser && playing) {
      setBarsFromData();
    } else {
      animateBarsIdle();
    }
    rafId = requestAnimationFrame(loop);
  };

  loop();
}

async function refreshMeta(){
  try{
    const res = await fetch(META_ENDPOINT, { cache: 'no-store' });
    if(!res.ok) throw new Error('meta failed');
    const data = await res.json();

    const title = String(
      data.song || data.title || data.songtitle || data.currentSong || data.track || data.now_playing || 'Live Stream'
    )
      .replace(/^\s*unknown\s*title\s*[-:|–—]*\s*/i, '')
      .replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '')
      .trim() || 'Live Stream';

    if (trackText) trackText.textContent = title;

    const image = data.image || data.cover || data.artwork || data.albumart || '';
    showCover(image);
  }catch(e){
    if (trackText) trackText.textContent = 'Live Stream';
    showFallbackVisual();
  }
}

function startMetaLoop(){
  refreshMeta();
  setInterval(refreshMeta, 8000);
}

function startStallMonitor(){
  let lastAudioTime = 0;
  if (stallTimer) clearInterval(stallTimer);

  stallTimer = setInterval(() => {
    if(!audio.paused){
      if(audio.currentTime === lastAudioTime){
        recoverStream();
      }
      lastAudioTime = audio.currentTime;
    }
  }, 3000);
}

async function recoverStream(){
  if(reconnecting) return;
  reconnecting = true;

  try{
    audio.pause();
    audio.src = '';
    await new Promise(r => setTimeout(r, 800));
    audio.src = STREAM_ENDPOINT;
    audio.load();

    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    await audio.play().catch(() => {});
  }catch(e){
    setTimeout(() => { reconnecting = false; recoverStream(); }, 2000);
    return;
  }

  reconnecting = false;
}

async function ensureAudioChain(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if(audioCtx.state === 'suspended'){
    await audioCtx.resume();
  }

  if(!sourceNode){
    sourceNode = audioCtx.createMediaElementSource(audio);
  }

  if(!analyser){
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
}

async function startSystem(){
  if(initialized) return;
  initialized = true;

  if (startOverlay) startOverlay.style.display = 'none';
  showBoot();

  try{
    updateBoot(10);
    await ensureAudioChain();

    updateBoot(40);
    audio.src = STREAM_ENDPOINT;
    audio.load();

    updateBoot(70);
    await audio.play().catch(() => {});

    updateBoot(100);
    setTimeout(hideBoot, 300);

    startVisualizerLoop();
    startMetaLoop();
    startStallMonitor();
  }catch(e){
    updateBoot(100);
    setTimeout(hideBoot, 300);
  }
}

if (startOverlay) {
  const startFromOverlay = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    startOverlay.style.pointerEvents = 'none';
    await startSystem();
  };

  startOverlay.addEventListener('pointerdown', startFromOverlay, { once: true, passive: false });
  startOverlay.addEventListener('touchstart', startFromOverlay, { once: true, passive: false });
  startOverlay.addEventListener('click', startFromOverlay, { once: true });
}

playBtn.addEventListener('click', async () => {
  try{
    if (!initialized) {
      await startSystem();
      return;
    }

    if(audio.paused){
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      await audio.play();
      playing = true;
      playBtn.textContent = 'PAUSE';
    }else{
      audio.pause();
      playing = false;
      playBtn.textContent = 'PLAY';
    }
  }catch(e){}
});

muteBtn.addEventListener('click', () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? 'MUTE' : 'VOL';
});

document.getElementById('prevBtn').addEventListener('click', () => setProgress(22));
document.getElementById('nextBtn').addEventListener('click', () => setProgress(76));
document.getElementById('outBtn').addEventListener('click', () => setProgress(50));

audio.addEventListener('playing', () => {
  playing = true;
  playBtn.textContent = 'PAUSE';
});

audio.addEventListener('pause', () => {
  playing = false;
  playBtn.textContent = 'PLAY';
});

audio.addEventListener('stalled', recoverStream);
audio.addEventListener('waiting', () => {});
audio.addEventListener('error', recoverStream);

startVisualizerLoop();
