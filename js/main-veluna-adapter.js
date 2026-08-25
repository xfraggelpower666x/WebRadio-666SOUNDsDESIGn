/* 666SOUNDsDESIGn — Main VELUNA Adapter v1.1.2
 * Canonical Main ticker geometry + exact shared VELUNA Central Boot reuse.
 * Main never creates a second boot surface and never calls central show() directly.
 * Ticker width is measured against the visible cover and History control so idle/play states share one lane.
 * Marquee motion uses the independent CSS translate property so legacy transform:none!important cannot suppress motion.
 * Repeated metadata refreshes do not restart an unchanged marquee, so long titles complete their full cycle.
 * Visual reactivity consumes player-stage CSS variables only; no audio-bus access occurs here.
 */
(function(){
  'use strict';
  if(window.__S666_MAIN_VELUNA_ADAPTER__) return;
  window.__S666_MAIN_VELUNA_ADAPTER__=true;
  if(document.body?.dataset?.velunaPage!=='main') return;

  const q=(s,r=document)=>r.querySelector(s);
  const CENTRAL_BOOT_SRC='/js/central-boot-screen.js?v=20260812-v200';
  let tickerAnimation=null;
  let layoutRaf=0;

  function ensureVelunaCentralBoot(){
    const central=window.S666CentralBootScreen;
    if(central){
      try{central.bootOnce?.();}catch(_){}
      return;
    }
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

  function measureTextWidth(node){
    if(!node) return 0;
    try{
      const range=document.createRange();
      range.selectNodeContents(node);
      const width=range.getBoundingClientRect().width;
      range.detach?.();
      if(width>0) return Math.ceil(width);
    }catch(_){ }
    return Math.ceil(node.scrollWidth||node.getBoundingClientRect().width||0);
  }

  function measureSeparatorWidth(ticker){
    if(!ticker) return 0;
    const probe=document.createElement('span');
    const style=getComputedStyle(ticker);
    probe.textContent=' ◆ ';
    probe.setAttribute('aria-hidden','true');
    probe.style.cssText='position:fixed;left:-10000px;top:-10000px;visibility:hidden;white-space:nowrap;pointer-events:none;';
    probe.style.font=style.font;
    probe.style.letterSpacing=style.letterSpacing;
    probe.style.fontKerning=style.fontKerning;
    document.body.appendChild(probe);
    const width=Math.ceil(probe.getBoundingClientRect().width||probe.scrollWidth||0);
    probe.remove();
    return width;
  }

  function syncTickerGeometry(){
    const now=q('body[data-veluna-page="main"] .now-playing');
    const cover=q('.now-cover-wrap',now||document);
    const history=q('#historyToggle',now||document);
    if(!now) return;

    const nowRect=now.getBoundingClientRect();
    let left=14;
    let right=14;

    if(cover){
      const style=getComputedStyle(cover);
      const rect=cover.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8&&rect.height>8){
        left=Math.max(left,Math.ceil(rect.right-nowRect.left+14));
      }
    }
    if(history){
      const style=getComputedStyle(history);
      const rect=history.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8){
        right=Math.max(14,Math.ceil(nowRect.right-rect.right));
      }
    }

    const width=Math.max(96,Math.floor(nowRect.width-left-right));
    now.style.setProperty('--s666-main-ticker-left',left+'px');
    now.style.setProperty('--s666-main-ticker-right',right+'px');
    now.style.setProperty('--s666-main-ticker-width',width+'px');
  }

  function stopTickerAnimation(ticker){
    try{tickerAnimation?.cancel?.();}catch(_){}
    tickerAnimation=null;
    try{
      for(const animation of ticker?.getAnimations?.()||[]){
        if(animation?.id==='s666-main-marquee') animation.cancel();
      }
    }catch(_){}
  }

  function startTickerAnimation(ticker,shift,duration){
    stopTickerAnimation(ticker);
    if(typeof ticker.animate==='function'){
      try{
        tickerAnimation=ticker.animate(
          [{translate:'0 0'},{translate:`-${shift}px 0`}],
          {duration:Math.round(duration*1000),iterations:Infinity,easing:'linear'}
        );
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
    const active=ticker.classList.contains('is-static')||(
      ticker.classList.contains('is-running')&&!!ticker.dataset.s666TickerDriver
    );
    if(unchanged&&active) return;
    ticker.dataset.s666TickerSignature=signature;

    ticker.classList.remove('is-running','is-static');
    ticker.style.removeProperty('--ticker-shift');
    ticker.style.removeProperty('--ticker-duration');
    ticker.removeAttribute('data-s666-marquee-text');
    ticker.removeAttribute('data-s666-ticker-driver');
    stopTickerAnimation(ticker);

    if(!text){
      ticker.classList.add('is-static');
      return;
    }

    const itemWidth=measureTextWidth(ticker);
    const gapPadding=48;
    const separatorWidth=measureSeparatorWidth(ticker);
    const shift=Math.max(1,itemWidth+gapPadding+separatorWidth);
    const duration=Math.max(12,Math.min(52,shift/42));

    ticker.setAttribute('data-s666-marquee-text',text);
    ticker.style.setProperty('--ticker-shift',shift+'px');
    ticker.style.setProperty('--ticker-duration',duration.toFixed(2)+'s');
    ticker.classList.add('is-running');
    void ticker.offsetWidth;
    startTickerAnimation(ticker,shift,duration);
  }

  function scheduleTickerSync(){
    cancelAnimationFrame(layoutRaf);
    layoutRaf=requestAnimationFrame(()=>requestAnimationFrame(syncTickerMotion));
  }

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

  function bindLayoutSignals(){
    if(document.documentElement.dataset.s666MainTickerSignals==='1') return;
    document.documentElement.dataset.s666MainTickerSignals='1';
    window.addEventListener('resize',scheduleTickerSync,{passive:true});
    window.addEventListener('orientationchange',scheduleTickerSync,{passive:true});
    for(const name of ['play','playing','pause','loadedmetadata','durationchange']){
      q('#radio')?.addEventListener(name,scheduleTickerSync,{passive:true});
    }
    q('#nowCover')?.addEventListener('load',scheduleTickerSync,{passive:true});
    try{document.fonts?.ready?.then(scheduleTickerSync);}catch(_){}
  }

  function boot(){
    ensureVelunaCentralBoot();
    bindLayoutSignals();
    installTicker();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',()=>{ensureVelunaCentralBoot();installTicker();scheduleTickerSync();},{once:true});
})();
