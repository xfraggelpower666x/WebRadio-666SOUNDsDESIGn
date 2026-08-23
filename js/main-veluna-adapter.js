/* 666SOUNDsDESIGn — Main VELUNA Adapter v1.0.4
 * Adapts proven VELUNA measured-marquee + cyber boot to the existing main player.
 * Visual reactivity consumes player-stage CSS variables only; no audio-bus access occurs here.
 */
(function(){
  'use strict';
  if(window.__S666_MAIN_VELUNA_ADAPTER__) return;
  window.__S666_MAIN_VELUNA_ADAPTER__=true;
  if(document.body?.dataset?.velunaPage!=='main') return;

  const q=(s,r=document)=>r.querySelector(s);

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
    if(!now) return;
    let offset=0;
    if(cover){
      const style=getComputedStyle(cover);
      const rect=cover.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8&&rect.height>8) offset=Math.ceil(rect.width+14);
    }
    now.style.setProperty('--s666-main-ticker-offset',offset+'px');
  }

  function syncTickerMotion(){
    syncTickerGeometry();
    const windowNode=q('body[data-veluna-page="main"] .now-playing .ticker-window');
    const ticker=q('#nowPlayingTicker',windowNode||document);
    if(!windowNode||!ticker) return;
    ticker.classList.add('s666-veluna-main-ticker');
    ticker.classList.remove('is-running','is-static');
    ticker.style.removeProperty('--ticker-shift');
    ticker.style.removeProperty('--ticker-duration');
    ticker.removeAttribute('data-s666-marquee-text');
    const text=(ticker.textContent||'').replace(/\s+/g,' ').trim();
    if(!text){ticker.classList.add('is-static');return;}
    const itemWidth=measureTextWidth(ticker);
    const viewportWidth=Math.floor(windowNode.clientWidth||0);
    ticker.setAttribute('data-s666-marquee-text',text);
    const gapPadding=48;
    const separatorWidth=measureSeparatorWidth(ticker);
    const shift=itemWidth+gapPadding+separatorWidth;
    const duration=Math.max(14,Math.min(42,shift/34));
    ticker.style.setProperty('--ticker-shift',shift+'px');
    ticker.style.setProperty('--ticker-duration',duration.toFixed(2)+'s');
    void ticker.offsetWidth;
    ticker.classList.add('is-running');
  }

  function installTicker(){
    const ticker=q('#nowPlayingTicker');
    if(!ticker||ticker.dataset.s666VelunaTicker==='1') return;
    ticker.dataset.s666VelunaTicker='1';
    const observer=new MutationObserver(()=>requestAnimationFrame(()=>requestAnimationFrame(syncTickerMotion)));
    observer.observe(ticker,{childList:true,characterData:true,subtree:true});
    window.addEventListener('resize',()=>{syncTickerGeometry();syncTickerMotion();},{passive:true});
    requestAnimationFrame(()=>requestAnimationFrame(syncTickerMotion));
  }

  function installBoot(){
    if(q('#s666MainCyberBoot')) return;
    const play=q('#playBtn');
    const audio=q('#radio')||q('audio');
    if(!play||!audio) return;
    const overlay=document.createElement('div');
    overlay.id='s666MainCyberBoot';
    overlay.className='s666-main-cyber-boot';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','666SOUNDsDESIGn Cyber Boot');
    overlay.innerHTML='<div class="s666-main-cyber-boot-panel"><div class="s666-main-cyber-boot-title">666SOUNDsDESIGn · CYBER BOOT</div><div class="s666-main-cyber-boot-sub">LYVRA · STREAM CORE · VISUAL SYSTEM</div><div class="s666-main-cyber-boot-grid"><span>STREAM CORE <b>READY</b></span><span>METADATA <b>SYNC</b></span><span>VISUAL BUS <b>LINKED</b></span><span>AUDIO GATE <b>WAIT</b></span></div><button id="s666MainCyberBootStart" type="button">START AUDIO</button><div id="s666MainCyberBootState" role="status" aria-live="polite">USER GESTURE REQUIRED</div></div>';
    document.body.appendChild(overlay);
    const button=q('#s666MainCyberBootStart',overlay);
    const state=q('#s666MainCyberBootState',overlay);
    let timer=0;
    function close(){clearTimeout(timer);overlay.classList.add('is-complete');setTimeout(()=>overlay.remove(),380);}
    function success(){state.textContent='AUDIO LINK CONFIRMED · ENTERING COCKPIT';close();}
    audio.addEventListener('playing',success,{once:true});
    if(!audio.paused){close();return;}
    button.addEventListener('click',()=>{
      button.disabled=true;
      state.textContent='STARTING EXISTING AUDIO CORE…';
      play.click();
      clearTimeout(timer);
      timer=setTimeout(()=>{
        if(!audio.paused) return success();
        button.disabled=false;
        state.textContent='AUDIO NOT CONFIRMED · TAP START AGAIN';
      },7200);
    });
  }

  function installBootAfterCentralOwner(){
    let settled=false;
    function finishAfterOwner(){
      if(settled) return;
      const central=window.S666CentralBootScreen;
      const active=Boolean(central?.isActive?.()||document.documentElement.classList.contains('s666-central-boot-active')||q('#s666CentralBoot'));
      if(active){setTimeout(finishAfterOwner,120);return;}
      if(central){settled=true;installBoot();return;}
      const loadState=String(window.__S666_CENTRAL_BOOT_LOAD_STATE__||'pending');
      if(loadState==='error'||loadState==='loaded'){settled=true;installBoot();return;}
      setTimeout(finishAfterOwner,120);
    }
    finishAfterOwner();
  }

  function boot(){installTicker();installBootAfterCentralOwner();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',()=>{installTicker();},{once:true});
})();
