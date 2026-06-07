/* ============================================================
   666SOUNDsDESIGn — v10 Active Repair
   Clickfix, Ticker Restore, LED Normalize, Message Layout, Header Fit.
   ============================================================ */
(function(){
  'use strict';
  if(window.__S666_UI_V10_ACTIVE_REPAIR__) return;
  window.__S666_UI_V10_ACTIVE_REPAIR__=true;
  const VERSION='v10-clickfix-ticker-led-message-header-20260607';
  const HEADER_SRC='/assets/images/player-header-banner.png?v='+VERSION;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function setText(el,v){ if(el && String(el.textContent||'')!==String(v||'')) el.textContent=String(v||''); }
  function normalizeDj(v){
    const raw=String(v||'').replace(/\s+/g,' ').trim();
    if(!raw || /auto\s*dj|autodj|auto-dj|no\s*dj|nodj|unknown|none|null|undefined|offline/i.test(raw)) return '666SOUNDsDESIGn DJ';
    return raw;
  }
  function repairHeader(){
    $$('.s666-player-header-banner,#mffApp .mff-cyber-header img').forEach(img=>{img.src=HEADER_SRC; img.loading='eager'; img.decoding='async';});
    $$('.s666-header-brandline,.mff-header-brandline').forEach(n=>{n.innerHTML='<span>© 666SOUNDsDESIGn WebRadio</span><b>CYBERSTREAM COCKPIT EDITION</b><span>Fraggelpower666 • 2026</span>';});
  }
  function hardClickFix(){
    // Do not guess: make all known visual/decor shells transparent to pointer events, real controls active.
    $$('.frame-overlay,.s666-player-header,.s666-player-header *,.pc-side-addon,.pc-bottom-sync-meter,.pc-bottom-sync-meter *,#pcCopyrightFooter,.phase10-now-version').forEach(n=>{n.style.pointerEvents='none'});
    $$('.player-shell,.bottom-console,.control-toolbar,.control-toolbar *,#playBtn,#pauseBtn,#stopBtn,#reconnectBtn,#volumeSlider,#historyToggle,#playerAlertPcBox,#playerAlertPcText,#playerAlertPcSend,.top-hud button,.status-chip').forEach(n=>{n.style.pointerEvents='auto'; n.style.touchAction='manipulation'});
    const bc=$('.bottom-console'); if(bc){bc.style.position='relative';bc.style.zIndex='10000';}
    const tb=$('.control-toolbar'); if(tb){tb.style.position='relative';tb.style.zIndex='10020';}
  }
  function bindHardTransport(){
    const map={playBtn:'play',pauseBtn:'pause',stopBtn:'stop',reconnectBtn:'reconnect'};
    Object.keys(map).forEach(id=>{
      const btn=document.getElementById(id); if(!btn || btn.__s666v10HardBound) return;
      btn.__s666v10HardBound=true;
      btn.addEventListener('pointerdown',()=>{btn.dataset.v10Down='1'},true);
      btn.addEventListener('click',()=>{document.body.setAttribute('data-last-control-click',map[id]);},true);
    });
  }
  function restoreTicker(){
    const win=$('.now-playing .ticker-window'); const t=document.getElementById('nowPlayingTicker');
    if(!win||!t) return;
    win.style.display='flex'; win.style.visibility='visible'; win.style.opacity='1';
    const src=($('#metaLine')?.textContent||t.textContent||'').trim();
    if(!t.textContent.trim()) t.textContent=src || '666SOUNDsDESIGn WebRadio  •  Cyberstream Cockpit Edition  •  Alive in the frequency';
  }
  function repairMessageLayout(){
    const top=$('.now-playing .section-topline'), box=$('#playerAlertPcBox'), text=$('#playerAlertPcText'), send=$('#playerAlertPcSend'), hist=$('#historyToggle');
    if(top) top.dataset.v10MessageLayout='1';
    if(box){box.dataset.v10MessageLayout='1'; box.setAttribute('aria-label','Broadcast Message Eingabe');}
    if(text){text.placeholder='Write a clear player message...'; text.rows=2; text.setAttribute('aria-label','Broadcast Message Text eingeben');}
    if(send){send.textContent='SEND'; send.title='Message senden'; send.setAttribute('aria-label','Message senden');}
    if(hist){hist.textContent='HST'; hist.title='History öffnen'; hist.setAttribute('aria-label','History öffnen');}
  }
  function normalizeInfo(){
    const dj=$('#djText'); if(dj) setText(dj, normalizeDj(dj.textContent));
    const bitrate=$('#bitrateText'); if(bitrate){let v=String(bitrate.textContent||'').trim(); if(v && !/unknown|kbps|--/i.test(v)) bitrate.textContent=v+' kbps';}
  }
  function repairLeds(){
    // Remove duplicate MAIN from central system row. Main/Backup already exists in dedicated stream source controls.
    $$('[data-status="main"],#mffStatus_main').forEach(n=>n.remove());
    const core=window.S666UIStatusCore;
    if(core && typeof core.set==='function'){
      core.set('wrk','ok','Worker/UI Runtime OK');
      core.set('met','active','Metadaten aktiv');
      core.set('src','active','Source erkannt');
      core.set('str',/play/i.test(document.body.getAttribute('data-player-state')||'')?'ok':'warn','Streamstatus');
      core.set('wch',document.documentElement.getAttribute('data-stream-watchdog-state')?'ok':'active','Watchdog Diagnose aktiv');
      core.set('dsc','active','Discord Shooter vorhanden');
      core.set('gov',document.documentElement.getAttribute('data-govee-state')||document.body.getAttribute('data-govee-state')?'ok':'warn','GOVEE FX / Scene Sync');
      core.set('art',$('#nowCover')?'active':'warn','Artwork / Streambild');
    }
  }
  function boot(){repairHeader(); hardClickFix(); bindHardTransport(); restoreTicker(); repairMessageLayout(); normalizeInfo(); repairLeds();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',boot,{passive:true}); window.addEventListener('resize',boot,{passive:true});
  setTimeout(boot,100); setTimeout(boot,700); setTimeout(boot,1800); setInterval(boot,900);
})();
