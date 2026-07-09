/* 666SOUNDsDESIGn canonical version core — VELUNA iPhone fixed fullscreen geometry patch v1.2.10. */
(function(){
  'use strict';
  var VERSION='v2026.07.09-veluna10';
  var BUILD='2026-07-09-veluna-v1210';
  window.SMFP_VERSION={label:VERSION,build:BUILD,cacheBust:BUILD,number:20260709,release:'FULLVERSION_VELUNA_IPHONE_FIXED_FULLSCREEN_GEOMETRY_v1.2.10'};
  function setText(node){
    if(!node)return;
    if(node.id==='pcVersionBadge'){var status=node.querySelector('.status-code');if(status)status.textContent=VERSION;node.setAttribute('aria-label','Player Version '+VERSION);return;}
    if(node.classList&&(node.classList.contains('smfp-version-badge')||node.classList.contains('status-code')||node.classList.contains('mff-version-inline'))){
      if(/^v[\w.\-]+$/i.test((node.textContent||'').trim()))node.textContent=VERSION;
      node.setAttribute('data-smfp-version-core','1');
    }
  }
  function normalize(){
    try{document.documentElement.setAttribute('data-smfp-version',VERSION);document.documentElement.setAttribute('data-smfp-cache-bust',BUILD);var meta=document.querySelector('meta[name="smfp-version"]');if(meta)meta.setAttribute('content',VERSION);document.querySelectorAll('#pcVersionBadge,.smfp-version-badge,.mff-version-inline,.status-code').forEach(setText);var app=document.getElementById('mffApp');if(app)app.setAttribute('data-version',VERSION);}catch(_){}
  }
  window.SMFPApplyVersion=normalize;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
})();
