
/* ==========================================================
   666SOUNDsDESIGn — v150 Player Broadcast CacheBus Fix
   One-way public message sender for all open players.
   Rate limited server-side to 1 message / 180 seconds.
   Own messages are not shown again on the sender's player.
   ========================================================== */
(function(){
  'use strict';
  var VERSION='v152-alert-fix-20260515';
  var SEND_URL='/api/player-alert/send';
  var CURRENT_URL='/api/player-alert/current';
  var POLL_MS=10000;
  var MAX_LEN=240;
  var SENDER_KEY='s666_player_alert_sender_v152';
  var LAST_SEEN_KEY='s666_player_alert_seen_v152';
  var LAST_SENT_KEY='s666_player_alert_last_sent_v152';
  function qs(sel,root){return (root||document).querySelector(sel)}
  function makeSenderId(){
    var id='';
    try{id=localStorage.getItem(SENDER_KEY)||'';}catch(_){ }
    if(!id){
      id='s666-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      try{localStorage.setItem(SENDER_KEY,id);}catch(_){ }
    }
    return id;
  }
  var senderId=makeSenderId();
  function safeText(text){return String(text||'').replace(/[<>]/g,'').trim().slice(0,MAX_LEN)}
  function getLastSeen(){try{return localStorage.getItem(LAST_SEEN_KEY)||'';}catch(_){return ''}}
  function setLastSeen(id){try{localStorage.setItem(LAST_SEEN_KEY,String(id||''));}catch(_){}}
  function rememberOwn(id){try{localStorage.setItem(LAST_SENT_KEY,String(id||''));}catch(_){}}
  function isOwn(id,from){return String(from||'')===senderId || String(id||'')===(function(){try{return localStorage.getItem(LAST_SENT_KEY)||''}catch(_){return ''}})();}
  function ensureListenerOverlay(){
    var overlay=qs('#s666PlayerAlertOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='s666PlayerAlertOverlay';
    overlay.className='s666-player-alert-overlay is-hidden';
    overlay.innerHTML='<div class="s666-player-alert-box" role="dialog" aria-modal="true" aria-label="666SOUNDsDESIGn Broadcast Message"><div class="s666-player-alert-title">666SOUNDsDESIGn Broadcast Message</div><div class="s666-player-alert-text"></div><div class="s666-player-alert-actions"><button type="button" class="s666-player-alert-button" data-alert-close>OK / CLOSE</button></div></div>';
    overlay.addEventListener('click',function(ev){if(ev.target===overlay || ev.target.closest('[data-alert-close]')) closeListenerOverlay();});
    document.body.appendChild(overlay);
    return overlay;
  }
  function showListenerOverlay(message,id){
    var overlay=ensureListenerOverlay();
    var box=qs('.s666-player-alert-text',overlay);
    if(box)box.textContent=safeText(message);
    overlay.classList.remove('is-hidden');
    if(id)setLastSeen(id);
  }
  function closeListenerOverlay(){var overlay=qs('#s666PlayerAlertOverlay'); if(overlay)overlay.classList.add('is-hidden');}
  function ensureComposer(){
    var overlay=qs('#s666PlayerAlertComposer');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='s666PlayerAlertComposer';
    overlay.className='s666-player-alert-composer is-hidden';
    overlay.innerHTML='<div class="s666-player-alert-composer-box" role="dialog" aria-modal="true" aria-label="Send Player Message"><div class="s666-player-alert-title">Send Player Message</div><div class="s666-player-alert-meta" aria-live="polite">Max. '+MAX_LEN+' characters. One message every 3 minutes.</div><textarea maxlength="'+MAX_LEN+'" placeholder="Write one, two or three short sentences..."></textarea><div class="s666-player-alert-actions"><button type="button" class="s666-player-alert-button" data-compose-cancel>CLOSE</button><button type="button" class="s666-player-alert-button" data-compose-send>SEND</button></div></div>';
    overlay.addEventListener('click',function(ev){
      if(ev.target===overlay || ev.target.closest('[data-compose-cancel]')) closeComposer();
      if(ev.target.closest('[data-compose-send]')) sendFromComposer();
    });
    document.body.appendChild(overlay);
    return overlay;
  }
  function openComposer(){
    var overlay=ensureComposer();
    var text=qs('textarea',overlay), meta=qs('.s666-player-alert-meta',overlay);
    if(meta){meta.classList.remove('is-error');meta.textContent='Max. '+MAX_LEN+' characters. One message every 3 minutes.';}
    overlay.classList.remove('is-hidden');
    setTimeout(function(){try{text&&text.focus()}catch(_){ }},80);
  }
  function closeComposer(){var overlay=qs('#s666PlayerAlertComposer'); if(overlay)overlay.classList.add('is-hidden');}
  function setComposerMeta(text,error){var overlay=ensureComposer(),meta=qs('.s666-player-alert-meta',overlay); if(meta){meta.textContent=text||'';meta.classList.toggle('is-error',!!error);}}
  async function postMessage(text){
    var clean=safeText(text);
    if(!clean)throw new Error('Message is empty.');
    var res=await fetch(SEND_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:clean,clientId:senderId,senderId:senderId,version:VERSION})});
    var data={}; try{data=await res.json()}catch(_){ }
    if(!res.ok){
      var retry=data.retryAfter||data.retry_after||data.retryAfterMs||0;
      if(retry>1000)retry=Math.ceil(retry/1000);
      if(res.status===429)throw new Error('Rate limit active. Try again in '+retry+' seconds.');
      throw new Error(data.error||'Send failed.');
    }
    if(data.id){rememberOwn(data.id);setLastSeen(data.id);}
    return data;
  }
  async function sendFromComposer(){
    var overlay=ensureComposer();
    var text=qs('textarea',overlay);
    try{
      var data=await postMessage(text?text.value:'');
      if(text)text.value='';
      setComposerMeta('Message sent. It will appear on other open players.',false);
      setTimeout(closeComposer,900);
      updateCooldownLabel(180);
    }catch(e){setComposerMeta(e&&e.message?e.message:'Send failed.',true);}
  }
  async function sendFromPcInline(){
    var input=qs('#playerAlertPcText') || qs('#pcBroadcastInput');
    var label=qs('#playerAlertPcStatus') || qs('#pcBroadcastCooldown');
    try{
      var data=await postMessage(input?input.value:'');
      if(input)input.value='';
      if(label)label.textContent='SENT';
      setTimeout(function(){if(label)label.textContent='';},1400);
      updateCooldownLabel(180);
    }catch(e){if(label)label.textContent=(e&&e.message?e.message:'ERR').replace('Rate limit active. ','');}
  }
  function mountPc(){
    var btn=qs('#playerAlertPcSend') || qs('#pcBroadcastSendBtn');
    var input=qs('#playerAlertPcText') || qs('#pcBroadcastInput');

    if(window.innerWidth<=760 && btn){
      btn.addEventListener('click',function(ev){
        ev.preventDefault();
        openComposer();
      });
      return;
    }
    if(btn && !btn.__s666AlertBound){btn.__s666AlertBound=true;btn.addEventListener('click',function(ev){ev.preventDefault();sendFromPcInline();});}
    if(input && !input.__s666AlertBound){input.__s666AlertBound=true;input.addEventListener('keydown',function(ev){if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();sendFromPcInline();}});}
  }
  function mountMobile(){
    var app=qs('#mffApp');
    if(!app)return;
    if(qs('#s666PlayerAlertMobileSlot',app))return;
    var slot=document.createElement('div');
    slot.id='s666PlayerAlertMobileSlot';
    slot.innerHTML='<button type="button" class="s666-player-alert-mobile-button">SEND MESSAGE</button>';
    var anchor=qs('.mff-discord-slot',app) || qs('.mff-panel-led-panel',app) || qs('.mff-now',app);
    if(anchor && anchor.parentNode){anchor.parentNode.insertBefore(slot,anchor.nextSibling);}else{app.appendChild(slot);}
    var btn=qs('button',slot);
    if(btn)btn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();openComposer();},{capture:true});
    if(btn)btn.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();openComposer();},{passive:false,capture:true});
  }
  async function poll(){
    try{
      var res=await fetch(CURRENT_URL+'?t='+Date.now(),{headers:{'cache-control':'no-store'}});
      if(!res.ok)return;
      var data=await res.json();
      if(!data || !data.active || !data.id || !data.message)return;
      if(String(data.id)===getLastSeen())return;
      if(isOwn(data.id,data.senderId||data.clientId)){setLastSeen(data.id);return;}
      showListenerOverlay(data.message,data.id);
    }catch(_){ }
  }
  function updateCooldownLabel(seconds){
    var label=qs('#pcBroadcastCooldown');
    var end=Date.now()+Math.max(0,seconds||0)*1000;
    function tick(){
      var left=Math.ceil((end-Date.now())/1000);
      if(left<=0){if(label)label.textContent='';return;}
      if(label)label.textContent='WAIT '+left+'s';
      setTimeout(tick,1000);
    }
    tick();
  }
  function boot(){
    mountPc();
    mountMobile();
    ensureListenerOverlay();
    ensureComposer();
    poll();
    setInterval(function(){mountPc();mountMobile();poll();},POLL_MS);
    
    // v152 delegated click fallback: visible SEND button must always trigger, even if mounted late.
    document.addEventListener('click',function(ev){
      var target=ev.target && ev.target.closest ? ev.target.closest('#playerAlertPcSend,[data-player-alert-send]') : null;
      if(!target)return;
      ev.preventDefault();
      ev.stopPropagation();
      sendFromPcInline();
    },true);

    document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){closeListenerOverlay();closeComposer();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
