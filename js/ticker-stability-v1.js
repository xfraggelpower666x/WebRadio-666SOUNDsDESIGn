/*
  666SOUNDsDESIGn — TICKER STABILITY V1 — v35.7.0
  Repariert kurze Leerphasen/Restart ohne Metadaten- oder Worker-Route zu ändern.
*/
(function(){
  'use strict';
  if(window.__S666TickerStabilityV1Installed) return;
  window.__S666TickerStabilityV1Installed=true;
  function qs(s,r){return (r||document).querySelector(s);}
  function clean(t){return String(t||'').replace(/\s+/g,' ').trim() || '666SOUNDsDESIGn WebRadio';}
  function measure(el){try{return el.getBoundingClientRect().width||0;}catch(e){return 0;}}
  function apply(){
    var ticker=qs('#nowPlayingTicker'); if(!ticker) return;
    var win=ticker.parentElement;
    var text=clean(ticker.textContent);
    if(ticker.getAttribute('data-s666-ticker-text')===text && ticker.getAttribute('data-s666-ticker-ready')==='1') return;
    ticker.setAttribute('data-s666-ticker-text',text);
    ticker.setAttribute('data-s666-ticker-ready','1');
    ticker.style.animation='none';
    ticker.style.paddingLeft='0';
    ticker.style.transform='translateX(0)';
    ticker.style.display='inline-block';
    ticker.style.minWidth='0';
    ticker.style.width='auto';
    ticker.offsetHeight; // restart barrier
    var containerWidth=win?measure(win):0;
    var textWidth=measure(ticker);
    if(textWidth && containerWidth && textWidth > containerWidth*0.92){
      var seconds=Math.max(16,Math.min(42,(textWidth+containerWidth)/42));
      ticker.style.setProperty('--s666-ticker-distance', String(textWidth+containerWidth)+'px');
      ticker.style.setProperty('--s666-ticker-duration', seconds.toFixed(1)+'s');
      ticker.classList.add('s666-ticker-scroll');
      ticker.classList.remove('s666-ticker-static');
    }else{
      ticker.classList.add('s666-ticker-static');
      ticker.classList.remove('s666-ticker-scroll');
    }
  }
  function boot(){
    var ticker=qs('#nowPlayingTicker'); if(!ticker) return;
    if(window.MutationObserver && !ticker.__s666TickerObserver){
      ticker.__s666TickerObserver=new MutationObserver(function(){ticker.removeAttribute('data-s666-ticker-ready'); setTimeout(apply,30);});
      ticker.__s666TickerObserver.observe(ticker,{childList:true,characterData:true,subtree:true});
    }
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('resize',function(){var t=qs('#nowPlayingTicker'); if(t)t.removeAttribute('data-s666-ticker-ready'); setTimeout(apply,80);},{passive:true});
  window.addEventListener('orientationchange',function(){var t=qs('#nowPlayingTicker'); if(t)t.removeAttribute('data-s666-ticker-ready'); setTimeout(apply,260);},{passive:true});
  setInterval(apply,1200);
})();
