/*
==========================================
DATEI: core/overlay/overlay-core.js
ERSTELLT: 2026-05-19
GEÄNDERT: 2026-07-20
ZWECK:
- Zentraler Overlay-Core für 666 PLAYER, VELUNA und internen Notfallplayer.
- Bestehende Overlays viewport-zentrieren, Safe-Area schützen und intern scrollbar halten.
- Keine Farben, Hintergründe, Rahmen oder Typografie der Player-Themes überschreiben.
==========================================
*/
(function(){
  'use strict';

  var registry = Object.create(null);
  var openCount = 0;
  var lastScrollY = 0;
  var OVERLAY_SELECTOR = [
    '.overlay','.panel-overlay','.history-overlay','.admin-overlay','.admin-panel',
    '.fp-admin-overlay','.s666-sound-overlay','.s666msg-overlay',
    '.s666-discord-gate','.s666-discord-denied','.s666-player-alert-overlay',
    '#s666AdminAuthOverlay','#mffHistoryOverlay','#mffHistoryBackdrop',
    '#mffAlertEditorBackdrop','#playerAlertReceiveBackdrop','#s666DiscordGateOverlay',
    '#s666DiscordDeniedOverlay','#s666SoundControlOverlay','#s666MsgOverlay',
    '#fp-admin-overlay','#smfpMobileEqOverlay'
  ].join(',');
  var PANEL_SELECTOR = [
    '[role="dialog"]','.overlay-panel','.panel-inner','.history-panel','.admin-panel',
    '.sound-panel','.s666-sound-panel','.s666msg-panel','.s666-discord-gate__panel',
    '.s666-discord-denied__panel','.mff-history-overlay','#mffAlertEditor',
    '#playerAlertReceivePanel','#smfpMobileEqPanel'
  ].join(',');
  var CLOSE_SELECTOR = [
    '[data-overlay-close]','[data-close]','[data-mff-history-close]',
    '.overlay-close','.panel-close','.history-close','.admin-close','.close-btn',
    '.mff-history-close','.smfp-eq-ok','button[aria-label*="close" i]',
    'button[aria-label*="schließen" i]'
  ].join(',');

  function qs(x){ return typeof x === 'string' ? document.querySelector(x) : x; }
  function app(){ return document.getElementById('mffApp'); }

  function updateViewportVars(){
    try{
      var vv = window.visualViewport;
      var root = document.documentElement;
      root.style.setProperty('--smfp-overlay-vv-height', ((vv && vv.height) || window.innerHeight || 0) + 'px');
      root.style.setProperty('--smfp-overlay-vv-width', ((vv && vv.width) || window.innerWidth || 0) + 'px');
      root.style.setProperty('--smfp-overlay-vv-top', ((vv && vv.offsetTop) || 0) + 'px');
      root.style.setProperty('--smfp-overlay-vv-left', ((vv && vv.offsetLeft) || 0) + 'px');
    }catch(e){}
  }

  function markCloseButtons(root){
    try{
      (root || document).querySelectorAll(CLOSE_SELECTOR).forEach(function(button){
        button.classList.add('smfp-overlay-close-managed');
      });
    }catch(e){}
  }

  function panelOf(overlay){
    if(!overlay) return null;
    if(overlay.matches && overlay.matches('[role="dialog"],.mff-history-overlay,#smfpMobileEqPanel')) return overlay;
    try{
      return overlay.querySelector(PANEL_SELECTOR) || Array.prototype.find.call(overlay.children || [], function(child){
        return child && child.nodeType === 1 && !child.matches('script,style,link');
      }) || null;
    }catch(e){ return null; }
  }

  function manageOverlay(overlay){
    if(!overlay || overlay.nodeType !== 1) return null;
    try{
      overlay.classList.add('smfp-overlay-managed');
      overlay.setAttribute('data-smfp-overlay-managed','1');
      var panel = panelOf(overlay);
      if(panel){
        panel.classList.add('smfp-overlay-panel-managed');
        panel.setAttribute('data-smfp-overlay-panel','1');
        markCloseButtons(panel);
      }else{
        markCloseButtons(overlay);
      }
      return overlay;
    }catch(e){ return overlay; }
  }

  function scanOverlays(root){
    try{
      var scope = root || document;
      if(scope.matches && scope.matches(OVERLAY_SELECTOR)) manageOverlay(scope);
      scope.querySelectorAll && scope.querySelectorAll(OVERLAY_SELECTOR).forEach(manageOverlay);
    }catch(e){}
  }

  function lock(){
    try{
      if(openCount <= 0) lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      openCount++;
      updateViewportVars();
      document.documentElement.classList.add('smfp-overlay-locked');
      document.body && document.body.classList.add('smfp-overlay-locked');
      var a = app(); if(a) a.classList.add('smfp-overlay-lock-host');
      document.documentElement.style.setProperty('--smfp-overlay-scroll-y', String(lastScrollY));
    }catch(e){}
  }

  function unlock(force){
    try{
      if(force) openCount = 0;
      else openCount = Math.max(0, openCount - 1);
      if(openCount === 0){
        document.documentElement.classList.remove('smfp-overlay-locked');
        document.body && document.body.classList.remove('smfp-overlay-locked');
        var a = app(); if(a) a.classList.remove('smfp-overlay-lock-host');
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
    var target = targetOf(name);
    if(target) manageOverlay(target);
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
    manageOverlay(el);
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
      (root || document).querySelectorAll('textarea,input,select').forEach(function(el){
        if(el.__smfpOverlayProtected) return;
        el.__smfpOverlayProtected = true;
        el.classList.add('smfp-overlay-textfield');
        el.addEventListener('focus', function(){ updateViewportVars(); }, {passive:true});
      });
    }catch(e){}
  }

  function boot(){
    updateViewportVars();
    protectTextFields(document);
    scanOverlays(document);
    register('history','#mffHistoryOverlay');
    register('player-alert-editor','#mffAlertEditorBackdrop');
    register('player-alert-receive','#playerAlertReceiveBackdrop');
    register('discord-gate','#s666DiscordGateOverlay');
    register('discord-denied','#s666DiscordDeniedOverlay');
    register('sound','#s666SoundControlOverlay');
    register('message','#s666MsgOverlay');
    register('admin','#fp-admin-overlay');
    try{
      new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
          (mutation.addedNodes || []).forEach(function(node){
            if(!node || node.nodeType !== 1) return;
            protectTextFields(node);
            scanOverlays(node);
          });
        });
      }).observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
    window.addEventListener('resize',updateViewportVars,{passive:true});
    window.addEventListener('orientationchange',updateViewportVars,{passive:true});
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',updateViewportVars,{passive:true});
      window.visualViewport.addEventListener('scroll',updateViewportVars,{passive:true});
    }
  }

  window.SMFPOverlayCore = {
    version:'v179-overlay-safe-area-core',
    register:register,
    open:open,
    close:close,
    lock:lock,
    unlock:unlock,
    withLock:withLock,
    protectTextFields:protectTextFields,
    manageOverlay:manageOverlay,
    scanOverlays:scanOverlays,
    updateViewport:updateViewportVars
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
