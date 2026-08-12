/* VELUNA legacy splash compatibility stub v2.0.0
 * The central radio boot owner is now the only startup surface for every player.
 * Intentionally does not create DOM, video, timers or navigation.
 */
(()=>{
  'use strict';
  document.documentElement.setAttribute('data-veluna-legacy-splash','disabled-central-boot-owner');
  for(const node of document.querySelectorAll('[data-veluna-central-splash="1"]')){
    try{node.remove();}catch(_){}
  }
})();
