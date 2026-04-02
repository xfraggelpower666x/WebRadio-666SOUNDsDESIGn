
(function(){
  const WORKER="https://666soundsdesign.workers.dev";
  const STREAM_URL=WORKER+"/stream";
  const NP_URL=WORKER+"/nowplaying";
  const LISTENERS_URL=WORKER+"/listeners";
  const HISTORY_URL=WORKER+"/history";
  const DJ_URL=WORKER+"/dj";
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function createShell(){
    const root=document.createElement("section");
    root.className="sd-radio-shell";
    root.innerHTML=`
      <section class="sd-player sd-glass">
        <div class="sd-player-controls">
          <button class="sd-round-btn" data-sd-play>▶</button>
          <button class="sd-round-btn" data-sd-pause>❚❚</button>
          <button class="sd-round-btn" data-sd-stop>■</button>
        </div>
        <div class="sd-trackbox">
          <div class="sd-kicker">NOW PLAYING</div>
          <div class="sd-track" data-sd-track>Loading track...</div>
          <div class="sd-dj" data-sd-dj>DJ loading...</div>
        </div>
        <div class="sd-timing">
          <span data-sd-time-now>00:00</span>
          <div class="sd-progress"><div class="sd-progress-bar" data-sd-progress></div></div>
          <span data-sd-time-max>LIVE</span>
        </div>
        <div class="sd-volume-wrap">
          <label for="sdVolume">VOL</label>
          <input id="sdVolume" data-sd-volume type="range" min="0" max="1" step="0.01" value="0.7">
        </div>
      </section>
      <section class="sd-stats">
        <article class="sd-stat sd-glass"><div class="sd-label">LISTENERS</div><div class="sd-value" data-sd-listeners>0</div></article>
        <article class="sd-stat sd-glass"><div class="sd-label">STREAM STATUS</div><div class="sd-value" data-sd-status>IDLE</div></article>
        <article class="sd-stat sd-glass"><div class="sd-label">ENDPOINT</div><div class="sd-value" style="font-size:14px;word-break:break-all;">/stream</div></article>
      </section>
      <section class="sd-viz sd-glass">
        <div class="sd-viz-head">AUDIO REACTIVE SYSTEM</div>
        <canvas data-sd-spectrum></canvas>
        <canvas data-sd-wave></canvas>
        <div class="sd-meter" data-sd-meter></div>
      </section>
      <section class="sd-panels">
        <article class="sd-panel sd-glass"><h3>TRACK HISTORY</h3><ul class="sd-history" data-sd-history></ul></article>
        <article class="sd-panel sd-glass"><h3>DJ</h3><p data-sd-dj-panel>Loading DJ info...</p></article>
        <article class="sd-panel sd-glass"><h3>STREAM INFO</h3><p>This addon is built to complement the main project, not replace it.</p></article>
        <article class="sd-panel sd-glass"><h3>INTEGRATION MODE</h3><p>Keep existing design and data first. Add this block after your hero or inside the stream section.</p></article>
      </section>`;
    return root;
  }
  function createSticky(){
    const root=document.createElement("div");
    root.className="sd-sticky-player sd-glass";
    root.innerHTML=`
      <button class="sd-round-btn small" data-sd-sticky-play>▶</button>
      <div>
        <div class="sd-sticky-track" data-sd-sticky-track>Loading...</div>
        <div class="sd-sticky-dj" data-sd-sticky-dj>DJ loading...</div>
      </div>
      <div class="sd-sticky-progress"><div class="sd-sticky-progress-bar" data-sd-sticky-progress></div></div>
      <div class="sd-sticky-status" data-sd-sticky-status>IDLE</div>`;
    return root;
  }
  const target=document.querySelector("[data-666-radio-target]")||document.body;
  const shell=createShell();
  const sticky=createSticky();
  target.appendChild(shell);
  document.body.appendChild(sticky);

  const audio=new Audio(STREAM_URL);
  audio.crossOrigin="anonymous";
  audio.preload="none";

  const els={
    play:$("[data-sd-play]",shell), pause:$("[data-sd-pause]",shell), stop:$("[data-sd-stop]",shell),
    stickyPlay:$("[data-sd-sticky-play]",sticky), volume:$("[data-sd-volume]",shell),
    track:$("[data-sd-track]",shell), dj:$("[data-sd-dj]",shell), djPanel:$("[data-sd-dj-panel]",shell),
    listeners:$("[data-sd-listeners]",shell), status:$("[data-sd-status]",shell), stickyStatus:$("[data-sd-sticky-status]",sticky),
    stickyTrack:$("[data-sd-sticky-track]",sticky), stickyDj:$("[data-sd-sticky-dj]",sticky),
    progress:$("[data-sd-progress]",shell), stickyProgress:$("[data-sd-sticky-progress]",sticky),
    spectrum:$("[data-sd-spectrum]",shell), wave:$("[data-sd-wave]",shell), meter:$("[data-sd-meter]",shell), history:$("[data-sd-history]",shell)
  };
  for(let i=0;i<28;i++) els.meter.appendChild(document.createElement("div"));
  audio.volume=0.7;

  function setStatus(t){ els.status.textContent=t; els.stickyStatus.textContent=t; }
  function syncMeta(title,dj){ els.track.textContent=title; els.dj.textContent=dj; els.stickyTrack.textContent=title; els.stickyDj.textContent=dj; els.djPanel.textContent=dj; }
  syncMeta("Loading track...","Loading DJ...");
  setStatus("IDLE");

  async function startAudio(){
    try{ await audio.play(); setStatus("PLAYING"); initAudio(); els.play.textContent="❚❚"; els.stickyPlay.textContent="❚❚"; }
    catch(e){ setStatus("BLOCKED"); console.error(e); }
  }
  function pauseAudio(){ audio.pause(); setStatus("PAUSED"); els.play.textContent="▶"; els.stickyPlay.textContent="▶"; }
  function stopAudio(){ audio.pause(); try{audio.currentTime=0;}catch(e){} setStatus("STOPPED"); els.play.textContent="▶"; els.stickyPlay.textContent="▶"; els.progress.style.width="0%"; els.stickyProgress.style.width="0%"; }

  els.play.onclick=()=>audio.paused?startAudio():pauseAudio();
  els.pause.onclick=()=>pauseAudio();
  els.stop.onclick=()=>stopAudio();
  els.stickyPlay.onclick=()=>audio.paused?startAudio():pauseAudio();
  els.volume.oninput=e=>audio.volume=parseFloat(e.target.value);

  async function safeJson(url){ const r=await fetch(url,{cache:"no-store"}); return await r.json(); }
  async function loadNowPlaying(){ try{ const j=await safeJson(NP_URL); syncMeta(j.title||j.now_playing||j.song||"Live Stream", j.dj||j.presenter||"666SOUNDsDESIGn"); }catch(e){console.error(e);} }
  async function loadListeners(){ try{ const j=await safeJson(LISTENERS_URL); els.listeners.textContent=(typeof j==="object")?(j.listeners??j.count??j.current??0):j; }catch(e){console.error(e);} }
  async function loadDj(){ try{ const j=await safeJson(DJ_URL); els.djPanel.textContent=(typeof j==="object")?(j.dj??j.name??JSON.stringify(j)):(j||"666SOUNDsDESIGn"); }catch(e){console.error(e);} }
  async function loadHistory(){ try{ const j=await safeJson(HISTORY_URL); els.history.innerHTML=""; (Array.isArray(j)?j:[]).slice(0,10).forEach(item=>{ const li=document.createElement("li"); li.textContent=item.title||item.song||item.track||String(item); els.history.appendChild(li); }); }catch(e){console.error(e);} }

  setInterval(loadNowPlaying,5000); setInterval(loadListeners,10000); setInterval(loadHistory,15000); setInterval(loadDj,15000);
  loadNowPlaying(); loadListeners(); loadHistory(); loadDj();

  let audioCtx, analyser, dataArray, specCtx, waveCtx;
  function resizeCanvas(c){ c.width=c.clientWidth*devicePixelRatio; c.height=c.clientHeight*devicePixelRatio; }
  function initAudio(){
    if(audioCtx) return;
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const src=audioCtx.createMediaElementSource(audio);
    analyser=audioCtx.createAnalyser(); analyser.fftSize=256;
    src.connect(analyser); analyser.connect(audioCtx.destination);
    dataArray=new Uint8Array(analyser.frequencyBinCount);
    specCtx=els.spectrum.getContext("2d"); waveCtx=els.wave.getContext("2d");
    resizeCanvas(els.spectrum); resizeCanvas(els.wave);
    window.addEventListener("resize",()=>{ resizeCanvas(els.spectrum); resizeCanvas(els.wave); });
    animate();
  }
  function updateProgress(){
    if(Number.isFinite(audio.duration) && audio.duration>0){ const pct=(audio.currentTime/audio.duration)*100; els.progress.style.width=pct+"%"; els.stickyProgress.style.width=pct+"%"; }
    else{ const livePct=(Date.now()/90)%100; els.progress.style.width=livePct+"%"; els.stickyProgress.style.width=livePct+"%"; }
  }
  function animate(){
    requestAnimationFrame(animate);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    specCtx.clearRect(0,0,els.spectrum.width,els.spectrum.height);
    specCtx.fillStyle="#02050a"; specCtx.fillRect(0,0,els.spectrum.width,els.spectrum.height);
    let x=0, barWidth=(els.spectrum.width/dataArray.length)*1.7;
    for(let i=0;i<dataArray.length;i++){ const h=dataArray[i]*1.1; specCtx.fillStyle="rgba(0,210,255,.95)"; specCtx.fillRect(x, els.spectrum.height-h, barWidth, h); x+=barWidth+2; }
    waveCtx.clearRect(0,0,els.wave.width,els.wave.height);
    waveCtx.fillStyle="#02050a"; waveCtx.fillRect(0,0,els.wave.width,els.wave.height);
    waveCtx.beginPath();
    for(let i=0;i<dataArray.length;i++){ const xx=i*(els.wave.width/dataArray.length); const yy=els.wave.height-(dataArray[i]*1.1); if(i===0) waveCtx.moveTo(xx,yy); else waveCtx.lineTo(xx,yy); }
    waveCtx.strokeStyle="#00d2ff"; waveCtx.lineWidth=3; waveCtx.stroke();
    $$(".sd-meter div",shell).forEach((bar,idx)=>{ bar.style.height=Math.max(8,dataArray[idx%dataArray.length]*0.5)+"px"; });
    if(!audio.paused) updateProgress();
  }
})();
