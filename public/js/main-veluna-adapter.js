/* 666SOUNDsDESIGn — Main VELUNA Adapter v1.1.9
 * Canonical Main ticker geometry + exact shared VELUNA Central Boot reuse.
 * Main never creates a second boot surface and never calls central show() directly.
 * Ticker width is measured against the visible cover and the real History-button outer edge so idle/play states share one lane.
 * Runtime calibration compares the rendered ticker viewport edges to the desired cover/History viewport coordinates, eliminating containing-block/padding drift.
 * Every non-empty title owns the continuous marquee again; fitting titles are no longer forced static.
 * Marquee distance is measured as one complete rendered text/gap/separator segment so every repeat lands on the next full-title boundary without seam drift.
 * Repeated metadata refreshes do not restart an unchanged marquee, so titles complete their full cycle.
 * Main HUD LEDs are observational only and consume existing player/runtime truth without opening another network owner.
 * ResizeObserver keeps cover/History/ticker geometry synchronized without introducing a second layout owner.
 */
(function(){
  'use strict';
  if(window.__S666_MAIN_VELUNA_ADAPTER__) return;
  window.__S666_MAIN_VELUNA_ADAPTER__=true;
  if(document.body?.dataset?.velunaPage!=='main') return;

  const q=(s,r=document)=>r.querySelector(s);
  const CENTRAL_BOOT_SRC='/js/central-boot-screen.js?v=20260812-v200';
  const HEADER_ASSET_SRC='/assets/veluna/header/veluna-player-header.webp?v=20260830-shared-lyvra-header-v2';
  const TICKER_EDGE_INSET=18;
  const TICKER_COVER_GAP=20;
  const TICKER_MIN_WIDTH=96;
  const TICKER_REPEAT_GAP=48;
  const LED_STATE_CLASSES=['state-main','state-backup','state-api','state-fallback','state-external','state-internal','state-error','state-ok','state-warn','state-empty','state-stopped','state-paused','state-off','is-active'];
  let tickerAnimation=null;
  let layoutRaf=0;
  let reconnectTimer=0;
  let bufferEventState='';

  function ensureVelunaCentralBoot(){
    const central=window.S666CentralBootScreen;
    if(central){ try{central.bootOnce?.();}catch(_){} return; }
    const existing=Array.from(document.scripts).find(script=>String(script.src||'').includes('/js/central-boot-screen.js'));
    if(existing){
      if(existing.dataset.s666MainBootBound!=='1'){
        existing.dataset.s666MainBootBound='1';
        existing.addEventListener('load',()=>{try{window.S666CentralBootScreen?.bootOnce?.();}catch(_){}},{once:true});
      }
      return;
    }
    const script=document.createElement('script');
    script.src=CENTRAL_BOOT_SRC;
    script.async=false;
    script.dataset.s666MainVelunaCentralBoot='1';
    script.addEventListener('load',()=>{try{window.S666CentralBootScreen?.bootOnce?.();}catch(_){}},{once:true});
    (document.head||document.documentElement).appendChild(script);
  }

  function syncSharedHeaderAsset(){
    for(const image of document.querySelectorAll('#pcHeaderNewLogo,.hero-brand-image')){
      if(image.getAttribute('src')!==HEADER_ASSET_SRC) image.setAttribute('src',HEADER_ASSET_SRC);
    }
  }

  function measureLoopSegmentWidth(ticker,text){
    if(!ticker||!text) return 0;
    const probe=document.createElement('span');
    const first=document.createElement('span');
    const gap=document.createElement('span');
    const separator=document.createElement('span');
    const second=document.createElement('span');
    const style=getComputedStyle(ticker);
    probe.setAttribute('aria-hidden','true');
    probe.style.cssText='position:fixed;left:-10000px;top:-10000px;visibility:hidden;white-space:nowrap;pointer-events:none;';
    probe.style.font=style.font;
    probe.style.letterSpacing=style.letterSpacing;
    probe.style.fontKerning=style.fontKerning;
    first.textContent=text;
    gap.style.cssText=`display:inline-block;width:${TICKER_REPEAT_GAP}px;height:1px;`;
    separator.textContent=' ◆ ';
    second.textContent=text;
    probe.append(first,gap,separator,second);
    document.body.appendChild(probe);
    const firstRect=first.getBoundingClientRect();
    const secondRect=second.getBoundingClientRect();
    const width=Math.ceil(Math.max(0,secondRect.left-firstRect.left));
    probe.remove();
    return width;
  }

  function syncTickerGeometry(){
    const now=q('body[data-veluna-page="main"] .now-playing');
    const cover=q('.now-cover-wrap',now||document);
    const history=q('#historyToggle',now||document);
    const tickerWindow=q('.ticker-window',now||document);
    if(!now) return;
    const nowRect=now.getBoundingClientRect();
    let desiredLeft=nowRect.left+TICKER_EDGE_INSET;
    let desiredRight=nowRect.right-TICKER_EDGE_INSET;
    if(cover){
      const style=getComputedStyle(cover),rect=cover.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8&&rect.height>8) desiredLeft=Math.max(desiredLeft,rect.right+TICKER_COVER_GAP);
    }
    if(history){
      const style=getComputedStyle(history),rect=history.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8) desiredRight=Math.min(nowRect.right,Math.max(desiredLeft+TICKER_MIN_WIDTH,rect.right));
    }
    let left=Math.round(desiredLeft-nowRect.left);
    let width=Math.max(TICKER_MIN_WIDTH,Math.round(desiredRight-desiredLeft));
    now.style.setProperty('--s666-main-ticker-left',left+'px');
    now.style.setProperty('--s666-main-ticker-width',width+'px');
    if(tickerWindow){
      const rendered=tickerWindow.getBoundingClientRect();
      if(rendered.width>0){
        const leftError=desiredLeft-rendered.left,rightError=desiredRight-rendered.right;
        if(Math.abs(leftError)>0.5||Math.abs(rightError)>0.5){
          left=Math.round(left+leftError);
          width=Math.max(TICKER_MIN_WIDTH,Math.round(width+rightError-leftError));
          now.style.setProperty('--s666-main-ticker-left',left+'px');
          now.style.setProperty('--s666-main-ticker-width',width+'px');
        }
      }
    }
    const rightEdge=Math.round(left+width);
    now.style.setProperty('--s666-main-ticker-right',Math.max(0,Math.round(nowRect.width-rightEdge))+'px');
    now.style.setProperty('--s666-main-ticker-right-edge',rightEdge+'px');
  }

  function stopTickerAnimation(ticker){
    try{tickerAnimation?.cancel?.();}catch(_){}
    tickerAnimation=null;
    try{ for(const animation of ticker?.getAnimations?.()||[]) if(animation?.id==='s666-main-marquee') animation.cancel(); }catch(_){}
  }

  function startTickerAnimation(ticker,shift,duration){
    stopTickerAnimation(ticker);
    if(typeof ticker.animate==='function'){
      try{
        tickerAnimation=ticker.animate([{translate:'0 0'},{translate:`-${shift}px 0`}],{duration:Math.round(duration*1000),iterations:Infinity,easing:'linear'});
        tickerAnimation.id='s666-main-marquee';
        ticker.dataset.s666TickerDriver='waapi';
        return;
      }catch(_){}
    }
    ticker.dataset.s666TickerDriver='css';
  }

  function syncTickerMotion(){
    syncTickerGeometry();
    const windowNode=q('body[data-veluna-page="main"] .now-playing .ticker-window');
    const ticker=q('#nowPlayingTicker',windowNode||document);
    if(!windowNode||!ticker) return;
    ticker.classList.add('s666-veluna-main-ticker');
    const text=(ticker.textContent||'').replace(/\s+/g,' ').trim();
    const laneWidth=Math.round(windowNode.getBoundingClientRect().width||windowNode.clientWidth||0);
    const signature=text+'|'+laneWidth;
    const unchanged=ticker.dataset.s666TickerSignature===signature;
    const active=ticker.classList.contains('is-static')||(ticker.classList.contains('is-running')&&!!ticker.dataset.s666TickerDriver);
    if(unchanged&&active) return;
    ticker.dataset.s666TickerSignature=signature;
    ticker.classList.remove('is-running','is-static');
    ticker.style.removeProperty('--ticker-shift');
    ticker.style.removeProperty('--ticker-duration');
    ticker.style.removeProperty('--ticker-segment-width');
    ticker.removeAttribute('data-s666-marquee-text');
    ticker.removeAttribute('data-s666-ticker-driver');
    stopTickerAnimation(ticker);
    if(!text){ ticker.classList.add('is-static'); return; }
    const shift=Math.max(1,measureLoopSegmentWidth(ticker,text));
    const duration=Math.max(12,shift/42);
    ticker.setAttribute('data-s666-marquee-text',text);
    ticker.style.setProperty('--ticker-shift',shift+'px');
    ticker.style.setProperty('--ticker-segment-width',shift+'px');
    ticker.style.setProperty('--ticker-duration',duration.toFixed(2)+'s');
    ticker.classList.add('is-running');
    void ticker.offsetWidth;
    startTickerAnimation(ticker,shift,duration);
  }

  function scheduleTickerSync(){ cancelAnimationFrame(layoutRaf); layoutRaf=requestAnimationFrame(()=>requestAnimationFrame(syncTickerMotion)); }
  function installTicker(){
    const ticker=q('#nowPlayingTicker');
    if(!ticker) return;
    if(ticker.dataset.s666VelunaTicker!=='1'){
      ticker.dataset.s666VelunaTicker='1';
      const observer=new MutationObserver(scheduleTickerSync);
      observer.observe(ticker,{childList:true,characterData:true,subtree:true});
    }
    scheduleTickerSync();
  }

  function setObservedLed(id,state,title){
    const led=q('#'+id);
    if(!led) return;
    LED_STATE_CLASSES.forEach(name=>led.classList.remove(name));
    const safe=['main','backup','api','fallback','external','internal','error','ok','warn','empty','stopped','paused','off'].includes(state)?state:'empty';
    led.classList.add('state-'+safe);
    if(!['empty','off'].includes(safe)) led.classList.add('is-active');
    led.dataset.ledState=safe;
    if(title) led.title=title;
  }

  function syncWorkerLedFromExistingTruth(){
    const stream=q('#statusStream');
    const meta=q('#statusMeta');
    if(typeof navigator.onLine==='boolean'&&!navigator.onLine){
      setObservedLed('statusWorker','error','Worker — Browser offline');
      return;
    }
    if(stream?.classList.contains('state-error')||meta?.classList.contains('state-error')){
      setObservedLed('statusWorker','warn','Worker — bestehender Stream/Metadatenpfad meldet Fehler');
      return;
    }
    if(stream?.classList.contains('is-active')||meta?.classList.contains('is-active')){
      setObservedLed('statusWorker','main','Worker — bestehender Playerpfad aktiv');
      return;
    }
    setObservedLed('statusWorker','empty','Worker — wartet auf bestehende Runtime-Wahrheit');
  }

  function syncAudioHudLeds(reason='state'){
    const audio=q('#radio')||q('audio');
    if(!audio){
      setObservedLed('statusBuffer','error','Stream Buffer — kein Audioelement');
      setObservedLed('statusAudio','error','Audio-Core — Audioelement fehlt');
      return;
    }
    if(['playing','canplay','loadeddata'].includes(reason)) bufferEventState='';
    else if(['waiting','stalled','suspend'].includes(reason)) bufferEventState=reason;
    else if(['pause','emptied'].includes(reason)) bufferEventState='';

    if(audio.error){
      setObservedLed('statusBuffer','error','Stream Buffer — Mediafehler');
      setObservedLed('statusAudio','error','Audio-Core — Mediafehler');
    }else if(audio.paused){
      setObservedLed('statusBuffer','empty','Stream Buffer — wartet auf Wiedergabe');
      setObservedLed('statusAudio','empty','Audio-Core — bereit / pausiert');
    }else if(bufferEventState==='stalled'){
      setObservedLed('statusBuffer','warn','Stream Buffer — Stall erkannt, wartet auf Recovery');
      setObservedLed('statusAudio','main','Audio-Core — aktiv, Stream hängt');
    }else if(bufferEventState==='waiting'||bufferEventState==='suspend'){
      setObservedLed('statusBuffer','warn',bufferEventState==='waiting'?'Stream Buffer — puffert':'Stream Buffer — Browser/Netzwerk suspendiert');
      setObservedLed('statusAudio','main','Audio-Core — aktiv, wartet auf Daten');
    }else if(Number(audio.readyState)<2){
      setObservedLed('statusBuffer','warn','Stream Buffer — puffert');
      setObservedLed('statusAudio','main','Audio-Core — Wiedergabe angefordert');
    }else{
      setObservedLed('statusBuffer','main','Stream Buffer — stabil');
      setObservedLed('statusAudio','main','Audio-Core — aktiv');
    }
    const recovery=window.S666AllPlayerAudioRecovery;
    const owner=document.documentElement.getAttribute('data-audio-recovery-owner')||'';
    setObservedLed('statusWatchdog',(recovery?.owner||owner==='all-player-audio-recovery-v1')?'main':'warn',(recovery?.owner||owner==='all-player-audio-recovery-v1')?'Watchdog — zentraler All-Player Recovery-Owner aktiv':'Watchdog — zentraler Recovery-Owner noch nicht bestätigt');
  }

  function pulseReconnectLed(){
    const action=document.documentElement.getAttribute('data-audio-recovery-action')||'';
    if(!action) return;
    setObservedLed('statusReconnect',action==='confirmed-reload'?'warn':'api','Reconnect — '+action);
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(()=>setObservedLed('statusReconnect','empty','Reconnect — standby'),2200);
  }

  function installSystemLedBridge(){
    if(document.documentElement.dataset.s666MainLedBridge==='1') return;
    document.documentElement.dataset.s666MainLedBridge='1';
    const audio=q('#radio')||q('audio');
    for(const name of ['play','playing','pause','waiting','stalled','suspend','canplay','loadeddata','error','emptied']){
      audio?.addEventListener(name,event=>syncAudioHudLeds(event.type),{passive:true});
    }
    const reconnectObserver=new MutationObserver(pulseReconnectLed);
    reconnectObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-audio-recovery-action','data-audio-recovery-owner']});
    window.__S666_MAIN_LED_OBSERVER__=reconnectObserver;
    const workerTruthNodes=[q('#statusStream'),q('#statusMeta')].filter(Boolean);
    if(workerTruthNodes.length){
      const workerObserver=new MutationObserver(syncWorkerLedFromExistingTruth);
      workerTruthNodes.forEach(node=>workerObserver.observe(node,{attributes:true,attributeFilter:['class','data-led-state']}));
      window.__S666_MAIN_WORKER_LED_OBSERVER__=workerObserver;
    }
    window.addEventListener('online',syncWorkerLedFromExistingTruth,{passive:true});
    window.addEventListener('offline',syncWorkerLedFromExistingTruth,{passive:true});
    syncAudioHudLeds('state');
    syncWorkerLedFromExistingTruth();
  }

  function bindLayoutSignals(){
    if(document.documentElement.dataset.s666MainTickerSignals==='1') return;
    document.documentElement.dataset.s666MainTickerSignals='1';
    window.addEventListener('resize',scheduleTickerSync,{passive:true});
    window.addEventListener('orientationchange',scheduleTickerSync,{passive:true});
    for(const name of ['play','playing','pause','loadedmetadata','durationchange']) q('#radio')?.addEventListener(name,scheduleTickerSync,{passive:true});
    q('#nowCover')?.addEventListener('load',scheduleTickerSync,{passive:true});
    if(typeof ResizeObserver==='function'){
      try{
        const observer=new ResizeObserver(scheduleTickerSync);
        for(const node of [q('.now-playing'),q('.now-cover-wrap'),q('#historyToggle')].filter(Boolean)) observer.observe(node);
        window.__S666_MAIN_TICKER_RESIZE_OBSERVER__=observer;
      }catch(_){}
    }
    try{document.fonts?.ready?.then(scheduleTickerSync);}catch(_){}
  }

  function boot(){
    ensureVelunaCentralBoot();
    syncSharedHeaderAsset();
    bindLayoutSignals();
    installTicker();
    installSystemLedBridge();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',()=>{ensureVelunaCentralBoot();syncSharedHeaderAsset();installTicker();installSystemLedBridge();scheduleTickerSync();},{once:true});
})();
