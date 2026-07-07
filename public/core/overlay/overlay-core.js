/*
==========================================
DATEI: core/overlay/overlay-core.js
ERSTELLT: 2026-05-19
GEÄNDERT: 2026-05-19
ZWECK:
- Zentraler Overlay-Core für bestehende Overlays.
- Keine neuen sichtbaren Panels. Nur Registry, Viewport-Lock und Fokus-Schutz.
- Bestehende Module können SMFPOverlayCore.open/close/withLock nutzen.
==========================================
*/
(function(){
  'use strict';
  var registry = Object.create(null);
  var openCount = 0;
  var lastScrollY = 0;
  function qs(x){ return typeof x === 'string' ? document.querySelector(x) : x; }
  function app(){ return document.getElementById('mffApp'); }
  function lock(){
    try{
      if(openCount <= 0) lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      openCount++;
      document.documentElement.classList.add('smfp-overlay-locked');
      document.body && document.body.classList.add('smfp-overlay-locked');
      var a=app(); if(a) a.classList.add('smfp-overlay-lock-host');
      document.documentElement.style.setProperty('--smfp-overlay-scroll-y', String(lastScrollY));
    }catch(e){}
  }
  function unlock(force){
    try{
      if(force) openCount = 0;
      else openCount = Math.max(0, openCount-1);
      if(openCount === 0){
        document.documentElement.classList.remove('smfp-overlay-locked');
        document.body && document.body.classList.remove('smfp-overlay-locked');
        var a=app(); if(a) a.classList.remove('smfp-overlay-lock-host');
        if(window.matchMedia && window.matchMedia('(max-width:760px)').matches){
          window.scrollTo(0, lastScrollY || 0);
          setTimeout(function(){ window.scrollTo(0, lastScrollY || 0); }, 60);
        }
      }
    }catch(e){}
  }
  function register(name, selectorOrNode, opts){
    if(!name) return null;
    registry[name] = { target: selectorOrNode, opts: opts || {} };
    return registry[name];
  }
  function targetOf(nameOrNode){
    if(typeof nameOrNode !== 'string') return qs(nameOrNode);
    if(registry[nameOrNode]) return qs(registry[nameOrNode].target);
    return qs(nameOrNode);
  }
  function open(nameOrNode){
    var el = targetOf(nameOrNode);
    if(!el) return false;
    lock();
    try{
      el.setAttribute('data-smfp-overlay-open','1');
      el.setAttribute('aria-hidden','false');
      el.classList.add('smfp-overlay-open');
      if(el.classList.contains('is-hidden')) el.classList.remove('is-hidden');
      if(!el.classList.contains('is-open')) el.classList.add('is-open');
    }catch(e){}
    return true;
  }
  function close(nameOrNode){
    var el = targetOf(nameOrNode);
    if(!el){ unlock(); return false; }
    try{
      el.removeAttribute('data-smfp-overlay-open');
      el.setAttribute('aria-hidden','true');
      el.classList.remove('smfp-overlay-open','is-open');
      if(!el.classList.contains('is-hidden') && /Overlay|Backdrop|Modal/i.test(el.id||'')){
        /* Nicht erzwingen: bestehende Module steuern display selbst. */
      }
    }catch(e){}
    unlock();
    return true;
  }
  function withLock(fn){
    lock();
    try{ return fn && fn(); }
    finally{ setTimeout(function(){ unlock(); }, 0); }
  }
  function protectTextFields(root){
    try{
      (root||document).querySelectorAll('textarea,input,select').forEach(function(el){
        if(el.__smfpOverlayProtected) return;
        el.__smfpOverlayProtected = true;
        el.classList.add('smfp-overlay-textfield');
        el.addEventListener('focus', function(){ lock(); }, {passive:true});
        el.addEventListener('blur', function(){ setTimeout(function(){ unlock(); }, 120); }, {passive:true});
      });
    }catch(e){}
  }
  function boot(){
    protectTextFields(document);
    register('history','#mffHistoryOverlay');
    register('player-alert-editor','#mffAlertEditorBackdrop');
    register('player-alert-receive','#playerAlertReceiveBackdrop');
    register('discord-gate','#s666DiscordGateOverlay');
    register('discord-denied','#s666DiscordDeniedOverlay');
    try{
      new MutationObserver(function(muts){
        muts.forEach(function(m){
          (m.addedNodes||[]).forEach(function(n){ if(n && n.nodeType===1) protectTextFields(n); });
        });
      }).observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
  }
  window.SMFPOverlayCore={version:'v178-overlay-core',register:register,open:open,close:close,lock:lock,unlock:unlock,withLock:withLock,protectTextFields:protectTextFields};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
