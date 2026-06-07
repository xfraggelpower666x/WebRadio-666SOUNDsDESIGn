
/* ============================================================
   666SOUNDsDESIGn — v8 Central UI Status Core
   Zentraler LED-Core für PC + iPhone. Befüllt vorhandene Container,
   baut keine Parallel-UI.
   ============================================================ */
(function(){
  'use strict';
  if(window.__S666_UI_STATUS_CORE_V8__) return;
  window.__S666_UI_STATUS_CORE_V8__ = true;
  const LEDS = [
    {key:'met', id:'statusMeta', code:'MET', label:'Metadata', tip:'Metadaten aktuell und lesbar'},
    {key:'src', id:'statusSource', code:'SRC', label:'Source', tip:'Streamquelle erkannt'},
    {key:'wrk', id:'statusWorker', code:'WRK', label:'Worker', tip:'Cloudflare Worker / Player Runtime erreichbar'},
    {key:'wch', id:'statusWatchdog', code:'WCH', label:'Watchdog', tip:'Stream Watchdog Diagnose aktiv'},
    {key:'str', id:'statusStream', code:'STR', label:'Stream', tip:'Audiostream läuft'},
    {key:'main', id:'mainBtn', code:'MAIN', label:'Mainstream', tip:'Hauptstream aktiv / Main Only'},
    {key:'dsc', id:'statusDiscord', code:'DSC', label:'Discord', tip:'Discord Posting / Shooter Status'},
    {key:'gov', id:'statusGovee', code:'GOV', label:'GOVEE', tip:'GOVEE FX / Scene Sync'},
    {key:'art', id:'statusArtwork', code:'ART', label:'Artwork', tip:'Streambild / Trackbild System'}
  ];
  const INFO = [
    {id:'listenersText', code:'LST', tip:'Listener aktuell / maximal'},
    {id:'bitrateText', code:'QTY', tip:'Streamqualität / Bitrate'},
    {id:'djText', code:'DJ', tip:'Aktiver DJ / AutoDJ-Erkennung'}
  ];
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function el(tag, cls){const e=document.createElement(tag); if(cls)e.className=cls; return e;}
  function normState(v){v=String(v||'').toLowerCase(); if(/error|fail|down|offline|stopped/.test(v))return'error'; if(/warn|pending|sync|checking|buffer|reconnect/.test(v))return'warn'; if(/ok|main|api|stable|ready|connected/.test(v))return'ok'; if(/active|running|live/.test(v))return'active'; return'off';}
  function classFor(state){return 's666-state-'+normState(state)}
  function normalizeDj(v){
    let s=String(v||'').replace(/\s+/g,' ').trim();
    if(!s || /no\s*dj|nodj|no-dj|auto\s*dj|autodj|auto-dj|unknown|offline|none|null|undefined/i.test(s)) return '666SOUNDsDESIGn DJ';
    s=s.replace(/^666soundsdesign\s*dj\s*[-:|–—]*\s*/i,'').replace(/^dj\s*[-:|–—]*\s*/i,'').trim();
    return s || '666SOUNDsDESIGn DJ';
  }
  function makeLed(def, mobile){
    const b=el('button','status-chip led-state s666-status-chip s666-state-off');
    b.type='button'; b.id=mobile ? 'mffStatus_'+def.key : def.id;
    b.dataset.status=def.key; b.dataset.state='off';
    b.title=def.tip; b.setAttribute('aria-label',def.tip);
    b.innerHTML='<span class="status-dot"></span><span class="status-code">'+def.code+'</span>';
    if(mobile){ b.className='mff-panel-led s666-status-chip s666-state-off'; b.innerHTML='<i></i><b>'+def.code+'</b>'; }
    return b;
  }
  function buildPc(){
    const cluster=qs('.top-hud .status-cluster'); if(!cluster)return;
    cluster.classList.add('s666-central-status-row');
    let left=qs('.systempanel-left',cluster), center=qs('.systempanel-center',cluster), right=qs('.systempanel-right',cluster);
    if(!left){left=el('div','systempanel-group systempanel-left'); cluster.appendChild(left)}
    if(!center){center=el('div','systempanel-group systempanel-center'); cluster.appendChild(center)}
    if(!right){right=el('div','systempanel-group systempanel-right'); cluster.appendChild(right)}
    if(left.dataset.s666V8Built!=='1'){
      left.innerHTML=''; LEDS.forEach(d=>left.appendChild(makeLed(d,false))); left.dataset.s666V8Built='1';
    }
    if(center.dataset.s666V8Built!=='1'){
      center.innerHTML=''; center.classList.add('s666-compact-info-row'); INFO.forEach(d=>{const c=el('span','s666-info-chip'); c.id='chip_'+d.id; c.title=d.tip; c.setAttribute('aria-label',d.tip); c.innerHTML='<b>'+d.code+'</b><span>--</span>'; center.appendChild(c)}); center.dataset.s666V8Built='1';
    }
    if(right.dataset.s666V8Built!=='1'){
      // Keep existing boost controls if present; otherwise compact placeholder bound by existing boost code later.
      right.classList.add('s666-central-status-row');
      right.dataset.s666V8Built='1';
    }
  }
  function buildMobile(){
    const panel=qs('#mffPanelLedPanel'); if(!panel)return;
    panel.classList.add('s666-central-status-row');
    if(panel.dataset.s666V8Built==='1')return;
    panel.innerHTML=''; LEDS.forEach(d=>panel.appendChild(makeLed(d,true))); panel.dataset.s666V8Built='1';
  }
  function stateLed(key,state,tip){
    const st=normState(state); qsa('[data-status="'+key+'"]').forEach(n=>{n.dataset.state=st; n.classList.remove('s666-state-off','s666-state-active','s666-state-ok','s666-state-warn','s666-state-error','state-off','state-main','state-api','state-warning','state-error','state-stopped'); n.classList.add(classFor(st)); if(tip){n.title=tip;n.setAttribute('aria-label',tip)}})
  }
  function updateInfo(){
    INFO.forEach(d=>{const src=document.getElementById(d.id); const chip=document.getElementById('chip_'+d.id); if(!chip)return; let v=(src&&src.textContent||'').trim(); if(d.id==='djText')v=normalizeDj(v); if(d.id==='bitrateText'&&v&&!/unknown|--/i.test(v)&&!/kbps/i.test(v))v=v+' kbps'; chip.querySelector('span').textContent=v||'--'; chip.title=d.tip+': '+(v||'--'); chip.setAttribute('aria-label',chip.title); if(src&&d.id==='djText'&&src.textContent!==v)src.textContent=v;});
  }
  function updateFromDom(){
    const html=document.documentElement, body=document.body;
    const playerState=(body&&body.getAttribute('data-player-state'))||html.getAttribute('data-player-state')||'';
    const watchdog=html.getAttribute('data-stream-watchdog-state')||'';
    const govee=(body&&body.getAttribute('data-govee-state'))||html.getAttribute('data-govee-state')||'';
    stateLed('wrk','ok','Worker / UI Runtime aktiv');
    stateLed('met', document.getElementById('statusMeta')?.className || (document.getElementById('djText')?'ok':'warn'), 'Metadatenstatus');
    stateLed('src', document.getElementById('statusSource')?.className || 'active','Streamquelle erkannt');
    stateLed('str', /playing|live/i.test(playerState)?'ok':(document.querySelector('audio')&&!document.querySelector('audio').paused?'ok':'warn'), 'Streamstatus');
    stateLed('main','ok','Mainstream aktiv / Backup nur manuell');
    stateLed('wch', watchdog ? (/error|stall/i.test(watchdog)?'warn':'ok') : (html.getAttribute('data-stream-watchdog-v1')?'active':'warn'), 'Stream Watchdog: '+(watchdog||'warte auf Diagnose'));
    stateLed('gov', govee ? (/error/i.test(govee)?'error':/sync|connected/i.test(govee)?'ok':'warn') : 'warn', 'GOVEE FX / Scene Sync: '+(govee||'wartet'));
    stateLed('dsc', document.querySelector('[data-discord-addon-slot]')?'active':'warn','Discord Shooter / Posting bereit');
    stateLed('art', document.querySelector('#coverArt,#streamCover,.cover-art,.mff-symbol')?'active':'warn','Artwork / Streambild bereit');
    updateInfo();
  }
  function boot(){buildPc();buildMobile();updateFromDom();}
  window.S666UIStatusCore={boot, set:stateLed, normalizeDj};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',boot,{passive:true});
  setTimeout(boot,120); setTimeout(boot,700); setInterval(boot,1500);
})();
