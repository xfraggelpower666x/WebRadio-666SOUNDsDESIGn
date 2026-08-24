/* 666SOUNDsDESIGn — Main VELUNA Adapter v1.0.5
 * Adapts the proven VELUNA measured-marquee to the existing main player.
 * The shared central boot screen is the sole boot owner; no second audio-confirmation boot is created here.
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
      const nowRect=now.getBoundingClientRect();
      const rect=cover.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.width>8&&rect.height>8){
        offset=Math.max(0,Math.ceil(rect.right-nowRect.left+14));
      }
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

  function boot(){installTicker();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',()=>{installTicker();},{once:true});
})();
