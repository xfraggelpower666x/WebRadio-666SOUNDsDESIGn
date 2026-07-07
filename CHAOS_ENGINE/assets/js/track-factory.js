/*
FILE: CHAOS_ENGINE/assets/js/track-factory.js
CREATED: 2026-05-24
PURPOSE: Second full HTML page controller for Track Factory.
*/
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const SUNO_URL = "https://666-suno-system.666soundsdesign-broadcaster.com";
  const GUARDS = ["Story Intelligence Guard","Vocal Clarity Guard","Dialogue Guard","Build-Up Guard","Drop Guard","Pressure Guard","Listener Fatigue Guard","Minimum Runtime Guard","Fakeend Guard","Endguard","TSS Guard","GMS CORE","USG PRIME","Orchester Guard","Human Resonance Guard"];

  function val(id){return $(id).type==="checkbox" ? $(id).checked : $(id).value}
  function styleDNA(){
    const parts = [];
    if(val("tfDarkTechno")) parts.push("Deep Dark Techno");
    if(val("tfBunker")) parts.push("Deep Dark Bunker/Warehouse pressure");
    if(val("tfPsy")) parts.push("Psy-Techno and Psytrance movement");
    if(val("tfIndustrial")) parts.push("Industrial Cyberpunk");
    if(val("tfErotic")) parts.push("Deep Dark Erotical tension");
    if(val("tfGuitar")) parts.push("emotional electric guitar humanity layer");
    if(val("tfHumanFx")) parts.push("human resonance breath/heartbeat/whisper texture");
    return parts.join(", ");
  }
  function build(){
    const title = (val("tfTitle") || "Untitled Transmission").replace(/[–—]/g,"-").trim();
    const input = val("tfInput") || "The human signal enters the bunker pressure and refuses to disappear.";
    const dropLogic = [val("tfFakeDrop") ? "fake drop" : "", val("tfDoubleDrop") ? "double drop" : "", val("tfMegaDrop") ? "mega drop only if emotionally justified" : "", val("tfSilenceImpact") ? "silence impact" : ""].filter(Boolean).join(", ");
    const style = `${styleDNA()}, ${val("tfBpm")}, giant sub pressure, rolling bassline, hypnotic motion, cinematic atmosphere, controlled vocal clarity, DJ mixable extended intro/outro, ${dropLogic}, no generic EDM, no weak mastering${val("tfNoScream")?", no screaming vocals":""}.`;
    const lyric = `(0:00–0:32 | DJ MIX INTRO | ATMOSPHERE SEED)
[low bunker air]
[heartbeat hidden under sub pressure]

(0:32–1:30 | GROOVE ENTRY | PRESSURE IGNITION)
[rolling bassline]
[industrial percussion begins]
${input}

(1:30–2:30 | STORY VOCAL | CLARITY ZONE)
[controlled intimate vocal delivery]
[voice stays understandable]
The signal does not explain itself.
It moves through the room.

(2:30–3:30 | BUILD-UP | ${dropLogic || "controlled pressure rise"})
[FX riser]
[short silence cut]
The floor holds its breath.

(3:30–4:40 | MAIN DROP | BUNKER PRESSURE)
[giant sub pressure]
[psy-techno motion]
[no vocal screaming]

(4:40–5:40 | EXPANSION | MEMORY ECHO)
[electric guitar humanity layer]
[human breath texture]
The human core remains alive inside the machine.

(5:40–6:00 | FAKEEND WINDOW | FALSE TERMINATION)
[near silence]
[heartbeat returns]

(6:00–6:10 | REACTIVATION)
[sub pressure re-enters]
You're still here.

(6:10–6:45 | FINAL CONVERGENCE | HARD CUT)
[final convergence]
Stop.
[hard cut termination]`;
    const extended = "Single Track Compression. Preserve human core. Use Orchester Guard to coordinate kick/sub/bass/drums/vocals/FX/drops. No screaming vocals. Fakeend only 5:40–6:00. Reactivation after fakeend. Final convergence after 6:10. Hard cut ending, no fade collapse, no endless loop.";
    $("tfOutTitle").value = title;
    $("tfOutStyle").value = style.slice(0,1000);
    $("tfOutLyric").value = lyric.slice(0,5000);
    $("tfOutExtended").value = extended.slice(0,800);
    validate();
    save();
  }
  function four(){return `CODEBOX 1 — TITLE\n${$("tfOutTitle").value}\n\nCODEBOX 2 — STYLE PROMPT\n${$("tfOutStyle").value}\n\nCODEBOX 3 — LYRIC / STRUCTURE PROMPT\n${$("tfOutLyric").value}\n\nCODEBOX 4 — EXTENDED / FINAL CONTROL PROMPT\n${$("tfOutExtended").value}`;}
  function validate(){
    const warnings = [];
    if($("tfOutStyle").value.length>1000) warnings.push("Style > 1000");
    if($("tfOutLyric").value.length>5000) warnings.push("Lyric > 5000");
    if($("tfOutExtended").value.length>800) warnings.push("Extended > 800");
    if(/[–—]/.test($("tfOutTitle").value)) warnings.push("Title uses long dash");
    if(/screaming|shouting|scream|shout/i.test($("tfOutStyle").value+$("tfOutLyric").value+$("tfOutExtended").value)) warnings.push("No screaming/shouting instruction allowed");
    $("tfDebugOutput").textContent = JSON.stringify({ok:warnings.length===0,warnings,counts:{style:$("tfOutStyle").value.length,lyric:$("tfOutLyric").value.length,extended:$("tfOutExtended").value.length}}, null, 2);
    $("tfLimitStatus").textContent = warnings.length ? "LIMITS: CHECK" : "LIMITS: OK";
    $("tfLimitStatus").className = "ce-pill " + (warnings.length ? "bad" : "ok");
  }
  function save(){
    const fields = ["tfTitle","tfFunction","tfLanguage","tfBpm","tfInput","tfOutTitle","tfOutStyle","tfOutLyric","tfOutExtended"];
    const checks = ["tfDarkTechno","tfBunker","tfPsy","tfIndustrial","tfErotic","tfGuitar","tfHumanFx","tfNoScream","tfFakeDrop","tfDoubleDrop","tfMegaDrop","tfSilenceImpact"];
    const data = {};
    fields.forEach(id=>data[id]=$(id).value);
    checks.forEach(id=>data[id]=$(id).checked);
    localStorage.setItem("CHAOS_TRACK_FACTORY_STATE", JSON.stringify(data));
  }
  function load(){
    try{
      const data = JSON.parse(localStorage.getItem("CHAOS_TRACK_FACTORY_STATE")||"{}");
      Object.entries(data).forEach(([id,v])=>{ if($(id)){ if($(id).type==="checkbox") $(id).checked=!!v; else $(id).value=v; }});
    }catch{}
  }
  function exportJson(){
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(), title:$("tfOutTitle").value, stylePrompt:$("tfOutStyle").value, lyricPrompt:$("tfOutLyric").value, extendedPrompt:$("tfOutExtended").value}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="CHAOS_TRACK_FACTORY_EXPORT.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(){
    try{
      const data = JSON.parse($("tfImportBox").value);
      $("tfOutTitle").value = data.title || data.titleOutput || "";
      $("tfOutStyle").value = data.stylePrompt || "";
      $("tfOutLyric").value = data.lyricPrompt || "";
      $("tfOutExtended").value = data.extendedPrompt || "";
      validate(); save();
    }catch(e){$("tfDebugOutput").textContent = "Import failed: " + e.message;}
  }
  function boot(){
    $("tfGuardMatrix").innerHTML = GUARDS.map(g=>`<div class="tf-guard"><strong>${g}</strong><br><span>ACTIVE</span></div>`).join("");
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("is-active",x===b));document.querySelectorAll("[data-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.panel===b.dataset.tab));});
    $("tfBuild").onclick = build; $("tfValidate").onclick = validate; $("tfCopyAll").onclick = ()=>navigator.clipboard.writeText(four()); $("tfClear").onclick = ()=>{localStorage.removeItem("CHAOS_TRACK_FACTORY_STATE");location.reload();};
    $("tfExportJson").onclick = exportJson; $("tfImportJson").onclick = importJson; $("tfOpenSuno").onclick = ()=>window.open(SUNO_URL,"_blank","noopener,noreferrer");
    load(); validate();
    $("tfBootStatus").textContent = "BOOT: TRACK FACTORY ACTIVE";
    $("tfGuardStatus").textContent = "GUARDS: ACTIVE";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
