/*
  666SOUNDsDESIGn — STREAM WATCHDOG V1 — v35.7.0
  Diagnose-Layer über vorhandener Audio-Stability-Logik.
  Kein Worker-Eingriff. Kein zweiter Recovery-Controller. DarkDancer unberührt.
*/
(function(){
  'use strict';
  if(window.__S666StreamWatchdogV1Installed) return;
  window.__S666StreamWatchdogV1Installed=true;
  var VERSION='v35.7.0';
  var lastTime=0;
  var lastMoveAt=Date.now();
  var lastReason='boot';
  var recoverCount=0;
  var lastStep='none';
  function qs(s,r){return (r||document).querySelector(s);}
  function audio(){return qs('#radio')||qs('audio');}
  function app(){return qs('#mffApp')||document.body;}
  function wantsPlayback(a){
    if(!a) return false;
    var ps=(document.body&&document.body.getAttribute('data-player-state'))||'';
    if(ps==='stopped'||ps==='paused'||document.body.classList.contains('is-stopped')) return false;
    return !a.paused || ps==='playing' || document.body.classList.contains('is-playing');
  }
  function stateClass(state){return state==='OK'?'state-main':state==='BUFFERING'?'state-api':state==='STALL'?'state-error':state==='ERROR'?'state-error':'state-off';}
  function ensureChip(){
    var existing=qs('#streamWatchdogBadge');
    if(existing) return existing;
    var chip=document.createElement('button');
    chip.id='streamWatchdogBadge';
    chip.type='button';
    chip.className='status-chip led-state state-off stream-watchdog-badge';
    chip.title='Stream Watchdog V1';
    chip.innerHTML='<span class="status-dot"></span><span class="status-code">WDG</span>';
    var target=qs('.systempanel-left')||qs('.systempanel-right')||qs('.status-cluster')||qs('#phase10NowVersion');
    if(target) target.appendChild(chip); else document.body.appendChild(chip);
    return chip;
  }
  function paintChip(state,reason,stallMs,a){
    var chip=ensureChip();
    chip.classList.remove('state-main','state-api','state-error','state-off','is-active');
    chip.classList.add(stateClass(state));
    if(state!=='IDLE') chip.classList.add('is-active');
    var code=chip.querySelector('.status-code')||chip;
    code.textContent=state==='OK'?'WDG OK':state==='BUFFERING'?'WDG BUF':state==='STALL'?'WDG STALL':state==='ERROR'?'WDG ERR':'WDG';
    chip.title='Watchdog: '+state+' · '+reason+' · stall '+stallMs+'ms · ready '+(a?a.readyState:'-')+' · net '+(a?a.networkState:'-')+' · recover '+recoverCount+' · step '+lastStep;
  }
  function publish(state,reason,stallMs,a){
    var root=document.documentElement;
    var node=app();
    [root,node].forEach(function(el){
      if(!el) return;
      el.setAttribute('data-stream-watchdog-v1','active');
      el.setAttribute('data-stream-watchdog-state',state);
      el.setAttribute('data-stream-watchdog-reason',reason||'unknown');
      el.setAttribute('data-stream-watchdog-audio-stall-ms',String(stallMs||0));
      el.setAttribute('data-stream-watchdog-ready',String(a?a.readyState:0));
      el.setAttribute('data-stream-watchdog-network',String(a?a.networkState:0));
      el.setAttribute('data-stream-watchdog-recover-count',String(recoverCount));
      el.setAttribute('data-stream-watchdog-last-step',lastStep);
    });
    try{window.S666StreamWatchdogV1={version:VERSION,state:state,reason:reason,stallMs:stallMs,readyState:a?a.readyState:0,networkState:a?a.networkState:0,recoverCount:recoverCount,lastStep:lastStep,updatedAt:new Date().toISOString()};}catch(e){}
    paintChip(state,reason,stallMs,a);
  }
  function mark(reason){
    var a=audio(); if(!a) return;
    var t=Number(a.currentTime||0);
    if(Math.abs(t-lastTime)>0.04){ lastTime=t; lastMoveAt=Date.now(); }
    if(reason) lastReason=reason;
  }
  function tick(){
    var a=audio();
    if(!a){ publish('IDLE','no-audio-element',0,null); return; }
    var t=Number(a.currentTime||0);
    if(Math.abs(t-lastTime)>0.04){ lastTime=t; lastMoveAt=Date.now(); }
    var stallMs=Date.now()-lastMoveAt;
    var wanting=wantsPlayback(a);
    var state='IDLE';
    var reason='idle';
    if(a.error){ state='ERROR'; reason='media-error'; }
    else if(!wanting){ state='IDLE'; reason='not-playing'; stallMs=0; lastMoveAt=Date.now(); }
    else if(a.readyState<2 || a.networkState===2){ state='BUFFERING'; reason='buffering-or-low-ready-state'; }
    else if(stallMs>8500){ state='STALL'; reason='currentTime-stall'; }
    else { state='OK'; reason=lastReason||'playing'; }
    var body=document.body;
    var recovered=(body&&body.getAttribute('data-last-audio-recover-disabled'))||(body&&body.getAttribute('data-last-safe-play-disabled'))||(body&&body.getAttribute('data-last-rare-reconnect-disabled'))||'';
    if(recovered && recovered!==lastStep){ lastStep=recovered; recoverCount+=1; }
    publish(state,reason,stallMs,a);
  }
  function bind(){
    ensureChip();
    var a=audio();
    if(a && !a.__s666WatchdogV1Bound){
      a.__s666WatchdogV1Bound=true;
      ['play','playing','timeupdate','canplay','loadeddata'].forEach(function(ev){a.addEventListener(ev,function(){mark(ev);tick();},{passive:true});});
      ['waiting','stalled','suspend','emptied','pause','ended','error'].forEach(function(ev){a.addEventListener(ev,function(){lastReason=ev;setTimeout(tick,150);},{passive:true});});
    }
    tick();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
  window.addEventListener('load',bind,{once:true});
  setInterval(tick,1500);
})();
