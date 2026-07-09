/*
  666SOUNDsDESIGn — VERSION CORE v178
  Zweck: Eine zentrale Versionsquelle für PC/iPhone/Worker-UI.
  Keine neuen sichtbaren Layer, nur Normalisierung vorhandener Versionselemente.
*/
(function(){
  'use strict';
  var VERSION='v2026.07.08-veluna8';
  var BUILD='2026-07-08-veluna-v128';
  window.SMFP_VERSION={label:VERSION, build:BUILD, number:20260708};
  function setText(node){
    if(!node) return;
    if(node.id==='pcVersionBadge'){
      var s=node.querySelector('.status-code');
      if(s) s.textContent=VERSION;
      node.setAttribute('aria-label','Player Version '+VERSION);
      return;
    }
    if(node.classList && (node.classList.contains('smfp-version-badge') || node.classList.contains('status-code') || node.classList.contains('mff-version-inline'))){
      if(/^v\d+$/i.test((node.textContent||'').trim())) node.textContent=VERSION;
      node.setAttribute('data-smfp-version-core','1');
    }
  }
  function normalize(){
    try{
      document.documentElement.setAttribute('data-smfp-version', VERSION);
      document.documentElement.setAttribute('data-smfp-cache-bust', BUILD);
      var meta=document.querySelector('meta[name="smfp-version"]');
      if(meta) meta.setAttribute('content', VERSION);
      document.querySelectorAll('#pcVersionBadge,.smfp-version-badge,.mff-version-inline,.status-code').forEach(setText);
      var app=document.getElementById('mffApp');
      if(app) app.setAttribute('data-version', VERSION);
    }catch(e){}
  }
  window.SMFPApplyVersion=normalize;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', normalize, {once:true});
  else normalize();
})();
