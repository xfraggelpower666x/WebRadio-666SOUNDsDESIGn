
/* 666SOUNDsDESIGn — v8 Central Header Core */
(function(){
  'use strict';
  if(window.__S666_UI_HEADER_CORE_V8__) return; window.__S666_UI_HEADER_CORE_V8__=true;
  const SRC='/assets/images/player-header-banner.png?v=v8-active-layer-central-ui-core-stage-lock-20260607';
  function qs(s,r){return (r||document).querySelector(s)}
  function apply(){
    const pc=qs('#s666PlayerHeaderBanner'); if(pc){pc.src=SRC; pc.alt='666SOUNDsDESIGn WebRadio Cyberstream AI Cockpit Edition';}
    const mob=qs('#mffApp .mff-cyber-header img') || qs('.mff-cyber-header img'); if(mob){mob.src=SRC; mob.alt='666SOUNDsDESIGn WebRadio Cyberstream AI Cockpit Edition';}
    document.querySelectorAll('#phase10CleanHeaderLogo,#pcHeaderBrandSplit,#pcHeaderNewLogo').forEach(n=>{n.setAttribute('aria-hidden','true'); n.style.display='none';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  window.addEventListener('load',apply,{passive:true}); setTimeout(apply,100); setTimeout(apply,700); setInterval(apply,2000);
})();
