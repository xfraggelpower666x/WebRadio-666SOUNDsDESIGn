/*
FILE: CHAOS_ENGINE/assets/js/fraggle-detlef-system.js
CREATED: 2026-05-24
PURPOSE: Fraggle Detlef System V2.1 full HTML page controller.
*/
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const SUNO_URL = "https://666-suno-system.666soundsdesign-broadcaster.com";
  let SYS = null;

  function esc(s){return String(s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}

  function build(){
    const title = ($("fdsTitle").value || "Living Transmission").replace(/[–—]/g,"-").trim();
    const mode = $("fdsMode").value;
    const material = $("fdsMaterial").value || "Give me lyrics, idea, image, story, set goal or raw material. The system screams for work.";
    const style = `${mode}, 142-145 BPM if useful, Deep Dark Techno / Psytrance pressure, living memory transmission, Fraggle DNA, Human Resonance, Source-First Sound Design, Orchester Guard, Anti Clone Rhythm System, controlled vocal clarity, DJ usable, pressure without mud, chaos without collapse, no generic EDM, no screaming vocals.`;
    const lyric = `(0:00–0:32 | INTRO | ATMOSPHERE ARCHITECTURE)
[close human heartbeat pulsing under the sub layer, warm, fragile, alive]
[ancient pressure room opening around the listener]

(0:32–1:40 | CORE SIGNAL | FRAGGLE DNA)
${material}

(1:40–2:50 | CONTROLLED PRESSURE | ORCHESTER GUARD)
[rolling bassline]
[dark techno pressure]
[psychedelic motion from behind]
Each sound has a function.
Nothing is noise without purpose.

(2:50–3:40 | CHAOS VARIATION | ANTI CLONE RHYTHM)
[shifted percussion accents]
[short silence build]
[delayed pressure response]
Same emotion.
Another path.

(3:40–4:50 | HUMAN RESONANCE | LIVING MEMORY)
[warm human exhale close to the microphone]
[voice trembles slightly]
The room remembers what the words cannot carry.

(4:50–5:40 | FREE WILDERNESS | TRANSFORMATION)
[source-first sound design]
[pressure chambers approaching critical resonance]
Chaos becomes movement.
Movement becomes memory.

(5:40–6:00 | FAKEEND WINDOW | CONTROLLED FALSE ENDING)
[emotional silence]
[heartbeat remains]

(6:00–6:45 | FINAL TERMINATION | HARD CUT)
[final pressure convergence]
Stop.
[hard cut termination]`;
    const extended = "Use 6C Core, 5C Rotation, Orchester Guard, DNA Guard, Anti Clone Guard, Anti Clone Rhythm System, Chaos Variation Guard, Meta Guard, Random Session Engine, Klangliches Sehen, Output Limit Guard V2. Preserve Fraggle DNA and Human Resonance. No screaming vocals. Fakeend only late. Hard ending, no fade collapse.";
    $("fdsOutTitle").value = title.slice(0,80);
    $("fdsOutStyle").value = style.slice(0,1000);
    $("fdsOutLyric").value = lyric.slice(0,5000);
    $("fdsOutExtended").value = extended.slice(0,800);
    validate();
    save();
  }

  function four(){
    return `CODEBOX 1 — TITLE\n${$("fdsOutTitle").value}\n\nCODEBOX 2 — STYLE PROMPT\n${$("fdsOutStyle").value}\n\nCODEBOX 3 — LYRIC PROMPT\n${$("fdsOutLyric").value}\n\nCODEBOX 4 — EXTENDED PROMPT\n${$("fdsOutExtended").value}`;
  }

  function validate(){
    const warnings=[];
    if($("fdsOutTitle").value.length>80) warnings.push("Title > 80");
    if($("fdsOutStyle").value.length>1000) warnings.push("Style > 1000");
    if($("fdsOutLyric").value.length>5000) warnings.push("Lyric > 5000");
    if($("fdsOutExtended").value.length>800) warnings.push("Extended > 800");
    if(/[–—]/.test($("fdsOutTitle").value)) warnings.push("Title uses long dash");
    if(/screaming|shouting|scream|shout/i.test($("fdsOutStyle").value+$("fdsOutLyric").value+$("fdsOutExtended").value)) warnings.push("No screaming/shouting instruction allowed");
    $("fdsDebugOutput").textContent=JSON.stringify({ok:warnings.length===0,warnings,counts:{title:$("fdsOutTitle").value.length,style:$("fdsOutStyle").value.length,lyric:$("fdsOutLyric").value.length,extended:$("fdsOutExtended").value.length}},null,2);
    $("fdsLimitStatus").textContent=warnings.length?"LIMITS: CHECK":"LIMITS: OK";
    $("fdsLimitStatus").className="ce-pill "+(warnings.length?"bad":"ok");
  }

  function save(){
    const data={};
    ["fdsTitle","fdsMode","fdsMaterial","fdsOutTitle","fdsOutStyle","fdsOutLyric","fdsOutExtended"].forEach(id=>data[id]=$(id).value);
    localStorage.setItem("FRAGGLE_DETLEF_SYSTEM_STATE",JSON.stringify(data));
  }

  function load(){
    try{
      const data=JSON.parse(localStorage.getItem("FRAGGLE_DETLEF_SYSTEM_STATE")||"{}");
      Object.entries(data).forEach(([id,v])=>{if($(id))$(id).value=v});
    }catch{}
  }

  function exportJson(){
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),system:"FRAGGLE DETLEF SYSTEM V2.1",title:$("fdsOutTitle").value,stylePrompt:$("fdsOutStyle").value,lyricPrompt:$("fdsOutLyric").value,extendedPrompt:$("fdsOutExtended").value},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="FRAGGLE_DETLEF_SYSTEM_EXPORT.json"; a.click(); URL.revokeObjectURL(url);
  }

  function importJson(){
    try{
      const data=JSON.parse($("fdsImportBox").value);
      $("fdsOutTitle").value=data.title||data.titleOutput||"";
      $("fdsOutStyle").value=data.stylePrompt||"";
      $("fdsOutLyric").value=data.lyricPrompt||"";
      $("fdsOutExtended").value=data.extendedPrompt||"";
      validate(); save();
    }catch(e){$("fdsDebugOutput").textContent="Import failed: "+e.message;}
  }

  function searchSource(){
    const q=($("fdsSearch").value||"").toLowerCase().trim();
    if(!q){$("fdsSourceOutput").textContent=SYS.fullText;return;}
    const lines=SYS.fullText.split(/\n/);
    const hits=[];
    lines.forEach((line,i)=>{if(line.toLowerCase().includes(q))hits.push(`${i+1}: ${line}`)});
    $("fdsSourceOutput").textContent=hits.length?hits.join("\n"):"No matches.";
  }

  async function boot(){
    SYS=await fetch("./assets/data/fraggle-detlef-system-v2-1.json").then(r=>r.json());
    $("fdsBootOutput").textContent=SYS.bootResponse.join("\n")+"\nGive me lyrics, idea, image, story, set goal or raw material.\nThe system screams for work.";
    $("fdsModules").innerHTML=SYS.coreModules.map(m=>`<div class="fds-module"><strong>${esc(m)}</strong><span>ACTIVE</span></div>`).join("");
    $("fdsGuardGrid").innerHTML=SYS.coreModules.concat(["Vocal Clarity Guard","DJ Usability Guard","Radio Compatibility Guard"]).map(g=>`<div class="fds-guard"><strong>${esc(g)}</strong><span>ACTIVE</span></div>`).join("");
    $("fdsSourceOutput").textContent=SYS.fullText.slice(0,30000);
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("is-active",x===b));document.querySelectorAll("[data-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.panel===b.dataset.tab));});
    $("fdsCopyBoot").onclick=()=>navigator.clipboard.writeText($("fdsBootOutput").textContent);
    $("fdsSystemOnline").onclick=()=>{$("fdsBootStatus").textContent="BOOT: SYSTEM ONLINE";};
    $("fdsBuild").onclick=build; $("fdsValidate").onclick=validate; $("fdsCopyAll").onclick=()=>navigator.clipboard.writeText(four()); $("fdsClear").onclick=()=>{localStorage.removeItem("FRAGGLE_DETLEF_SYSTEM_STATE");location.reload();};
    $("fdsSearchSource").onclick=searchSource; $("fdsCopySource").onclick=()=>navigator.clipboard.writeText(SYS.fullText);
    $("fdsExportJson").onclick=exportJson; $("fdsImportJson").onclick=importJson; $("fdsOpenSuno").onclick=()=>window.open(SUNO_URL,"_blank","noopener,noreferrer");
    load(); validate();
    $("fdsBootStatus").textContent="BOOT: V2.1 ACTIVE";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
