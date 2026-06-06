/*
FILE: js/player-admin-overlay.js
CREATED: 2026-05-24
UPDATED: 2026-06-04
PURPOSE: Protected Admin Control Center overlay for the 666SOUNDsDESIGn WebRadio Player.
RULES:
- Existing admin/shooter/message structures stay protected.
- No frontend secrets. Worker/webhook secrets stay server-side.
- Worker routes are only consumed, not redefined here.
- DarkDancer remains protected and reachable.
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

  const ADMIN_ROUTES={
    authCheck:"/api/admin/auth-check",
    debug:"/api/admin/debug",
    configCurrent:"/api/admin/config/current",
    configBackups:"/api/admin/config/backups",
    configUpdate:"/api/admin/config/update",
    configRollback:"/api/admin/config/rollback"
  };
  const DISCORD_ROUTES={
    manual:"/api/discord/manual",
    message:"/api/discord/message",
    status:"/api/discord/status",
    debug:"/api/discord/debug",
    test:"/api/discord/test"
  };
  const BROADCAST_ROUTES={
    status:"/api/player-alert/status",
    current:"/api/player-alert/current",
    send:"/api/player-alert/send",
    history:"/api/player-alert/history"
  };

  const $=id=>document.getElementById(id);
  const qs=(sel,base=document)=>base.querySelector(sel);
  const qsa=(sel,base=document)=>Array.from(base.querySelectorAll(sel));
  const nowStamp=()=>new Date().toLocaleString();
  let authOkCache=false;
  let lastAuthCheck=0;
  let routeStatusCache={};

  function versionLabel(){
    return (window.SMFP_VERSION && (window.SMFP_VERSION.label || window.SMFP_VERSION.version)) || window.__S666_BUILD_VERSION__ || "v35.7.0";
  }
  function loginUrl(){return `${AUTH_LOGIN_URL}?next=${encodeURIComponent(window.location.href)}`;}
  function goLogin(){window.location.href=loginUrl();}
  function setText(id,text){const el=$(id); if(el) el.textContent=text;}
  function setJson(id,data){setText(id,JSON.stringify(data,null,2));}
  function setAdminState(state,text){
    const root=$("fp-admin-overlay");
    const btn=$("fp-admin-button");
    const badge=$("fp-admin-auth-badge");
    const label=text || state;
    document.documentElement.setAttribute("data-admin-auth-state",state||"unknown");
    if(root) root.setAttribute("data-admin-auth-state",state||"unknown");
    if(btn){btn.setAttribute("data-admin-auth-state",state||"unknown");btn.title="Protected Admin Control Center · "+label;}
    if(badge){badge.className="fp-admin-state fp-admin-state-"+(state||"unknown");badge.textContent=label;}
  }
  function setRouteLed(id,state,text){
    const el=$(id);
    if(!el) return;
    el.classList.remove("is-ready","is-sent","is-failed","is-warn","is-unknown");
    el.classList.add(state==="ok"||state==="sent"?"is-sent":state==="warn"?"is-warn":state==="fail"?"is-failed":state==="ready"?"is-ready":"is-unknown");
    el.textContent=text || state || "UNKNOWN";
  }
  async function fetchText(url,options){
    const res=await fetch(url,Object.assign({credentials:"include",cache:"no-store"},options||{}));
    const text=await res.text();
    return {res,text};
  }
  async function fetchJson(url,options){
    const pack=await fetchText(url,options);
    let data;
    try{data=JSON.parse(pack.text)}catch{data={ok:false,raw:pack.text}};
    data.__status=pack.res.status;
    data.__url=url;
    if(!pack.res.ok)data.ok=false;
    return data;
  }
  async function safeJson(url,options){
    try{return await fetchJson(url,options)}
    catch(e){return {ok:false,__url:url,error:e&&e.message?e.message:String(e)}}
  }
  async function probeRoute(label,url,options){
    const data=await safeJson(url+(url.includes("?")?"&":"?")+"t="+Date.now(),options||{});
    const ok=!!data.ok || (data.__status && data.__status<400);
    const status=data.__status || 0;
    routeStatusCache[label]={label,url,ok,status,checkedAt:new Date().toISOString(),data};
    return routeStatusCache[label];
  }
  async function checkAuth(force){
    const now=Date.now();
    if(!force && authOkCache && now-lastAuthCheck<30000) return true;
    setAdminState("checking","AUTH CHECK");
    try{
      const data=await fetchJson(ADMIN_ROUTES.authCheck+"?t="+Date.now());
      authOkCache=!!data.ok;
      lastAuthCheck=now;
      setAdminState(authOkCache?"ok":"locked",authOkCache?"AUTH OK":"LOCKED");
      setJson("fp-admin-debug-output",data);
      return authOkCache;
    }catch(e){
      authOkCache=false;
      setAdminState("locked","AUTH FAIL");
      setText("fp-admin-debug-output","Auth check failed: "+(e&&e.message?e.message:String(e)));
      return false;
    }
  }
  async function requireAuth(){
    const ok=await checkAuth(true);
    if(!ok){goLogin();return false}
    return true;
  }
  function ensureOverlay(){
    if($("fp-admin-overlay")) return;
    const root=document.createElement("div");
    root.id="fp-admin-overlay";
    root.className="fp-admin-overlay fp-admin-hidden";
    root.innerHTML=`
      <div class="fp-admin-backdrop" data-admin-close="1"></div>
      <section class="fp-admin-panel" role="dialog" aria-modal="true" aria-label="Radio Admin Control Center">
        <header class="fp-admin-header">
          <div>
            <h2>666 RADIO ADMIN CONTROL CENTER</h2>
            <p>Authority Core gated · Stream Config · Broadcast · Discord Shooter · Watchdog · Systems</p>
            <div class="fp-admin-meta-line">
              <span id="fp-admin-auth-badge" class="fp-admin-state fp-admin-state-unknown">UNKNOWN</span>
              <span>Build <b id="fp-admin-version-label">${versionLabel()}</b></span>
              <span>Secrets stay server-side</span>
            </div>
          </div>
          <button class="fp-admin-close" type="button" data-admin-close="1" aria-label="Close Admin Control Center">×</button>
        </header>
        <nav class="fp-admin-tabs" aria-label="Admin Control Center Tabs">
          <button type="button" data-admin-tab="streams" class="is-active">Streams</button>
          <button type="button" data-admin-tab="systems">Systems</button>
          <button type="button" data-admin-tab="auth">Authority</button>
          <button type="button" data-admin-tab="watchdog">Watchdog</button>
          <button type="button" data-admin-tab="broadcast">Broadcast</button>
          <button type="button" data-admin-tab="discord">Discord</button>
          <button type="button" data-admin-tab="debug">Debug</button>
        </nav>
        <main class="fp-admin-content">
          <section class="fp-admin-tab is-active" data-admin-tab-panel="streams">
            <div class="fp-admin-info-box">
              <strong>STREAM CONFIG MANAGER V1</strong>
              <span>Main bleibt Main. Backup bleibt manuell. Fallback bleibt vorhanden. Commit/Rollback läuft nur über geschützte Worker-Routen.</span>
            </div>
            <div class="fp-admin-grid">
              <label>Primary Stream URL<input id="fp-admin-primary-stream" autocomplete="off" placeholder="https://..."></label>
              <label>Backup Stream URL<input id="fp-admin-backup-stream" autocomplete="off" placeholder="https://..."></label>
              <label>Emergency Stream URL<input id="fp-admin-emergency-stream" autocomplete="off" placeholder="https://..."></label>
              <label>Change Note<input id="fp-admin-note" autocomplete="off" placeholder="z.B. Stream Provider gewechselt"></label>
            </div>
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-load-config">Load Current Config</button>
              <button type="button" id="fp-admin-list-backups">List Backups</button>
              <button type="button" id="fp-admin-preview-config">Preview</button>
              <button type="button" id="fp-admin-active-stream-config">Show Active Player Config</button>
              <button type="button" id="fp-admin-commit-config" class="danger">Backup + Commit</button>
              <button type="button" id="fp-admin-rollback-config">Rollback Latest</button>
            </div>
            <pre id="fp-admin-config-preview">Admin Config System V1 ready. Load current config, edit streams/endpoints, then Backup + Commit. Cloudflare auto-deploy starts after GitHub commit.</pre>
            <pre id="fp-admin-active-stream-output">Active Player Config: not scanned yet.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="systems">
            <div class="fp-admin-info-box"><strong>PROTECTED SYSTEM LINKS</strong><span>Links öffnen erst nach Authority-Core-Prüfung. DarkDancer bleibt geschützt Bestandteil der Repo-Wahrheit.</span></div>
            <div class="fp-admin-actions vertical">
              <button type="button" data-admin-protected-open="${CHAOS_ENGINE_URL}">Open Chaos Engine</button>
              <button type="button" data-admin-protected-open="/CHAOS_ENGINE/track-factory.html">Open Track Factory</button>
              <button type="button" data-admin-protected-open="/CHAOS_ENGINE/fraggle-detlef-system.html">Open Detlef Core</button>
              <button type="button" data-admin-protected-open="${SUNO_URL}">Open Zuno/Suno System</button>
              <button type="button" data-admin-protected-open="${DARK_DANCER_URL}">Open Dark Dancer Story</button>
              <button type="button" data-admin-protected-open="/debug">Open Radio Debug</button>
              <button type="button" data-admin-protected-open="/health">Open Radio Health</button>
            </div>
            <pre id="fp-admin-system-output">System links require Auth.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="auth">
            <div class="fp-admin-info-box"><strong>AUTHORITY CORE ADMIN BINDING V1</strong><span>PW Worker + Auth Worker + lokale Admin-Routen werden geprüft. Keine Tokens im Frontend.</span></div>
            <div class="fp-admin-route-grid">
              <div>Admin Auth <span id="fp-admin-led-auth" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>Admin API <span id="fp-admin-led-api" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>PW Worker <span id="fp-admin-led-pw" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>Auth Worker <span id="fp-admin-led-authworker" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>Broadcast <span id="fp-admin-led-broadcast" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>Discord <span id="fp-admin-led-discord-route" class="fp-admin-led is-unknown">UNKNOWN</span></div>
            </div>
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-all">Check All Layers</button>
              <button type="button" id="fp-admin-check-pw">Check PW Worker</button>
              <button type="button" id="fp-admin-check-auth-worker">Check Auth Worker</button>
              <button type="button" id="fp-admin-check-suno">Check Zuno/Suno</button>
              <button type="button" id="fp-admin-login" class="danger">Force Login</button>
            </div>
            <pre id="fp-admin-auth-output">Ready.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="watchdog">
            <div class="fp-admin-info-box"><strong>STREAM WATCHDOG V1 STATUS</strong><span>Diagnose-Layer über dem bestehenden Audio Guard. Keine zweite Recovery-Architektur.</span></div>
            <div class="fp-admin-route-grid">
              <div>State <span id="fp-admin-wdg-state" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>Reason <span id="fp-admin-wdg-reason" class="fp-admin-led is-unknown">UNKNOWN</span></div>
              <div>ReadyState <span id="fp-admin-wdg-ready" class="fp-admin-led is-unknown">-</span></div>
              <div>Network <span id="fp-admin-wdg-network" class="fp-admin-led is-unknown">-</span></div>
              <div>Recoveries <span id="fp-admin-wdg-recover" class="fp-admin-led is-unknown">0</span></div>
              <div>Last Step <span id="fp-admin-wdg-step" class="fp-admin-led is-unknown">-</span></div>
            </div>
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-refresh-watchdog">Refresh Watchdog</button>
              <button type="button" id="fp-admin-watchdog-live">Toggle Live Watchdog</button>
            </div>
            <pre id="fp-admin-watchdog-output">Reads DOM data-stream-watchdog-* from the current player.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="broadcast">
            <div class="fp-admin-info-box"><strong>MESSAGE / BROADCAST</strong><span>Vorhandene Player-Alert-Routen werden benutzt. Backend/Shooter bleiben unverändert.</span></div>
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-broadcast-status">Check Broadcast Status</button>
              <button type="button" id="fp-admin-check-broadcast-current">Check Current Message</button>
              <button type="button" id="fp-admin-test-broadcast">Send Test Message</button>
            </div>
            <pre id="fp-admin-broadcast-output">Ready.</pre>
          </section>

          <section class="fp-admin-tab" data-admin-tab-panel="discord">
            <div class="fp-admin-discord-box">
              <div class="fp-admin-discord-title">DISCORD SHOOTER <span id="fp-admin-discord-led" class="fp-admin-led is-ready">READY</span></div>
              <textarea id="fp-admin-discord-message" maxlength="500" placeholder="Discord-Nachricht schreiben..."></textarea>
              <div class="fp-admin-charline"><span id="fp-admin-discord-count">0</span>/500 · Webhooks bleiben Worker-Secrets.</div>
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
              <button type="button" id="fp-admin-route-scan">Route Scan</button>
            </div>
            <pre id="fp-admin-debug-output">Ready.</pre>
          </section>
        </main>
      </section>`;
    document.body.appendChild(root);
    bindOverlayEvents(root);
  }

  function bind(id,fn){const el=$(id); if(el) el.addEventListener("click",fn);}
  function bindOverlayEvents(root){
    root.addEventListener("click",async ev=>{
      const closeTarget=ev.target && ev.target.closest && ev.target.closest("[data-admin-close]");
      if(closeTarget){closeAdminOverlay();return;}
      const openTarget=ev.target && ev.target.closest && ev.target.closest("[data-admin-protected-open]");
      if(openTarget){
        ev.preventDefault();
        const openUrl=openTarget.getAttribute("data-admin-protected-open");
        if(await requireAuth()) window.open(openUrl,"_blank","noopener,noreferrer");
        return;
      }
      const tabTarget=ev.target && ev.target.closest && ev.target.closest("[data-admin-tab]");
      if(tabTarget){switchTab(tabTarget.getAttribute("data-admin-tab"));return;}
    });
    bind("fp-admin-load-config",loadConfig);
    bind("fp-admin-list-backups",listBackups);
    bind("fp-admin-preview-config",previewConfig);
    bind("fp-admin-active-stream-config",showActivePlayerStreamConfig);
    bind("fp-admin-commit-config",commitConfig);
    bind("fp-admin-rollback-config",rollbackLatest);
    bind("fp-admin-check-auth",()=>checkAuth(true));
    bind("fp-admin-check-api",checkApi);
    bind("fp-admin-check-all",checkAllLayers);
    bind("fp-admin-check-pw",checkPwWorker);
    bind("fp-admin-check-auth-worker",checkAuthWorker);
    bind("fp-admin-check-suno",checkSunoWorker);
    bind("fp-admin-login",goLogin);
    bind("fp-admin-check-chaos-local",checkLocalChaos);
    bind("fp-admin-check-broadcast-status",checkBroadcastStatus);
    bind("fp-admin-check-broadcast-current",checkBroadcastCurrent);
    bind("fp-admin-test-broadcast",testBroadcast);
    bind("fp-admin-discord-send",sendDiscordAdmin);
    bind("fp-admin-discord-clear",clearDiscordAdmin);
    bind("fp-admin-discord-test",testDiscordAdmin);
    bind("fp-admin-discord-status",statusDiscordAdmin);
    bind("fp-admin-refresh-watchdog",refreshWatchdogStatus);
    bind("fp-admin-watchdog-live",toggleWatchdogLive);
    bind("fp-admin-route-scan",routeScan);
    const box=$("fp-admin-discord-message");
    if(box){box.addEventListener("input",updateDiscordCount); updateDiscordCount();}
  }
  function switchTab(name){
    qsa("[data-admin-tab]").forEach(b=>b.classList.toggle("is-active",b.getAttribute("data-admin-tab")===name));
    qsa("[data-admin-tab-panel]").forEach(p=>p.classList.toggle("is-active",p.getAttribute("data-admin-tab-panel")===name));
    if(name==="watchdog") refreshWatchdogStatus();
  }
  async function openAdminOverlay(){
    if(!await requireAuth()) return;
    ensureOverlay();
    const overlay=$("fp-admin-overlay");
    if(overlay) overlay.classList.remove("fp-admin-hidden");
    setText("fp-admin-version-label",versionLabel());
    await routeScan(true);
    refreshWatchdogStatus();
  }
  function closeAdminOverlay(){const el=$("fp-admin-overlay");if(el)el.classList.add("fp-admin-hidden")}

  async function checkApi(){setJson("fp-admin-debug-output",await safeJson(ADMIN_ROUTES.debug+"?t="+Date.now()))}
  async function loadConfig(){
    if(!await requireAuth())return;
    const out=$("fp-admin-config-preview"); if(out) out.textContent="Loading...";
    const data=await safeJson(ADMIN_ROUTES.configCurrent+"?t="+Date.now());
    setJson("fp-admin-config-preview",data);
    if(data.ok&&data.config){
      const ps=$("fp-admin-primary-stream"), bs=$("fp-admin-backup-stream"), es=$("fp-admin-emergency-stream");
      if(ps) ps.value=data.config.primaryStream||"";
      if(bs) bs.value=data.config.backupStream||"";
      if(es) es.value=data.config.emergencyStream||"";
    }
  }
  async function listBackups(){if(!await requireAuth())return;setJson("fp-admin-config-preview",await safeJson(ADMIN_ROUTES.configBackups+"?t="+Date.now()))}
  function payload(){return{primaryStream:($("fp-admin-primary-stream")?.value||"").trim(),backupStream:($("fp-admin-backup-stream")?.value||"").trim(),emergencyStream:($("fp-admin-emergency-stream")?.value||"").trim(),note:($("fp-admin-note")?.value||"").trim()||"Admin overlay stream config update"}}
  function validateUrl(value,label){
    if(!value)return null;
    const raw=String(value||"").trim();
    if(raw.startsWith("/")) return null;
    try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?null:`${label}: only http/https or relative /path allowed`}catch{return `${label}: invalid URL`}
  }
  function previewConfig(){
    const p=payload();
    const errors=[validateUrl(p.primaryStream,"Primary"),validateUrl(p.backupStream,"Backup"),validateUrl(p.emergencyStream,"Emergency")].filter(Boolean);
    const blocked=[];
    if(!p.primaryStream) blocked.push("Primary Stream URL is empty. Main must remain defined.");
    if(!p.backupStream) blocked.push("Backup Stream URL is empty. Manual backup/fallback must remain defined.");
    setJson("fp-admin-config-preview",{ok:!errors.length&&!blocked.length,errors,blocked,payload:p,frontend:"Player Stream Config Manager V1 accepts http/https or relative /stream routes",authority:"commit requires /api/admin/config/update and Auth cookie"});
    return !errors.length&&!blocked.length;
  }

  async function showActivePlayerStreamConfig(){
    const api=window.SMFPStreamConfigManagerV1||window.SMFPStreamConfigManager;
    let state=null;
    try{
      if(api&&typeof api.reload==="function") state=await api.reload();
      else if(api&&typeof api.getState==="function") state=api.getState();
    }catch(e){state={ok:false,error:e&&e.message?e.message:String(e)}}
    const root=document.documentElement;
    const dom={
      manager:root.getAttribute("data-stream-config-manager-v1")||"unknown",
      source:root.getAttribute("data-stream-config-source")||"unknown",
      main:root.getAttribute("data-player-main-stream")||root.getAttribute("data-stream-config-main")||"unknown",
      backup:root.getAttribute("data-player-backup-stream")||root.getAttribute("data-stream-config-backup")||"unknown",
      metadata:root.getAttribute("data-player-metadata-url")||root.getAttribute("data-stream-config-metadata")||"unknown",
      health:root.getAttribute("data-player-health-url")||root.getAttribute("data-stream-config-health")||"unknown"
    };
    setJson("fp-admin-active-stream-output",{ok:!!(state&&state.ok),state,dom,rule:"Main remains main. Backup remains manual. Worker fallback routes stay preserved."});
  }

  async function commitConfig(){
    if(!await requireAuth())return;
    if(!previewConfig())return;
    if(!confirm("Backup + GitHub Commit wirklich ausführen?"))return;
    setJson("fp-admin-config-preview",await safeJson(ADMIN_ROUTES.configUpdate,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload())}));
  }
  async function rollbackLatest(){
    if(!await requireAuth())return;
    if(!confirm("Latest Backup wirklich wiederherstellen?"))return;
    setJson("fp-admin-config-preview",await safeJson(ADMIN_ROUTES.configRollback,{method:"POST"}));
  }
  async function safeCheck(label,url){
    try{const data=await fetchJson(url+(url.includes("?")?"&":"?")+"t="+Date.now());return{label,ok:!!data.ok||data.__status<400,url,data}}
    catch(e){return{label,ok:false,url,error:e&&e.message?e.message:String(e)}}
  }
  async function checkPwWorker(){const pw=await safeCheck("PW Worker",PW_HEALTH_URL);setRouteLed("fp-admin-led-pw",pw.ok?"ok":"fail",pw.ok?"OK":"FAIL");setJson("fp-admin-auth-output",pw)}
  async function checkAuthWorker(){const health=await safeCheck("Auth Worker Health",AUTH_HEALTH_URL);const debug=await safeCheck("Auth Worker Debug",AUTH_DEBUG_URL);setRouteLed("fp-admin-led-authworker",health.ok?"ok":"fail",health.ok?"OK":"FAIL");setJson("fp-admin-auth-output",{health,debug})}
  async function checkSunoWorker(){const suno=await safeCheck("Zuno/Suno Worker",SUNO_HEALTH_URL);const chaosAI=await safeCheck("Chaos AI Worker",CHAOS_AI_HEALTH_URL);setJson("fp-admin-auth-output",{suno,chaosAI})}
  async function checkLocalChaos(){
    try{const res=await fetch(CHAOS_ENGINE_URL+"?t="+Date.now(),{cache:"no-store"});setJson("fp-admin-debug-output",{ok:res.ok,status:res.status,url:CHAOS_ENGINE_URL})}
    catch(e){setText("fp-admin-debug-output","Chaos check failed: "+e.message)}
  }
  async function checkBroadcastStatus(){if(!await requireAuth())return;const data=await safeJson(BROADCAST_ROUTES.status+"?t="+Date.now());setRouteLed("fp-admin-led-broadcast",data.ok?"ok":"fail",data.ok?"OK":"FAIL");setJson("fp-admin-broadcast-output",data)}
  async function checkBroadcastCurrent(){if(!await requireAuth())return;setJson("fp-admin-broadcast-output",await safeJson(BROADCAST_ROUTES.current+"?t="+Date.now()))}
  async function testBroadcast(){
    if(!await requireAuth())return;
    const id="admin-overlay-"+Date.now();
    const data=await safeJson(BROADCAST_ROUTES.send,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Admin broadcast test "+new Date().toLocaleTimeString(),clientId:id,senderId:id,source:"admin-control-center",version:versionLabel()})});
    setJson("fp-admin-broadcast-output",data);
    setRouteLed("fp-admin-led-broadcast",data.ok?"ok":"fail",data.ok?"SENT":"FAIL");
  }
  function setDiscordLed(state,text){
    const map={sent:"is-sent",failed:"is-failed",warn:"is-warn",ready:"is-ready"};
    const led=$("fp-admin-discord-led");
    if(led){led.classList.remove("is-ready","is-sent","is-failed","is-warn","is-unknown");led.classList.add(map[state]||"is-ready");led.textContent=text || (state==="sent"?"SENT":state==="failed"?"FAILED":"READY");}
    setRouteLed("fp-admin-led-discord-route",state==="failed"?"fail":"ok",text||state||"READY");
  }
  function updateDiscordCount(){const box=$("fp-admin-discord-message");const c=$("fp-admin-discord-count");if(c)c.textContent=String((box&&box.value?box.value.length:0));}
  async function postFirstWorking(routes,body){
    const attempts=[];
    for(const url of routes){
      const data=await safeJson(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      attempts.push({url,status:data.__status||0,ok:!!data.ok,data});
      if(data.ok) return {ok:true,used:url,attempts,data};
      if(data.__status && data.__status!==404 && data.__status!==405) return {ok:false,used:url,attempts,data};
    }
    return {ok:false,error:"no_discord_route_confirmed",attempts};
  }
  async function sendDiscordAdmin(){
    if(!await requireAuth()) return;
    const box=$("fp-admin-discord-message");
    const out=$("fp-admin-discord-output");
    const message=(box&&box.value?box.value:"").trim();
    if(!message){setDiscordLed("failed","EMPTY");if(out)out.textContent="Message is empty.";return;}
    setDiscordLed("ready","SENDING");
    const result=await postFirstWorking([DISCORD_ROUTES.manual,DISCORD_ROUTES.message],{message,source:"admin-control-center",version:versionLabel()});
    if(out) out.textContent=JSON.stringify(result,null,2);
    if(result.ok){setDiscordLed("sent","SENT");if(box)box.value="";updateDiscordCount();}
    else setDiscordLed("failed","FAILED");
  }
  function clearDiscordAdmin(){const box=$("fp-admin-discord-message");if(box)box.value="";updateDiscordCount();setText("fp-admin-discord-output","Cleared.");setDiscordLed("ready","READY")}
  async function testDiscordAdmin(){
    if(!await requireAuth()) return;
    setDiscordLed("ready","TEST");
    const body={message:"Admin Discord test "+new Date().toLocaleString(),source:"admin-control-center-test",version:versionLabel()};
    const result=await postFirstWorking([DISCORD_ROUTES.test,DISCORD_ROUTES.manual,DISCORD_ROUTES.message],body);
    setJson("fp-admin-discord-output",result);
    setDiscordLed(result.ok?"sent":"failed",result.ok?"SENT":"FAILED");
  }
  async function statusDiscordAdmin(){
    if(!await requireAuth()) return;
    const data=await safeJson(DISCORD_ROUTES.status+"?t="+Date.now());
    setJson("fp-admin-discord-output",data);
    setDiscordLed(data.ok?"ready":"failed",data.ok?"READY":"FAILED");
  }
  function readWatchdog(){
    const d=document.documentElement.dataset;
    const body=document.body?document.body.dataset:{};
    const pick=name=>d[name] || body[name] || "";
    return {
      ok: pick("streamWatchdogV1")==="active" || !!window.StreamWatchdogV1,
      v1: pick("streamWatchdogV1") || "unknown",
      state: pick("streamWatchdogState") || "unknown",
      reason: pick("streamWatchdogReason") || "unknown",
      audioStallMs: pick("streamWatchdogAudioStallMs") || "0",
      readyState: pick("streamWatchdogReady") || "-",
      networkState: pick("streamWatchdogNetwork") || "-",
      recoverCount: pick("streamWatchdogRecoverCount") || "0",
      lastStep: pick("streamWatchdogLastStep") || "-",
      checkedAt: new Date().toISOString()
    };
  }
  function refreshWatchdogStatus(){
    const w=readWatchdog();
    setRouteLed("fp-admin-wdg-state",w.state==="ok"||w.state==="playing"?"ok":w.state==="unknown"?"unknown":"warn",String(w.state).toUpperCase());
    setRouteLed("fp-admin-wdg-reason",w.reason==="none"||w.reason==="unknown"?"ready":"warn",String(w.reason).toUpperCase());
    setRouteLed("fp-admin-wdg-ready","ready",String(w.readyState));
    setRouteLed("fp-admin-wdg-network","ready",String(w.networkState));
    setRouteLed("fp-admin-wdg-recover",Number(w.recoverCount)>0?"warn":"ready",String(w.recoverCount));
    setRouteLed("fp-admin-wdg-step",w.lastStep&&w.lastStep!=="-"?"warn":"ready",String(w.lastStep));
    setJson("fp-admin-watchdog-output",w);
    return w;
  }
  let watchdogTimer=null;
  function toggleWatchdogLive(){
    if(watchdogTimer){clearInterval(watchdogTimer);watchdogTimer=null;setText("fp-admin-watchdog-output","Live Watchdog stopped.");return;}
    refreshWatchdogStatus();
    watchdogTimer=setInterval(refreshWatchdogStatus,2500);
  }
  async function routeScan(silent){
    const results={checkedAt:new Date().toISOString(),version:versionLabel(),routes:{}};
    const localAuth=await probeRoute("adminAuth",ADMIN_ROUTES.authCheck);
    const adminApi=await probeRoute("adminApi",ADMIN_ROUTES.debug);
    const pw=await safeCheck("PW Worker",PW_HEALTH_URL);
    const auth=await safeCheck("Auth Worker",AUTH_HEALTH_URL);
    const broadcast=await probeRoute("broadcast",BROADCAST_ROUTES.status);
    const discord=await probeRoute("discord",DISCORD_ROUTES.status);
    results.routes={localAuth,adminApi,pw,auth,broadcast,discord};
    setRouteLed("fp-admin-led-auth",localAuth.ok?"ok":"fail",localAuth.ok?"OK":"LOCKED");
    setRouteLed("fp-admin-led-api",adminApi.ok?"ok":"fail",adminApi.ok?"OK":"FAIL");
    setRouteLed("fp-admin-led-pw",pw.ok?"ok":"fail",pw.ok?"OK":"FAIL");
    setRouteLed("fp-admin-led-authworker",auth.ok?"ok":"fail",auth.ok?"OK":"FAIL");
    setRouteLed("fp-admin-led-broadcast",broadcast.ok?"ok":"fail",broadcast.ok?"OK":"FAIL");
    setRouteLed("fp-admin-led-discord-route",discord.ok?"ok":"fail",discord.ok?"OK":"FAIL");
    if(!silent) setJson("fp-admin-debug-output",results);
    return results;
  }
  async function checkAllLayers(){
    const scan=await routeScan(true);
    const suno=await safeCheck("Zuno/Suno Worker",SUNO_HEALTH_URL);
    const chaosAI=await safeCheck("Chaos AI Worker",CHAOS_AI_HEALTH_URL);
    const chaosLocal=await fetch(CHAOS_ENGINE_URL+"?t="+Date.now(),{cache:"no-store"}).then(r=>({ok:r.ok,status:r.status,url:CHAOS_ENGINE_URL})).catch(e=>({ok:false,error:e.message,url:CHAOS_ENGINE_URL}));
    const darkDancer=await fetch(DARK_DANCER_URL+"?t="+Date.now(),{cache:"no-store"}).then(r=>({ok:r.ok,status:r.status,url:DARK_DANCER_URL,protected:true})).catch(e=>({ok:false,error:e.message,url:DARK_DANCER_URL,protected:true}));
    const watchdog=readWatchdog();
    setJson("fp-admin-auth-output",{scan,suno,chaosAI,chaosLocal,darkDancer,watchdog});
  }
  function mountAdminButton(){
    if($("fp-admin-button")) return;
    const btn=document.createElement("button");
    btn.id="fp-admin-button";
    btn.type="button";
    btn.className="fp-admin-button";
    btn.textContent="ADMIN";
    btn.title="Protected Admin Control Center";
    btn.setAttribute("aria-label","Open protected Admin Control Center");
    btn.onclick=openAdminOverlay;
    const targets=[".systempanel-right",".player-actions",".controls",".radio-controls","#player","main","body"];
    for(const sel of targets){const t=qs(sel);if(t){t.appendChild(btn);break;}}
    setAdminState("unknown","LOCKED");
  }
  window.openAdmin=openAdminOverlay;
  window.S666OpenAdmin=openAdminOverlay;
  window.FPAdminOverlay={mount:mountAdminButton,open:openAdminOverlay,close:closeAdminOverlay,checkAuth,routeScan,refreshWatchdogStatus};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mountAdminButton); else mountAdminButton();
})();
