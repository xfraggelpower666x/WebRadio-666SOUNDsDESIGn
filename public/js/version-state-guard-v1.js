/* VERSION_STATE_GUARD_V1_20260525 */
(function(){
"use strict";
var VERSION="v2026.05.25-ticker-shortloop-v1", CACHE="ticker-shortloop-v1-20260525";
window.__S666_BUILD_VERSION__=VERSION;
window.__S666_CACHE_BURST__=CACHE;
function put(el){if(!el)return;var c=el.querySelector&&el.querySelector(".status-code"); if(c)c.textContent=VERSION; else el.textContent=VERSION; el.title="Build "+VERSION+" / Cache "+CACHE;}
function apply(){document.documentElement.setAttribute("data-s666-build-version",VERSION);document.documentElement.setAttribute("data-s666-cache-burst",CACHE);
["#pcVersionBadge","#mffVersion","#mobileVersionBadge","[data-version-badge]",".system-version-badge"].forEach(function(s){document.querySelectorAll(s).forEach(put);});
document.querySelectorAll("meta[name='smfp-version']").forEach(function(m){m.content=VERSION;});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
setInterval(apply,1500);
})();
