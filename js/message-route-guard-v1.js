/*
  666SOUNDsDESIGn — MESSAGE ROUTE GUARD V1 — v35.7.0
  Schützt vorhandenen Player Alert / Discord Shooter. Keine neue Backend-Route.
*/
(function(){
  'use strict';
  if(window.__S666MessageRouteGuardV1Installed)return;
  window.__S666MessageRouteGuardV1Installed=true;
  var routes=['/api/player-alert/status','/api/discord/status'];
  function qs(s,r){return (r||document).querySelector(s);}
  function setState(name,value){try{document.documentElement.setAttribute('data-message-route-'+name,value);document.body.setAttribute('data-message-route-'+name,value);}catch(e){}}
  async function check(){
    for(var i=0;i<routes.length;i++){
      var route=routes[i]; var name=route.indexOf('discord')>=0?'discord':'player-alert';
      try{
        var r=await fetch(route+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'});
        setState(name,r.ok?'ok':'http-'+r.status);
      }catch(e){setState(name,'unreachable');}
    }
  }
  function markSendUi(){
    var btn=qs('#playerAlertPcSend')||qs('#mffAlertSend');
    if(btn && !btn.getAttribute('data-message-route-guard')){
      btn.setAttribute('data-message-route-guard','active');
      btn.title=(btn.title?btn.title+' · ':'')+'Message Guard active: vorhandene Player/Discord-Routen werden verwendet.';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){markSendUi();check();},{once:true});else{markSendUi();check();}
  setInterval(function(){markSendUi();check();},30000);
})();
