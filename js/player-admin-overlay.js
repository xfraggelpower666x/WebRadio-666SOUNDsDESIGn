/*
FILE: js/player-admin-overlay.js
CREATED: 2026-05-21
PURPOSE: Protected Admin overlay for radio runtime config.
*/
(function(){
  "use strict";
  const ADMIN_AUTH_LOGIN_URL = "https://666-system-auth.666soundsdesign-broadcaster.com/login";
  const ADMIN_API_BASE = "";
  const CHAOS_ENGINE_URL = "/CHAOS_ENGINE/index.html";
  const SUNO_SYSTEM_URL = "https://666-suno-system.666soundsdesign-broadcaster.com";
  const DARK_DANCER_URL = "/The-Dark-Dancer";
  const $ = id => document.getElementById(id);

  function ensureAdminOverlay(){
    if ($("fp-admin-overlay")) return;
    const root = document.createElement("div");
    root.id = "fp-admin-overlay";
    root.className = "fp-admin-overlay fp-admin-hidden";
    root.innerHTML = `
      <div class="fp-admin-backdrop" data-admin-close="1"></div>
      <section class="fp-admin-panel" role="dialog" aria-modal="true" aria-label="Radio Admin Panel">
        <header class="fp-admin-header">
          <div><h2>666 RADIO ADMIN</h2><p>Protected runtime control · GitHub backup · Auto deploy</p></div>
          <button class="fp-admin-close" type="button" data-admin-close="1">×</button>
        </header>
        <nav class="fp-admin-tabs">
          <button type="button" data-admin-tab="streams" class="is-active">Streams</button>
          <button type="button" data-admin-tab="systems">Systems</button>
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
              <button type="button" data-admin-open="${CHAOS_ENGINE_URL}">Open Chaos Engine</button>
              <button type="button" data-admin-open="${SUNO_SYSTEM_URL}">Open Suno System</button>
              <button type="button" data-admin-open="${DARK_DANCER_URL}">Open Dark Dancer Story</button>
              <button type="button" data-admin-open="/debug">Open Radio Debug</button>
              <button type="button" data-admin-open="/health">Open Radio Health</button>
            </div>
          </section>
          <section class="fp-admin-tab" data-admin-tab-panel="debug">
            <div class="fp-admin-actions">
              <button type="button" id="fp-admin-check-auth">Check Auth</button>
              <button type="button" id="fp-admin-check-api">Check Admin API</button>
            </div>
            <pre id="fp-admin-debug-output">Ready.</pre>
          </section>
        </main>
      </section>`;
    document.body.appendChild(root);
    root.addEventListener("click", ev => {
      if (ev.target && ev.target.getAttribute("data-admin-close")) closeAdminOverlay();
      const openUrl = ev.target && ev.target.getAttribute("data-admin-open");
      if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
      const tab = ev.target && ev.target.getAttribute("data-admin-tab");
      if (tab) switchTab(tab);
    });
    $("fp-admin-load-config").addEventListener("click", loadConfig);
    $("fp-admin-list-backups").addEventListener("click", listBackups);
    $("fp-admin-preview-config").addEventListener("click", previewConfig);
    $("fp-admin-commit-config").addEventListener("click", commitConfig);
    $("fp-admin-rollback-config").addEventListener("click", rollbackLatest);
    $("fp-admin-check-auth").addEventListener("click", checkAuth);
    $("fp-admin-check-api").addEventListener("click", checkApi);
  }
  function switchTab(name){
    document.querySelectorAll("[data-admin-tab]").forEach(btn => btn.classList.toggle("is-active", btn.getAttribute("data-admin-tab") === name));
    document.querySelectorAll("[data-admin-tab-panel]").forEach(panel => panel.classList.toggle("is-active", panel.getAttribute("data-admin-tab-panel") === name));
  }
  function openAdminOverlay(){
    ensureAdminOverlay();
    $("fp-admin-overlay").classList.remove("fp-admin-hidden");
    checkAuth().then(ok => {
      if (!ok) window.open(`${ADMIN_AUTH_LOGIN_URL}?next=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer");
    });
  }
  function closeAdminOverlay(){ const el=$("fp-admin-overlay"); if(el) el.classList.add("fp-admin-hidden"); }
  async function fetchJson(url, options){
    const res = await fetch(ADMIN_API_BASE + url, Object.assign({credentials:"include"}, options || {}));
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = {ok:false, raw:text}; }
    data.__status = res.status; if (!res.ok) data.ok = false; return data;
  }
  async function checkAuth(){ try{ const data=await fetchJson("/api/admin/auth-check"); const out=$("fp-admin-debug-output"); if(out) out.textContent=JSON.stringify(data,null,2); return !!data.ok; }catch(e){ return false; } }
  async function checkApi(){ $("fp-admin-debug-output").textContent = JSON.stringify(await fetchJson("/api/admin/debug"), null, 2); }
  async function loadConfig(){
    const out=$("fp-admin-config-preview"); out.textContent="Loading...";
    const data=await fetchJson("/api/admin/config/current"); out.textContent=JSON.stringify(data,null,2);
    if(data.ok && data.config){ $("fp-admin-primary-stream").value=data.config.primaryStream||""; $("fp-admin-backup-stream").value=data.config.backupStream||""; $("fp-admin-emergency-stream").value=data.config.emergencyStream||""; }
  }
  async function listBackups(){ $("fp-admin-config-preview").textContent = JSON.stringify(await fetchJson("/api/admin/config/backups"), null, 2); }
  function payload(){ return {primaryStream:$("fp-admin-primary-stream").value.trim(), backupStream:$("fp-admin-backup-stream").value.trim(), emergencyStream:$("fp-admin-emergency-stream").value.trim(), note:$("fp-admin-note").value.trim()||"Admin overlay stream config update"}; }
  function validateUrl(value,label){ if(!value) return null; try{ const u=new URL(value); return /^https?:$/.test(u.protocol)?null:`${label}: only http/https`; }catch{ return `${label}: invalid URL`; } }
  function previewConfig(){
    const p=payload(); const errors=[validateUrl(p.primaryStream,"Primary"),validateUrl(p.backupStream,"Backup"),validateUrl(p.emergencyStream,"Emergency")].filter(Boolean);
    $("fp-admin-config-preview").textContent=JSON.stringify({ok:!errors.length, errors, payload:p}, null, 2);
    return !errors.length;
  }
  async function commitConfig(){
    if(!previewConfig()) return;
    if(!confirm("Backup + GitHub Commit wirklich ausführen?")) return;
    $("fp-admin-config-preview").textContent="Committing...";
    $("fp-admin-config-preview").textContent=JSON.stringify(await fetchJson("/api/admin/config/update",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload())}), null, 2);
  }
  async function rollbackLatest(){
    if(!confirm("Latest Backup wirklich wiederherstellen?")) return;
    $("fp-admin-config-preview").textContent=JSON.stringify(await fetchJson("/api/admin/config/rollback",{method:"POST"}), null, 2);
  }
  function mountAdminButton(){
    if($("fp-admin-button")) return;
    const btn=document.createElement("button"); btn.id="fp-admin-button"; btn.type="button"; btn.className="fp-admin-button"; btn.textContent="ADMIN"; btn.title="Protected radio admin menu"; btn.addEventListener("click", openAdminOverlay);
    const targets=[".systempanel-right",".player-actions",".controls",".radio-controls","#player","main","body"];
    for(const sel of targets){ const t=document.querySelector(sel); if(t){ t.appendChild(btn); return; } }
    document.body.appendChild(btn);
  }
  window.FPAdminOverlay={mount(){ensureAdminOverlay(); mountAdminButton();}, open:openAdminOverlay, close:closeAdminOverlay};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", window.FPAdminOverlay.mount); else window.FPAdminOverlay.mount();
})();
