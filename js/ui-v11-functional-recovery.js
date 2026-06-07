/* ============================================================
   666SOUNDsDESIGn — v11 Functional Recovery First
   Keine neuen Transport-Layer. Nur Schutz/Re-Sync vorhandener aktiver Elemente.
   ============================================================ */
(function(){
  'use strict';
  if(window.__S666_V11_FUNCTIONAL_RECOVERY__) return;
  window.__S666_V11_FUNCTIONAL_RECOVERY__=true;
  const VERSION='v11-functional-recovery-header-space-20260607';
  const HEADER_SRC='/assets/images/player-header-banner.png?v='+VERSION;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function normalizeDj(raw){
    const v=String(raw||'').replace(/\s+/g,' ').trim();
    if(!v || /auto\s*dj|autodj|auto-dj|no\s*dj|nodj|unknown|none|null|undefined|offline/i.test(v)) return '666SOUNDsDESIGn DJ';
    if(/^dj\s*666$/i.test(v) || /^666\s*dj$/i.test(v)) return '666SOUNDsDESIGn DJ';
    return v;
  }
  function applyHeader(){
    $$('.s666-player-header-banner,#mffApp .mff-cyber-header img').forEach(img=>{
      if(img.getAttribute('src')!==HEADER_SRC) img.setAttribute('src',HEADER_SRC);
      img.setAttribute('alt','666SOUNDsDESIGn WebRadio Cyberstream AI Cockpit Edition');
    });
    const mobileHeader=$('#mffApp .mff-cyber-header');
    if(mobileHeader && !mobileHeader.querySelector('.mff-header-brandline')){
      const line=document.createElement('div');
      line.className='mff-header-brandline';
      line.textContent='© 666SOUNDsDESIGn WebRadio · CYBERSTREAM COCKPIT EDITION · Fraggelpower666';
      mobileHeader.appendChild(line);
    }
  }
  function protectClicks(){
    $$('.frame-overlay,.s666-player-header,.s666-player-header *,.pc-bottom-sync-meter,.pc-bottom-sync-meter *,#pcCopyrightFooter').forEach(el=>{el.style.pointerEvents='none';});
    $$('#playBtn,#pauseBtn,#stopBtn,#reconnectBtn,#volumeSlider,#historyToggle,#playerAlertPcText,#playerAlertPcSend,#eqBars,.control-toolbar button,.top-hud button').forEach(el=>{
      el.disabled=false;
      el.removeAttribute('aria-disabled');
      el.style.pointerEvents='auto';
      el.style.touchAction='manipulation';
    });
  }
  function syncTicker(){
    const ticker=$('#nowPlayingTicker');
    const meta=$('#metaLine');
    const win=$('.ticker-window');
    if(win){win.style.display='flex';win.style.visibility='visible';win.style.opacity='1';}
    if(ticker && !ticker.textContent.trim()) ticker.textContent=(meta&&meta.textContent.trim())||'666SOUNDsDESIGn WebRadio';
  }
  function syncDj(){
    const dj=$('#djText');
    if(dj) dj.textContent=normalizeDj(dj.textContent);
  }
  function publishHeaderSize(){
    document.documentElement.setAttribute('data-header-target-size','1600x260');
    document.documentElement.setAttribute('data-header-safe-area','1500x210');
  }
  function boot(){applyHeader();protectClicks();syncTicker();syncDj();publishHeaderSize();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',boot,{passive:true});
  window.addEventListener('resize',boot,{passive:true});
  setTimeout(boot,300);
  setTimeout(boot,1200);
})();
