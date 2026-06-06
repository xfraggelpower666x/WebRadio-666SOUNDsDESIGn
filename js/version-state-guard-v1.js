/*
  666SOUNDsDESIGn — VERSION STATE GUARD v36.2.0
  Zweck: Eine zentrale Versionsquelle für PC/iPhone/Worker-UI.
  Rebased auf vollständige aktuelle Repo-ZIP vom 2026-06-05.
  Keine Secrets. Keine Worker-Änderung. DarkDancer bleibt geschützt.
*/
(function(){
  'use strict';
  var VERSION='v36.2.0';
  var BUILD='v36.2.0-2026-06-05-split-booster-pc-mobile';
  var NUMBER=362;
  window.SMFP_VERSION={label:VERSION, build:BUILD, number:NUMBER, cacheBust:BUILD};
  window.__S666_BUILD_VERSION__=VERSION;
  window.__S666_CACHE_BURST__=BUILD;
  function putVersion(node){
    if(!node) return;
    var target=node.querySelector&&node.querySelector('.status-code');
    if(target) target.textContent=VERSION;
    else node.textContent=VERSION;
    node.setAttribute('data-smfp-version-core','1');
    node.setAttribute('title','Build '+VERSION+' / Cache '+BUILD);
    if(node.id==='pcVersionBadge') node.setAttribute('aria-label','Player Version '+VERSION);
  }
  function normalize(){
    try{
      document.documentElement.setAttribute('data-smfp-version', VERSION);
      document.documentElement.setAttribute('data-s666-build-version', VERSION);
      document.documentElement.setAttribute('data-smfp-cache-bust', BUILD);
      document.documentElement.setAttribute('data-s666-cache-burst', BUILD);
      var meta=document.querySelector('meta[name="smfp-version"]');
      if(meta) meta.setAttribute('content', VERSION);
      var burst=document.querySelector('meta[name="s666-cache-burst"]');
      if(burst) burst.setAttribute('content', BUILD);
      document.querySelectorAll('#pcVersionBadge,#mffVersion,#mobileVersionBadge,[data-version-badge],.system-version-badge,.smfp-version-badge,.mff-version-inline').forEach(putVersion);
      var app=document.getElementById('mffApp');
      if(app){ app.setAttribute('data-version', VERSION); app.setAttribute('data-cache-burst', BUILD); }
    }catch(e){}
  }
  window.SMFPApplyVersion=normalize;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', normalize, {once:true});
  else normalize();
  window.addEventListener('load', normalize, {once:true});
  setInterval(normalize, 1500);
})();
