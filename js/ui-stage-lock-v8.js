
/* 666SOUNDsDESIGn — v8 Stage Lock
   PC proportional, iPhone feste Fullscreen-App. Overlays dürfen Player nicht vergrößern. */
(function(){
  'use strict';
  if(window.__S666_STAGE_LOCK_V8__) return; window.__S666_STAGE_LOCK_V8__=true;
  function isMobile(){return matchMedia('(max-width:760px)').matches || /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent||'');}
  function lock(){
    if(isMobile()){
      document.documentElement.classList.add('s666-mobile-stage-lock');
      if(document.body)document.body.classList.add('s666-mobile-stage-lock');
      try{window.scrollTo(0,0)}catch(e){}
    }else{
      document.documentElement.classList.add('s666-pc-stage-lock');
    }
  }
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev,function(e){if(isMobile()&&e.cancelable)e.preventDefault();},{passive:false}));
  document.addEventListener('touchmove',function(e){ if(isMobile() && e.touches && e.touches.length>1 && e.cancelable)e.preventDefault(); },{passive:false});
  window.addEventListener('resize',lock,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true}); else lock();
  window.addEventListener('load',lock,{passive:true}); setInterval(lock,1500);
})();
