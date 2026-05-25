/*
FILE: js/player-admin-overlay.js
CREATED: 2026-05-24
PURPOSE: Protected admin overlay.
*/
(function(){
  "use strict";
  const AUTH_LOGIN_URL="https://666-system-auth.666soundsdesign-broadcaster.com/login";
  const PW_HEALTH_URL="https://666-system-pw.666soundsdesign-broadcaster.com/health";
  const AUTH_HEALTH_URL="https://666-system-auth.666soundsdesign-broadcaster.com/health";
  const AUTH_DEBUG_URL="https://666-system-auth.666soundsdesign-broadcaster.com/debug";
  const SUNO_URL="https://666-suno-system.666soundsdesign-broadcaster.com";
  const SUNO_HEALTH_URL="https://666-suno-system.666soundsdesign-broadcaster.com/health";
  const CHAOS_AI_HEALTH_URL="https://666-chaos-ai-track-system.666soundsdesign-broadcaster.com/health";
  const CHAOS_ENGINE_URL="/CHAOS_ENGINE/index.html";
  const DARK_DANCER_URL="/The-Dark-Dancer";
  // DISCORD_ADMIN_MERGE_V1
  const DISCORD_SEND_URL="/api/discord/manual";
  const DISCORD_TEST_URL="/api/discord/test";
  const DISCORD_STATUS_URL="/api/discord/status";
  const $=id=>document.getElementById(id);
  let authOkCache=false,lastAuthCheck=0;
  function loginUrl(){return `${AUTH_LOGIN_URL}?next=${encodeURIComponent(window.location.href)}`;}
  function goLogin(){window.location.href=loginUrl();}
  async function fetchJson(url,options){
    const res=await fetch(url,Object.assign({credentials:"include",cache:"no-store"},options||{}));
    const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={ok:false,raw:text}};
    data.__status=res.status;if(!res.ok)data.ok=false;return data;
  }
  async function checkAuth(force){
    const now=Date.now();if(!force&&authOkCache&&now-lastAuthCheck<30000)return true;
    try{const data=await fetchJson("/api/admin/auth-check?t="+Date.now());authOkCache=!!data.ok;lastAuthCheck=now;const out=$("fp-admin-debug-output");if(out)out.textContent=JSON.stringify(data,null,2);return authOkCache}
    catch(e){authOkCache=false;const out=$("fp-admin-debug-output");if(out)out.textContent="Auth check failed: "+(e&&e.message?e.message:String(e));return false}
  }
  async function requireAuth(){const ok=await checkAuth(true);if(!ok){goLogin();return false}return true}
  function ensureOverlay(){
    if($("fp-admin-overlay"))return;
    const root=document.createElement("div");root.id="fp-admin-overlay";root.className="fp-admin-overlay fp-admin-hidden";
    root.innerHTML=`
      <div class="fp-admin-backdrop" data-admin-close="1"></div>
      <section class="fp-admin-panel" role="dialog" aria-modal="true" aria-label="Radio Admin Panel">
        <header class="fp-admin-header"><div><h2>666 RADIO ADMIN</h2><p>Auth gated · GitHub Config Backup · Chaos Engine · Broadcast Diagnostics</p></div><button class="fp-admin-close" type="button" data-admin-close="1">×</button></header>
        <nav class="fp-admin-tabs">
          <button type="button" data-admin-tab="streams" class="is-active">Streams</button>
          <button type="button" data-admin-tab="systems">Systems</button>
          <button type="button" data-admin-tab="auth">Auth/PW</button>
          <button type="button" data-admin-tab="broadcast">Broadcast</button>
          <button type="button" data-admin-tab="discord">Discord</button>
          <button type="button" data-admin-tab="debug">Debug</button>
        </nav>
        <main class="fp-admin-content">
          <section class="fp-admin-tab is-active" data-admin-tab-panel="streams">
            <div class="fp-admin-grid">
              <label>Primary Stream URL<input id="fp-admin-primary-stream" placeholder="https://..."></label>
              <label>Backup Stream URL<input id="fp-admin-backup-stream" placeholder="https://..."></label>
              <label>Emergency Stream URL<input id="fp-admin-emergency-stream" placeholder="https://..."></label>
              <label>Change Note<input id="fp-admin-note" placeholder="z.B. Stream Provider gewechselt"></label>
            </div>
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-load-config">Load Current Config</button>
              <button type="button" id="fp-admin-list-backups">List Backups</button>
              <button type="button" id="fp-admin-preview-config">Preview</button>
              <button type="button" id="fp-admin-commit-config" class="danger">Backup + Commit</button>
              <button type="button" id="fp-admin-rollback-config">Rollback Latest</button>
            </div>
            <pre id="fp-admin-config-preview">Ready.</pre>
          </section>
          <section class="fp-admin-tab" data-admin-tab-panel="systems">
            <div class="fp-admin-actions vertical">
              <button type="button" data-admin-protected-open="${CHAOS_ENGINE_URL}">Open Chaos Engine</button>
              <button type="button" data-admin-protected-open="/CHAOS_ENGINE/track-factory.html">Open Track Factory</button>
              <button type="button" data-admin-protected-open="/CHAOS_ENGINE/fraggle-detlef-system.html">Open Detlef Core</button>
              <button type="button" data-admin-protected-open="${SUNO_URL}">Open Zuno/Suno System</button>
              <button type="button" data-admin-protected-open="${DARK_DANCER_URL}">Open Dark Dancer Story</button>
              <button type="button" data-admin-protected-open="/debug">Open Radio Debug</button>
              <button type="button" data-admin-protected-open="/health">Open Radio Health</button>
            </div><pre id="fp-admin-system-output">System links require Auth.</pre>
          </section>
          <section class="fp-admin-tab" data-admin-tab-panel="auth">
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-all">Check All Layers</button>
              <button type="button" id="fp-admin-check-pw">Check PW Worker</button>
              <button type="button" id="fp-admin-check-auth-worker">Check Auth Worker</button>
              <button type="button" id="fp-admin-check-suno">Check Zuno/Suno</button>
              <button type="button" id="fp-admin-login" class="danger">Force Login</button>
            </div><pre id="fp-admin-auth-output">Ready.</pre>
          </section>
          <section class="fp-admin-tab" data-admin-tab-panel="broadcast">
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-broadcast-status">Check Broadcast Status</button>
              <button type="button" id="fp-admin-check-broadcast-current">Check Current Message</button>
              <button type="button" id="fp-admin-test-broadcast">Send Test Message</button>
            </div><pre id="fp-admin-broadcast-output">Ready.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="discord">
            <div class="fp-admin-discord-box">
              <div class="fp-admin-discord-title">DISCORD SHOOTER <span id="fp-admin-discord-led" class="fp-admin-led is-ready">READY</span></div>
              <textarea id="fp-admin-discord-message" maxlength="500" placeholder="Discord-Nachricht schreiben..."></textarea>
              <div class="fp-admin-actions">
                <button type="button" id="fp-admin-discord-send">SEND</button>
                <button type="button" id="fp-admin-discord-clear">CLEAR</button>
                <button type="button" id="fp-admin-discord-test">TEST</button>
                <button type="button" id="fp-admin-discord-status">STATUS</button>
              </div>
              <pre id="fp-admin-discord-output">Discord webhook stays server-side in Worker secrets.</pre>
            </div>
          </section>
          <section class="fp-admin-tab" data-admin-tab-panel="debug">
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-auth">Check Local Auth</button>
              <button type="button" id="fp-admin-check-api">Check Admin API</button>
              <button type="button" id="fp-admin-check-chaos-local">Check Local Chaos Engine</button>
            </div><pre id="fp-admin-debug-output">Ready.</pre>
          </section>
        </main>
      </section>`;
    document.body.appendChild(root);
    root.addEventListener("click",async ev=>{
      if(ev.target&&ev.target.getAttribute("data-admin-close"))closeAdminOverlay();
      const openUrl=ev.target&&ev.target.getAttribute("data-admin-protected-open");
      if(openUrl){ev.preventDefault();if(await requireAuth())window.open(openUrl,"_blank","noopener,noreferrer")}
      const tab=ev.target&&ev.target.getAttribute("data-admin-tab");if(tab)switchTab(tab);
    });
    $("fp-admin-load-config").onclick=loadConfig;$("fp-admin-list-backups").onclick=listBackups;$("fp-admin-preview-config").onclick=previewConfig;$("fp-admin-commit-config").onclick=commitConfig;$("fp-admin-rollback-config").onclick=rollbackLatest;$("fp-admin-check-auth").onclick=()=>checkAuth(true);$("fp-admin-check-api").onclick=checkApi;$("fp-admin-check-all").onclick=checkAllLayers;$("fp-admin-check-pw").onclick=checkPwWorker;$("fp-admin-check-auth-worker").onclick=checkAuthWorker;$("fp-admin-check-suno").onclick=checkSunoWorker;$("fp-admin-login").onclick=goLogin;$("fp-admin-check-chaos-local").onclick=checkLocalChaos;$("fp-admin-check-broadcast-status").onclick=checkBroadcastStatus;$("fp-admin-check-broadcast-current").onclick=checkBroadcastCurrent;$("fp-admin-test-broadcast").onclick=testBroadcast;$("fp-admin-discord-send").onclick=sendDiscordAdmin;$("fp-admin-discord-clear").onclick=clearDiscordAdmin;$("fp-admin-discord-test").onclick=testDiscordAdmin;$("fp-admin-discord-status").onclick=statusDiscordAdmin;
  }
  function switchTab(name){document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("is-active",b.getAttribute("data-admin-tab")===name));document.querySelectorAll("[data-admin-tab-panel]").forEach(p=>p.classList.toggle("is-active",p.getAttribute("data-admin-tab-panel")===name))}
  async function openAdminOverlay(){if(!await requireAuth())return;ensureOverlay();$("fp-admin-overlay").classList.remove("fp-admin-hidden")}
  function closeAdminOverlay(){const el=$("fp-admin-overlay");if(el)el.classList.add("fp-admin-hidden")}
  async function checkApi(){$("fp-admin-debug-output").textContent=JSON.stringify(await fetchJson("/api/admin/debug?t="+Date.now()),null,2)}
  async function loadConfig(){if(!await requireAuth())return;const out=$("fp-admin-config-preview");out.textContent="Loading...";const data=await fetchJson("/api/admin/config/current?t="+Date.now());out.textContent=JSON.stringify(data,null,2);if(data.ok&&data.config){$("fp-admin-primary-stream").value=data.config.primaryStream||"";$("fp-admin-backup-stream").value=data.config.backupStream||"";$("fp-admin-emergency-stream").value=data.config.emergencyStream||""}}
  async function listBackups(){if(!await requireAuth())return;$("fp-admin-config-preview").textContent=JSON.stringify(await fetchJson("/api/admin/config/backups?t="+Date.now()),null,2)}
  function payload(){return{primaryStream:$("fp-admin-primary-stream").value.trim(),backupStream:$("fp-admin-backup-stream").value.trim(),emergencyStream:$("fp-admin-emergency-stream").value.trim(),note:$("fp-admin-note").value.trim()||"Admin overlay stream config update"}}
  function validateUrl(value,label){if(!value)return null;try{const u=new URL(value);return/^https?:$/.test(u.protocol)?null:`${label}: only http/https`}catch{return`${label}: invalid URL`}}
  function previewConfig(){const p=payload();const errors=[validateUrl(p.primaryStream,"Primary"),validateUrl(p.backupStream,"Backup"),validateUrl(p.emergencyStream,"Emergency")].filter(Boolean);$("fp-admin-config-preview").textContent=JSON.stringify({ok:!errors.length,errors,payload:p},null,2);return!errors.length}
  async function commitConfig(){if(!await requireAuth())return;if(!previewConfig())return;if(!confirm("Backup + GitHub Commit wirklich ausführen?"))return;$("fp-admin-config-preview").textContent=JSON.stringify(await fetchJson("/api/admin/config/update",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload())}),null,2)}
  async function rollbackLatest(){if(!await requireAuth())return;if(!confirm("Latest Backup wirklich wiederherstellen?"))return;$("fp-admin-config-preview").textContent=JSON.stringify(await fetchJson("/api/admin/config/rollback",{method:"POST"}),null,2)}
  async function safeCheck(label,url){try{const data=await fetchJson(url+(url.includes("?")?"&":"?")+"t="+Date.now());return{label,ok:!!data.ok||data.__status<400,url,data}}catch(e){return{label,ok:false,url,error:e&&e.message?e.message:String(e)}}}
  async function checkPwWorker(){$("fp-admin-auth-output").textContent=JSON.stringify(await safeCheck("PW Worker",PW_HEALTH_URL),null,2)}
  async function checkAuthWorker(){const health=await safeCheck("Auth Worker Health",AUTH_HEALTH_URL);const debug=await safeCheck("Auth Worker Debug",AUTH_DEBUG_URL);$("fp-admin-auth-output").textContent=JSON.stringify({health,debug},null,2)}
  async function checkSunoWorker(){const suno=await safeCheck("Zuno/Suno Worker",SUNO_HEALTH_URL);const chaosAI=await safeCheck("Chaos AI Worker",CHAOS_AI_HEALTH_URL);$("fp-admin-auth-output").textContent=JSON.stringify({suno,chaosAI},null,2)}
  async function checkLocalChaos(){try{const res=await fetch(CHAOS_ENGINE_URL+"?t="+Date.now(),{cache:"no-store"});$("fp-admin-debug-output").textContent=JSON.stringify({ok:res.ok,status:res.status,url:CHAOS_ENGINE_URL},null,2)}catch(e){$("fp-admin-debug-output").textContent="Chaos check failed: "+e.message}}
  async function checkBroadcastStatus(){if(!await requireAuth())return;$("fp-admin-broadcast-output").textContent=JSON.stringify(await fetchJson("/api/player-alert/status?t="+Date.now()),null,2)}
  async function checkBroadcastCurrent(){if(!await requireAuth())return;$("fp-admin-broadcast-output").textContent=JSON.stringify(await fetchJson("/api/player-alert/current?t="+Date.now()),null,2)}
  async function testBroadcast(){if(!await requireAuth())return;const id="admin-overlay-"+Date.now();$("fp-admin-broadcast-output").textContent=JSON.stringify(await fetchJson("/api/player-alert/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Admin broadcast test "+new Date().toLocaleTimeString(),clientId:id,senderId:id,version:"admin-final-integration"})}),null,2)}

  function setDiscordLed(state, text){
    const led = $("fp-admin-discord-led");
    if(led){
      led.classList.remove("is-ready","is-sent","is-failed");
      led.classList.add(state === "sent" ? "is-sent" : state === "failed" ? "is-failed" : "is-ready");
      led.textContent = text || (state === "sent" ? "SENT" : state === "failed" ? "FAILED" : "READY");
    }
  }
  async function sendDiscordAdmin(){
    if(!await requireAuth()) return;
    const box = $("fp-admin-discord-message");
    const out = $("fp-admin-discord-output");
    const message = (box && box.value ? box.value : "").trim();
    if(!message){ setDiscordLed("failed","EMPTY"); if(out) out.textContent = "Message is empty."; return; }
    try{
      setDiscordLed("ready","SENDING");
      const data = await fetchJson(DISCORD_SEND_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message,source:"admin-overlay",version:"discord-admin-merge-v1"})});
      if(out) out.textContent = JSON.stringify(data,null,2);
      if(data.ok){ setDiscordLed("sent","SENT"); if(box) box.value = ""; }
      else setDiscordLed("failed","FAILED");
    }catch(e){ setDiscordLed("failed","FAILED"); if(out) out.textContent = e && e.message ? e.message : String(e); }
  }
  function clearDiscordAdmin(){
    const box = $("fp-admin-discord-message");
    const out = $("fp-admin-discord-output");
    if(box) box.value = "";
    if(out) out.textContent = "Cleared.";
    setDiscordLed("ready","READY");
  }
  async function testDiscordAdmin(){
    if(!await requireAuth()) return;
    const out = $("fp-admin-discord-output");
    try{
      setDiscordLed("ready","TEST");
      const data = await fetchJson(DISCORD_TEST_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Admin Discord test "+new Date().toLocaleString(),source:"admin-overlay-test"})});
      if(out) out.textContent = JSON.stringify(data,null,2);
      setDiscordLed(data.ok ? "sent" : "failed", data.ok ? "SENT" : "FAILED");
    }catch(e){ setDiscordLed("failed","FAILED"); if(out) out.textContent = e && e.message ? e.message : String(e); }
  }
  async function statusDiscordAdmin(){
    if(!await requireAuth()) return;
    const out = $("fp-admin-discord-output");
    try{
      const data = await fetchJson(DISCORD_STATUS_URL+"?t="+Date.now());
      if(out) out.textContent = JSON.stringify(data,null,2);
      setDiscordLed(data.ok ? "ready" : "failed", data.ok ? "READY" : "FAILED");
    }catch(e){ setDiscordLed("failed","FAILED"); if(out) out.textContent = e && e.message ? e.message : String(e); }
  }

  async function checkAllLayers(){const localAuth=await fetchJson("/api/admin/auth-check?t="+Date.now()).catch(e=>({ok:false,error:e.message}));const adminApi=await fetchJson("/api/admin/debug?t="+Date.now()).catch(e=>({ok:false,error:e.message}));const pw=await safeCheck("PW Worker",PW_HEALTH_URL);const auth=await safeCheck("Auth Worker",AUTH_HEALTH_URL);const suno=await safeCheck("Zuno/Suno Worker",SUNO_HEALTH_URL);const chaosAI=await safeCheck("Chaos AI Worker",CHAOS_AI_HEALTH_URL);const chaosLocal=await fetch(CHAOS_ENGINE_URL+"?t="+Date.now(),{cache:"no-store"}).then(r=>({ok:r.ok,status:r.status,url:CHAOS_ENGINE_URL})).catch(e=>({ok:false,error:e.message,url:CHAOS_ENGINE_URL}));const broadcast=await fetchJson("/api/player-alert/status?t="+Date.now()).catch(e=>({ok:false,error:e.message}));$("fp-admin-auth-output").textContent=JSON.stringify({localAuth,adminApi,pw,auth,suno,chaosAI,chaosLocal,broadcast},null,2)}
  function mountAdminButton(){if($("fp-admin-button"))return;const btn=document.createElement("button");btn.id="fp-admin-button";btn.type="button";btn.className="fp-admin-button";btn.textContent="ADMIN";btn.title="Protected radio admin menu";btn.onclick=openAdminOverlay;const targets=[".systempanel-right",".player-actions",".controls",".radio-controls","#player","main","body"];for(const sel of targets){const t=document.querySelector(sel);if(t){t.appendChild(btn);return}}document.body.appendChild(btn)}
  window.FPAdminOverlay={mount:mountAdminButton,open:openAdminOverlay,close:closeAdminOverlay,checkAuth};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountAdminButton);else mountAdminButton();
})();
