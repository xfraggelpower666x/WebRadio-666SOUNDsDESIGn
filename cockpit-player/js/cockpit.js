/*
==========================================
DATEI: cockpit-player/js/cockpit.js
GEÄNDERT: 2026-04-21
ZWECK: Minimal funktionaler Cockpit-Player v31.
NUTZT: /stream und /api/nowplaying des bestehenden Workers.
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

audio.src = '/stream';
audio.volume = 1;

let playing = false;
let muted = false;

function setProgress(percent){
  const p = Math.max(8, Math.min(92, percent));
  sliderFill.style.width = `${p}%`;
  sliderKnob.style.left = `${p}%`;
}

function animateBars(){
  const run = playing ? 1 : 0.35;
  [...leftBars, ...rightBars].forEach((bar, i) => {
    const t = Date.now() / 180;
    const v = 18 + Math.abs(Math.sin(t + i * 0.45)) * 74 * run;
    bar.style.height = `${v}%`;
  });
  setProgress(playing ? 38 + Math.abs(Math.sin(Date.now()/450))*28 : 26);
  requestAnimationFrame(animateBars);
}
requestAnimationFrame(animateBars);

async function refreshMeta(){
  try{
    const res = await fetch('/api/nowplaying', { cache: 'no-store' });
    if(!res.ok) throw new Error('meta failed');
    const data = await res.json();

    const title = String(
      data.song || data.title || data.songtitle || data.currentSong || data.track || data.now_playing || 'Live Stream'
    )
      .replace(/^\s*unknown\s*title\s*[-:|–—]*\s*/i, '')
      .replace(/^\s*no\s*dj\s*[-:|–—]*\s*/i, '')
      .trim() || 'Live Stream';

    trackText.textContent = title;

    const image = data.image || data.cover || data.artwork || data.albumart || '';
    if(image){
      coverImage.src = image;
      coverImage.classList.remove('hidden');
      fallbackVisual.classList.add('hidden');
    } else {
      coverImage.classList.add('hidden');
      fallbackVisual.classList.remove('hidden');
    }
  }catch(e){
    trackText.textContent = 'Live Stream';
    coverImage.classList.add('hidden');
    fallbackVisual.classList.remove('hidden');
  }
}
refreshMeta();
setInterval(refreshMeta, 8000);

playBtn.addEventListener('click', async () => {
  if(audio.paused){
    try{
      await audio.play();
      playing = true;
      playBtn.textContent = 'PAUSE';
    }catch(e){}
  }else{
    audio.pause();
    playing = false;
    playBtn.textContent = 'PLAY';
  }
});

muteBtn.addEventListener('click', () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? 'MUTE' : 'VOL';
});

document.getElementById('prevBtn').addEventListener('click', () => setProgress(22));
document.getElementById('nextBtn').addEventListener('click', () => setProgress(76));
document.getElementById('outBtn').addEventListener('click', () => setProgress(50));

audio.addEventListener('playing', () => { playing = true; playBtn.textContent = 'PAUSE'; });
audio.addEventListener('pause', () => { playing = false; playBtn.textContent = 'PLAY'; });
