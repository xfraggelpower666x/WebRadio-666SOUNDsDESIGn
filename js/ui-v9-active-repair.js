/* ============================================================
   666SOUNDsDESIGn — v9 Active Clickfix + Header/Panel Repair
   Bestehende Layer reparieren, keine Parallel-UI.
   ============================================================ */
(function(){
  'use strict';
  if(window.__S666_UI_V9_ACTIVE_REPAIR__) return;
  window.__S666_UI_V9_ACTIVE_REPAIR__ = true;
  const HEADER_SRC='/assets/images/player-header-banner.png?v=v9-active-clickfix-header-panel-repair-20260607';
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function ensureHeaderBrandline(container){
    if(!container || qs('.s666-header-brandline',container)) return;
    const d=document.createElement('div');
    d.className='s666-header-brandline';
    d.setAttribute('aria-label','Player-Kopfzeile');
    d.innerHTML='<span>© 666SOUNDsDESIGn WebRadio</span><b>CYBERSTREAM COCKPIT EDITION</b><span>Fraggelpower666 • 2026</span>';
    container.appendChild(d);
  }
  function repairHeader(){
    qsa('#phase10CleanHeaderLogo,#pcHeaderBrandSplit,#pcHeaderNewLogo').forEach(n=>{n.setAttribute('aria-hidden','true');n.style.display='none';n.style.pointerEvents='none'});
    const pc=qs('.hero.s666-player-header');
    if(pc){
      pc.style.pointerEvents='none'; ensureHeaderBrandline(pc);
      const img=qs('#s666PlayerHeaderBanner',pc)||qs('img',pc); if(img){img.src=HEADER_SRC;img.alt='666SOUNDsDESIGn WebRadio Cyberstream AI Cockpit Edition';}
    }
    const mob=qs('#mffApp .mff-cyber-header')||qs('.mff-cyber-header');
    if(mob){
      mob.style.pointerEvents='none'; ensureHeaderBrandline(mob); qs('.s666-header-brandline',mob)?.classList.add('mff-header-brandline');
      const img=qs('img',mob); if(img){img.src=HEADER_SRC;img.alt='666SOUNDsDESIGn WebRadio Cyberstream AI Cockpit Edition';}
    }
    const foot=qs('#pcCopyrightFooter'); if(foot){foot.setAttribute('aria-hidden','true');foot.style.display='none';foot.style.pointerEvents='none'}
  }
  function normalizeDj(s){
    s=String(s||'').replace(/\s+/g,' ').trim();
    if(!s || /no\s*dj|nodj|no-dj|auto\s*dj|autodj|auto-dj|unknown|offline|none|null|undefined/i.test(s)) return '666SOUNDsDESIGn DJ';
    if(/^dj\s*666$/i.test(s) || /^666\s*dj$/i.test(s)) return '666SOUNDsDESIGn DJ';
    return s;
  }
  function repairDj(){
    qsa('#djText,#mffDjText,[data-role="dj"],.dj-text').forEach(n=>{const v=normalizeDj(n.textContent); if(v && n.textContent.trim()!==v)n.textContent=v;});
    qsa('#chip_djText span,.s666-info-chip').forEach(n=>{ if((n.textContent||'').match(/DJ 666|666 DJ|Auto\s*DJ|Unknown/i)) n.textContent='666SOUNDsDESIGn DJ'; });
    if(window.S666UIStatusCore && window.S666UIStatusCore.normalizeDj){window.S666UIStatusCore.normalizeDj=normalizeDj;}
  }
  function repairPanelTitles(){
    const left=qs('#pcLeftFxAddon .pc-addon-tower-head');
    if(left){left.classList.add('s666-addon-head');left.title='Fraggle DNA: Ursprung aus Druck, Tiefe, kontrolliertem Chaos, Cyberpunk-Atmosphäre und psychoakustischem Sounddesign.';left.setAttribute('aria-label','Fraggle DNA Panel');
      let span=qs('span',left); if(!span){span=document.createElement('span');left.prepend(span)} span.textContent='FRAGGLE DNA';
      if(!qs('[data-panel-led="dna"]',left)){const i=document.createElement('i');i.className='s666-panel-audio-led';i.dataset.panelLed='dna';i.title='Audioaktive Fraggle DNA LED';i.setAttribute('aria-label','Audioaktive Fraggle DNA LED'); span.after(i)}
      let b=qs('#pcLeftFxState',left)||qs('b',left); if(b)b.textContent='DNA';
    }
    const right=qs('#pcRightFxAddon .pc-addon-tower-head');
    if(right){right.classList.add('s666-addon-head');right.title='Fraggle Dynasty: Bewegung aus Bass, Bewusstsein, Widerstand und kreativer Freiheit.';right.setAttribute('aria-label','Fraggle Dynasty Panel');
      let span=qs('span',right); if(!span){span=document.createElement('span');right.prepend(span)} span.textContent='FRAGGLE DYNASTY';
      if(!qs('[data-panel-led="dyn"]',right)){const i=document.createElement('i');i.className='s666-panel-audio-led';i.dataset.panelLed='dyn';i.title='Audioaktive Fraggle Dynasty LED';i.setAttribute('aria-label','Audioaktive Fraggle Dynasty LED'); span.after(i)}
      let b=qs('#pcRightFxState',right)||qs('b',right); if(b)b.textContent='DYN';
    }
    const reactor=qs('.pc-addon-module-reactor strong'); if(reactor)reactor.textContent='FREQUENCY REACTOR FX';
  }
  function unblockControls(){
    // Decorative/static shells never own clicks; real controls explicitly do.
    qsa('.s666-player-header,.mff-cyber-header,.s666-header-brandline,#pcCopyrightFooter,.mff-side').forEach(n=>{n.style.pointerEvents='none'});
    qsa('button,input,textarea,select,a,[role="button"],.mff-controls,.controls,#playerAlertPcBox,#playerAlertPcText,#playerAlertPcSend,#historyToggle').forEach(n=>{n.style.pointerEvents='auto'});
    const mobileControls=qs('#mffApp .mff-controls'); if(mobileControls){mobileControls.style.zIndex='160';mobileControls.style.position='relative';mobileControls.style.pointerEvents='auto'}
    const pcControls=qs('.player-shell .controls')||qs('.control-row')||qs('.transport'); if(pcControls){pcControls.style.zIndex='160';pcControls.style.position='relative';pcControls.style.pointerEvents='auto'}
  }
  function audioEnergy(){
    let vals=qsa('.side-meter-fill,.pc-bottom-sync-seg,.mff-side').map(n=>{
      const cs=getComputedStyle(n); const h=parseFloat(cs.height)||0; const mh=parseFloat(cs.maxHeight)||parseFloat(n.parentElement&&getComputedStyle(n.parentElement).height)||100; return Math.max(0,Math.min(1,h/(mh||100)));
    }).filter(v=>isFinite(v));
    let e=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const aud=qs('audio'); if(aud && !aud.paused)e=Math.max(e,.28+((Date.now()%700)/700)*.25);
    return Math.max(.08,Math.min(.98,e));
  }
  function tickAudioLed(){document.documentElement.style.setProperty('--s666-audio-energy',audioEnergy().toFixed(3));}
  function boot(){repairHeader();repairDj();repairPanelTitles();unblockControls();tickAudioLed();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',boot,{passive:true}); window.addEventListener('resize',boot,{passive:true});
  setTimeout(boot,100);setTimeout(boot,600);setTimeout(boot,1600);
  setInterval(function(){repairDj();unblockControls();tickAudioLed();},450);
})();
