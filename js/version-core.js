/*
  666SOUNDsDESIGn — VERSION CORE v2026.06.30-auth-hardlock1
  Zweck: Eine zentrale Versionsquelle für PC/iPhone/Worker-UI.
  Keine neuen sichtbaren Layer, nur Normalisierung vorhandener Versionselemente.
*/
(function(){
  'use strict';
  var VERSION='v2026.06.30-auth-hardlock1';
  var BUILD='smfp-v2026-06-30-auth-hardlock1';
  window.SMFP_VERSION={label:VERSION, build:BUILD, cacheBust:BUILD, number:20260630};
  function setText(node){
    if(!node) return;
    if(node.id==='pcVersionBadge'){
      var s=node.querySelector('.status-code');
      if(s) s.textContent=VERSION;
      node.setAttribute('aria-label','Player Version '+VERSION);
      node.setAttribute('title','Player Version '+VERSION);
      return;
    }
    if(node.classList && (node.classList.contains('smfp-version-badge') || node.classList.contains('mff-version-inline') || node.classList.contains('system-version-badge'))){
      var inner=node.querySelector&&node.querySelector('.status-code');
      if(inner) inner.textContent=VERSION; else node.textContent=VERSION;
      node.setAttribute('data-smfp-version-core','1');
    }
  }
  function normalize(){
    try{
      document.documentElement.setAttribute('data-smfp-version', VERSION);
      document.documentElement.setAttribute('data-smfp-cache-bust', BUILD);
      var meta=document.querySelector('meta[name="smfp-version"]');
      if(meta) meta.setAttribute('content', VERSION);
      document.querySelectorAll('#pcVersionBadge,.smfp-version-badge,.mff-version-inline,.system-version-badge').forEach(setText);
      var app=document.getElementById('mffApp');
      if(app) app.setAttribute('data-version', VERSION);
    }catch(e){}
  }
  window.SMFPApplyVersion=normalize;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', normalize, {once:true});
  else normalize();
  window.addEventListener('load',normalize,{once:true});
  try{
    new MutationObserver(function(records){
      for(var i=0;i<records.length;i++){
        var r=records[i];
        if(r.type==='childList' || r.type==='characterData'){ normalize(); break; }
      }
    }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }catch(e){}
})();
