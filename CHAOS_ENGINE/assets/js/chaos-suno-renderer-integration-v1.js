/*
FILE: CHAOS_ENGINE/assets/js/chaos-suno-renderer-integration-v1.js
CREATED: 2026-05-25
PURPOSE: Chaos Engine ↔ Chaos AI Worker ↔ Suno Worker ↔ Renderer integration.
CHANGE SUMMARY:
- Adds API status LEDs.
- Adds real Generate via Chaos AI Worker with local fallback.
- Adds optional Send to Suno Worker.
- Copy mode remains always available.
*/
(function(){
  "use strict";

  const VERSION = "chaos-suno-renderer-integration-v1-20260525";
  const DEFAULTS = {
    chaosBase: "https://666-chaos-ai-track-system.666soundsdesign-broadcaster.com",
    sunoBase: "https://666-suno-system.666soundsdesign-broadcaster.com"
  };

  const state = {
    config: null,
    lastTrack: null,
    lastSunoJob: null
  };

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function clean(v, max){ return String(v || "").replace(/[<>]/g,"").trim().slice(0, max || 5000); }

  async function loadJson(url){
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(), { cache:"no-store" });
    if(!res.ok) throw new Error(url + " HTTP " + res.status);
    return res.json();
  }

  async function loadConfig(){
    if(state.config) return state.config;
    try{ state.config = await loadJson("/CHAOS_ENGINE/assets/data/api-providers.json"); }
    catch(e){ state.config = { providers:{ chaosAiWorker:{baseUrl:DEFAULTS.chaosBase}, sunoWorker:{baseUrl:DEFAULTS.sunoBase} } }; }
    return state.config;
  }

  function base(providerId){
    const cfg = state.config || {};
    const p = cfg.providers && cfg.providers[providerId];
    return (p && p.baseUrl) || (providerId === "sunoWorker" ? DEFAULTS.sunoBase : DEFAULTS.chaosBase);
  }

  function setLed(id, status, text){
    const el = qs(id);
    if(!el) return;
    el.classList.remove("ok","warn","fail","idle");
    el.classList.add(status || "idle");
    el.textContent = text || status || "idle";
  }

  function log(msg, data){
    const out = qs("#chaosApiLog") || qs("#apiConsole") || qs("[data-chaos-log]");
    if(out){
      const line = "[" + new Date().toLocaleTimeString() + "] " + msg + (data ? "\n" + JSON.stringify(data,null,2) : "");
      out.textContent = line + "\n\n" + (out.textContent || "").slice(0, 6000);
    }
  }

  function ensurePanel(){
    if(qs("#chaosIntegrationPanel")) return;
    const panel = document.createElement("section");
    panel.id = "chaosIntegrationPanel";
    panel.className = "chaos-integration-panel";
    panel.innerHTML = `
      <header>
        <b>CHAOS ↔ SUNO ↔ RENDERER</b>
        <span>API Bridge V1</span>
      </header>
      <div class="chaos-api-leds">
        <span>Chaos AI <i id="chaosAiLed" class="idle">idle</i></span>
        <span>Suno <i id="sunoLed" class="idle">idle</i></span>
        <span>Renderer <i id="rendererLed" class="idle">idle</i></span>
      </div>
      <div class="chaos-api-actions">
        <button type="button" id="chaosCheckApis">CHECK APIs</button>
        <button type="button" id="chaosGenerateAi">GENERATE AI</button>
        <button type="button" id="chaosSendSuno">SEND TO SUNO</button>
        <button type="button" id="chaosCopyAll">COPY ALL</button>
      </div>
      <pre id="chaosApiLog">Ready. Copy mode is always available.</pre>
    `;
    const target = qs("main") || qs(".app") || qs(".chaos-shell") || document.body;
    target.appendChild(panel);

    qs("#chaosCheckApis").onclick = checkApis;
    qs("#chaosGenerateAi").onclick = generateAi;
    qs("#chaosSendSuno").onclick = sendToSuno;
    qs("#chaosCopyAll").onclick = copyAll;
  }

  function collectPayload(){
    const trackCount = Number((qs("#trackCount") || qs("[name='trackCount']")).value || 1) || 1;
    const emotion = clean((qs("#emotion") || qs("[name='emotion']")).value || (qs("#emotionState")||{}).value || "controlled pressure", 120);
    const storyPhase = clean((qs("#storyPhase") || qs("[name='storyPhase']")).value || "reactivation", 120);
    const characterFocus = clean((qs("#characterFocus") || qs("[name='characterFocus']")).value || "ELIAS", 120);
    const rawIdea = clean((qs("#rawIdea") || qs("#chaosInput") || qs("textarea")).value || "Create a living dark-techno transmission with human core, pressure, emotion and controlled chaos.", 2500);
    const modules = qsa("input[type='checkbox']:checked").map(x => x.value || x.name || x.id).filter(Boolean);
    return {
      trackCount,
      emotion,
      storyPhase,
      characterFocus,
      modules: modules.length ? modules : ["6C","5C","TSS","GMS","USG PRIME"],
      rawIdea,
      targetEngine: "Suno 5.5 Pro Custom",
      version: VERSION
    };
  }

  function localTrack(payload){
    const title = clean((qs("#trackTitle") || {}).value || "Living Transmission", 80);
    const idea = payload.rawIdea || "The signal returns.";
    return {
      title,
      stylePrompt: "Deep Dark Techno, Dark Psy-Techno, Industrial Cyberpunk, 142 BPM, giant sub pressure, rolling bassline, cinematic atmosphere, controlled hypnotic vocals, DJ-mixable, no screaming vocals, hard ending.",
      lyricPrompt: `(0:00–0:32 | INTRO | SIGNAL WAKES)\n[low bunker air]\n[heartbeat under sub pressure]\n\n${idea}\n\n(1:40–3:40 | CONTROLLED ESCALATION)\n[rolling bassline]\n[psy-techno motion]\nThe signal does not disappear.\n\n(5:40–6:00 | FAKEEND WINDOW)\n[near silence]\n\n(6:00–6:45 | FINAL CONVERGENCE)\nStop.\n[hard cut termination]`,
      extendedPrompt: "Preserve human core. No screaming vocals. Fakeend 5:40–6:00, final convergence after 6:10, hard cut ending, no fade collapse, no endless loop."
    };
  }

  function setOutputs(track){
    state.lastTrack = track;
    const map = [
      ["#titleOutput", track.title],
      ["#stylePromptOutput", track.stylePrompt],
      ["#lyricPromptOutput", track.lyricPrompt],
      ["#extendedPromptOutput", track.extendedPrompt],
      ["#outputTitle", track.title],
      ["#outputStyle", track.stylePrompt],
      ["#outputLyrics", track.lyricPrompt],
      ["#outputExtended", track.extendedPrompt]
    ];
    map.forEach(([sel,val]) => {
      const el = qs(sel);
      if(!el) return;
      if("value" in el) el.value = val || "";
      else el.textContent = val || "";
    });
    log("Track output ready", { title: track.title, counts: { style:(track.stylePrompt||"").length, lyric:(track.lyricPrompt||"").length, extended:(track.extendedPrompt||"").length } });
  }

  async function checkOne(url){
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache:"no-store" });
    let data = {};
    try{ data = await res.json(); }catch(e){ data = { ok: res.ok, status: res.status }; }
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  }

  async function checkApis(){
    await loadConfig();
    try{
      const c = await checkOne(base("chaosAiWorker") + "/health");
      setLed("#chaosAiLed", c.ok ? "ok" : "fail", c.ok ? "ok" : "fail");
      log("Chaos AI health", c.data);
    }catch(e){ setLed("#chaosAiLed","fail","fail"); log("Chaos AI failed", { error:String(e.message||e) }); }
    try{
      const s = await checkOne(base("sunoWorker") + "/health");
      setLed("#sunoLed", s.ok ? "ok" : "fail", s.ok ? "ok" : "fail");
      log("Suno health", s.data);
    }catch(e){ setLed("#sunoLed","fail","fail"); log("Suno failed", { error:String(e.message||e) }); }
    try{
      const r = await checkOne("/debug/modules");
      setLed("#rendererLed", r.ok ? "ok" : "warn", r.ok ? "ok" : "warn");
      log("Renderer/module status", r.data);
    }catch(e){ setLed("#rendererLed","warn","local"); log("Renderer status unavailable", { error:String(e.message||e) }); }
  }

  async function generateAi(){
    await loadConfig();
    const payload = collectPayload();
    try{
      setLed("#chaosAiLed","warn","run");
      const res = await fetch(base("chaosAiWorker") + "/api/chaos/generate-track?t=" + Date.now(), {
        method:"POST",
        cache:"no-store",
        headers:{ "content-type":"application/json" },
        credentials:"include",
        body:JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || data.ok === false) throw new Error(data.error || "Chaos AI HTTP " + res.status);
      const track = (data.tracks && data.tracks[0]) || data.track || localTrack(payload);
      setOutputs(track);
      setLed("#chaosAiLed","ok","ok");
    }catch(e){
      const fallback = localTrack(payload);
      setOutputs(fallback);
      setLed("#chaosAiLed","warn","local");
      log("AI unavailable. Local Copy Mode used.", { error:String(e.message||e) });
    }
  }

  async function sendToSuno(){
    await loadConfig();
    const track = state.lastTrack || localTrack(collectPayload());
    try{
      setLed("#sunoLed","warn","send");
      const res = await fetch(base("sunoWorker") + "/api/suno/create?t=" + Date.now(), {
        method:"POST",
        cache:"no-store",
        headers:{ "content-type":"application/json" },
        credentials:"include",
        body:JSON.stringify({
          title: track.title,
          stylePrompt: track.stylePrompt,
          lyricPrompt: track.lyricPrompt,
          extendedPrompt: track.extendedPrompt,
          customMode: true,
          model: "v5.5"
        })
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || data.ok === false) throw new Error(data.error || "Suno HTTP " + res.status);
      state.lastSunoJob = data.jobId || (data.job && data.job.id) || null;
      setLed("#sunoLed","ok","queued");
      log("Suno job created", data);
      if(state.lastSunoJob) pollSuno(state.lastSunoJob);
    }catch(e){
      setLed("#sunoLed","warn","copy");
      log("Suno unavailable. Keep using copy mode.", { error:String(e.message||e) });
    }
  }

  async function pollSuno(jobId){
    if(!jobId) return;
    await loadConfig();
    try{
      const data = await checkOne(base("sunoWorker") + "/api/suno/status/" + encodeURIComponent(jobId));
      log("Suno status", data.data);
      if(data.data && data.data.status && !/done|failed/i.test(data.data.status)) setTimeout(() => pollSuno(jobId), 7000);
      if(data.data && /done/i.test(data.data.status || "")) {
        const result = await checkOne(base("sunoWorker") + "/api/suno/result/" + encodeURIComponent(jobId));
        log("Suno result", result.data);
      }
    }catch(e){ log("Suno poll failed", { error:String(e.message||e) }); }
  }

  async function copyAll(){
    const track = state.lastTrack || localTrack(collectPayload());
    const text = [
      "```", track.title || "", "```",
      "```", track.stylePrompt || "", "```",
      "```", track.lyricPrompt || "", "```",
      "```", track.extendedPrompt || "", "```"
    ].join("\n");
    try{ await navigator.clipboard.writeText(text); log("All four codeboxes copied."); }
    catch(e){ log("Copy failed", { text }); }
  }

  function boot(){
    ensurePanel();
    loadConfig().then(checkApis).catch(()=>{});
    const existingGenerate = qs("#generateTrack, #generateBtn, [data-generate-track]");
    if(existingGenerate && !existingGenerate.__chaosIntegrationBound){
      existingGenerate.__chaosIntegrationBound = true;
      existingGenerate.addEventListener("click", function(ev){ ev.preventDefault(); generateAi(); }, true);
    }
  }

  window.ChaosSunoRendererIntegrationV1 = { checkApis, generateAi, sendToSuno, copyAll, version:VERSION };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
