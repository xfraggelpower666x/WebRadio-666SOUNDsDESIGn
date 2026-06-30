/* VERSION_STATE_GUARD_V2_20260630 — delegates to the canonical VERSION CORE. */
(function(){
  'use strict';
  function apply(){
    if(window.SMFPApplyVersion) window.SMFPApplyVersion();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('load',apply,{once:true});
  setInterval(apply,5000);
})();
