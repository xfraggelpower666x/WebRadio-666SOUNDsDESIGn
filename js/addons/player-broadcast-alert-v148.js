/* ==========================================================
   666SOUNDsDESIGn — BROADCAST CLEANUP V2
   - Username prompt once per browser session.
   - Username stored only in sessionStorage.
   - lastAck/lastSeen uses stable fingerprint fallback if backend id changes/missing.
   - Cache-busted API calls.
   - SENT / FAILED LED states supported.
   - PC + iPhone use same core logic.
   ========================================================== */
(function(){
  'use strict';
  var VERSION='broadcast-cleanup-v2-20260525';
  var SEND_URL='/api/player-alert/send';
  var CURRENT_URL='/api/player-alert/current';
  var POLL_MS=10000;
  var MAX_LEN=240;

  var SENDER_KEY='s666_player_alert_sender_v152';
  var USERNAME_KEY='s666_broadcast_username_session_v2';
  var LAST_ACK_KEY='s666_alert_last_ack_key_v2';
  var LAST_SEEN_KEY='s666_player_alert_seen_v152';
  var LAST_SENT_KEY='s666_player_alert_last_sent_v152';

  function qs(sel,root){return (root||document).querySelector(sel)}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function now(){return Date.now()}
  function safeText(text){return String(text||'').replace(/[<>]/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,MAX_LEN)}
  function safeName(text){return String(text||'').replace(/[<>]/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,28)}

  function makeSenderId(){
    var id='';
    try{id=localStorage.getItem(SENDER_KEY)||'';}catch(_){}
    if(!id){
      id='s666-'+now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      try{localStorage.setItem(SENDER_KEY,id);}catch(_){}
    }
    return id;
  }
  var senderId=makeSenderId();

  function getUsername(){try{return sessionStorage.getItem(USERNAME_KEY)||'';}catch(_){return ''}}
  function setUsername(name){try{sessionStorage.setItem(USERNAME_KEY,safeName(name));}catch(_){ }}
  function ensureUsername(){
    var name=getUsername();
    if(name)return name;
    name=prompt('Dein Anzeigename für diese Broadcast-Sitzung?') || '';
    name=safeName(name);
    if(!name) name='Guest';
    setUsername(name);
    return name;
  }

  function stableKey(data){
    if(!data)return '';
    var id=String(data.id||'').trim();
    if(id)return 'id:'+id;
    var msg=safeText(data.message||'');
    var sender=String(data.senderId||data.clientId||data.username||'').trim();
    var ts=String(data.timestamp||data.createdAt||data.time||'').trim();
    return 'fp:'+sender+'|'+ts+'|'+msg;
  }
  function getLastAck(){try{return localStorage.getItem(LAST_ACK_KEY)||localStorage.getItem(LAST_SEEN_KEY)||'';}catch(_){return ''}}
  function setLastAck(key){try{localStorage.setItem(LAST_ACK_KEY,String(key||''));localStorage.setItem(LAST_SEEN_KEY,String(key||''));}catch(_){}}
  function rememberOwn(key){try{localStorage.setItem(LAST_SENT_KEY,String(key||''));}catch(_){}}
  function getLastOwn(){try{return localStorage.getItem(LAST_SENT_KEY)||'';}catch(_){return ''}}
  function isOwn(data,key){return String(data.senderId||data.clientId||'')===senderId || String(key||'')===getLastOwn();}

  function setLed(state,message){
    var status=qs('#playerAlertPcStatus')||qs('#pcBroadcastCooldown')||qs('[data-broadcast-status]');
    if(status){
      status.textContent=message || (state==='sent'?'SENT':state==='failed'?'FAILED':'READY');
      status.classList.remove('is-sent','is-failed','is-ready');
      status.classList.add(state==='sent'?'is-sent':state==='failed'?'is-failed':'is-ready');
    }
    qsa('[data-broadcast-led]').forEach(function(el){
      el.classList.remove('is-sent','is-failed','is-ready');
      el.classList.add(state==='sent'?'is-sent':state==='failed'?'is-failed':'is-ready');
      el.setAttribute('title',message||state);
    });
  }

  function ensureListenerOverlay(){
    var overlay=qs('#s666PlayerAlertOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='s666PlayerAlertOverlay';
    overlay.className='s666-player-alert-overlay is-hidden';
    overlay.innerHTML='<div class="s666-player-alert-box" role="dialog" aria-modal="true" aria-label="666SOUNDsDESIGn Broadcast Message"><div class="s666-player-alert-title">666SOUNDsDESIGn Broadcast Message</div><div class="s666-player-alert-user"></div><div class="s666-player-alert-text"></div><div class="s666-player-alert-actions"><button type="button" class="s666-player-alert-button" data-alert-close>OK / CLOSE</button></div></div>';
    overlay.addEventListener('click',function(ev){if(ev.target===overlay || ev.target.closest('[data-alert-close]')) closeListenerOverlay();});
    document.body.appendChild(overlay);
    return overlay;
  }
  function showListenerOverlay(data,key){
    var overlay=ensureListenerOverlay();
    var box=qs('.s666-player-alert-text',overlay);
    var user=qs('.s666-player-alert-user',overlay);
    if(user)user.textContent=safeName(data.username||data.name||'Broadcast');
    if(box)box.textContent=safeText(data.message);
    overlay.classList.remove('is-hidden');
    setLastAck(key);
  }
  function closeListenerOverlay(){
    var overlay=qs('#s666PlayerAlertOverlay');
    if(overlay)overlay.classList.add('is-hidden');
  }

  function ensureComposer(){
    var overlay=qs('#s666PlayerAlertComposer');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='s666PlayerAlertComposer';
    overlay.className='s666-player-alert-composer is-hidden';
    overlay.innerHTML='<div class="s666-player-alert-composer-box" role="dialog" aria-modal="true" aria-label="Send Player Message"><div class="s666-player-alert-title">Send Player Message</div><div class="s666-player-alert-meta" aria-live="polite">Max. '+MAX_LEN+' characters. One message every 3 minutes.</div><input class="s666-player-alert-name" maxlength="28" placeholder="Username for this session"><textarea maxlength="'+MAX_LEN+'" placeholder="Write one, two or three short sentences..."></textarea><div class="s666-player-alert-actions"><button type="button" class="s666-player-alert-button" data-compose-cancel>CLOSE</button><button type="button" class="s666-player-alert-button" data-compose-send>SEND</button></div></div>';
    overlay.addEventListener('click',function(ev){
      if(ev.target===overlay || ev.target.closest('[data-compose-cancel]')) closeComposer();
      if(ev.target.closest('[data-compose-send]')) sendFromComposer();
    });
    document.body.appendChild(overlay);
    return overlay;
  }
  function openComposer(){
    var overlay=ensureComposer();
    var text=qs('textarea',overlay), name=qs('.s666-player-alert-name',overlay), meta=qs('.s666-player-alert-meta',overlay);
    if(name)name.value=getUsername();
    if(meta){meta.classList.remove('is-error');meta.textContent='Max. '+MAX_LEN+' characters. One message every 3 minutes.';}
    overlay.classList.remove('is-hidden');
    setTimeout(function(){try{(text||name)&& (text||name).focus()}catch(_){ }},80);
  }
  function closeComposer(){var overlay=qs('#s666PlayerAlertComposer'); if(overlay)overlay.classList.add('is-hidden');}
  function setComposerMeta(text,error){var overlay=ensureComposer(),meta=qs('.s666-player-alert-meta',overlay); if(meta){meta.textContent=text||'';meta.classList.toggle('is-error',!!error);}}

  async function postMessage(text,username){
    var clean=safeText(text);
    if(!clean)throw new Error('Message is empty.');
    var user=safeName(username || getUsername() || ensureUsername());
    setUsername(user);
    var res=await fetch(SEND_URL+'?t='+now(),{
      method:'POST',
      cache:'no-store',
      headers:{'content-type':'application/json','cache-control':'no-store'},
      body:JSON.stringify({message:clean,username:user,clientId:senderId,senderId:senderId,version:VERSION})
    });
    var data={}; try{data=await res.json()}catch(_){}
    if(!res.ok){
      var retry=data.retryAfter||data.retry_after||data.retryAfterMs||0;
      if(retry>1000)retry=Math.ceil(retry/1000);
      if(res.status===429)throw new Error('Rate limit active. Try again in '+retry+' seconds.');
      throw new Error(data.error||'Send failed.');
    }
    var key=stableKey(data.id?data:{id:data.id,message:clean,username:user,senderId:senderId,timestamp:data.timestamp||now()});
    if(key){rememberOwn(key);setLastAck(key);}
    setLed('sent','SENT');
    return data;
  }

  async function sendFromComposer(){
    var overlay=ensureComposer();
    var text=qs('textarea',overlay), name=qs('.s666-player-alert-name',overlay);
    try{
      await postMessage(text?text.value:'',name?name.value:'');
      if(text)text.value='';
      setComposerMeta('Message sent. It will appear on other open players.',false);
      setTimeout(closeComposer,900);
      updateCooldownLabel(180);
    }catch(e){setLed('failed','FAILED');setComposerMeta(e&&e.message?e.message:'Send failed.',true);}
  }

  async function sendFromPcInline(){
    var input=qs('#playerAlertPcText') || qs('#pcBroadcastInput');
    try{
      await postMessage(input?input.value:'');
      if(input)input.value='';
      updateCooldownLabel(180);
      setTimeout(function(){setLed('ready','READY')},1600);
    }catch(e){setLed('failed',(e&&e.message?e.message:'FAILED').replace('Rate limit active. ',''));}
  }

  function mountPc(){
    var btn=qs('#playerAlertPcSend') || qs('#pcBroadcastSendBtn');
    var input=qs('#playerAlertPcText') || qs('#pcBroadcastInput');
    if(window.innerWidth<=760 && btn){
      if(!btn.__s666AlertMobileBound){
        btn.__s666AlertMobileBound=true;
        btn.addEventListener('click',function(ev){ev.preventDefault();openComposer();});
      }
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
      var res=await fetch(CURRENT_URL+'?t='+now(),{cache:'no-store',headers:{'cache-control':'no-store'}});
      if(!res.ok)return;
      var data=await res.json();
      if(!data || !data.active || !data.message)return;
      var key=stableKey(data);
      if(!key)return;
      if(String(key)===getLastAck())return;
      if(isOwn(data,key)){setLastAck(key);return;}
      showListenerOverlay(data,key);
    }catch(_){}
  }

  function updateCooldownLabel(seconds){
    var label=qs('#pcBroadcastCooldown');
    var end=now()+Math.max(0,seconds||0)*1000;
    function tick(){
      var left=Math.ceil((end-now())/1000);
      if(left<=0){if(label)label.textContent='';return;}
      if(label)label.textContent='WAIT '+left+'s';
      setTimeout(tick,1000);
    }
    tick();
  }

  function boot(){
    mountPc(); mountMobile(); ensureListenerOverlay(); ensureComposer(); setLed('ready','READY'); poll();
    setInterval(function(){mountPc();mountMobile();poll();},POLL_MS);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) setTimeout(poll,350); });
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){closeListenerOverlay();closeComposer();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
