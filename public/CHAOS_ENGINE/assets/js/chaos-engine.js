/*
FILE: CHAOS_ENGINE/assets/js/chaos-engine.js
CREATED: 2026-05-24
PURPOSE: Chaos Engine V3 Einzel-HTML modular controller.
*/
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const API_BASE = "/api/chaos-engine";
  const SUNO_URL = "https://666-suno-system.666soundsdesign-broadcaster.com";
  let SYS = null;
  let handoffText = "";
  const MODULES = [
    "6C Master System","5C Emotion Control","5C Gate System","Story Intelligence Guard","Vocal Clarity Guard",
    "Dialogue Guard","Build-Up Guard","Drop Guard","Pressure Guard","Listener Fatigue Guard","Minimum Runtime Guard",
    "Fakeend Guard","Endguard","TSS Guard","GMS CORE","USG PRIME","EETP Core","Humanity Recall",
    "Memory Echo","Signal Phrase System","DJ Mixability","Visual DNA Sync","Recovered Transmission Archive"
  ];
  const state = {};

  function esc(s){return String(s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
  function setOptions(id, arr){$(id).innerHTML = arr.map(v=>`<option>${esc(v)}</option>`).join("");}
  function selectedModules(){return [...document.querySelectorAll(".ce-module input:checked")].map(x=>x.value);}
  function readState(){
    Object.assign(state,{
      trackNumber:$("trackNumber").value,
      trackTitle:$("trackTitle").value.trim()||"UNTITLED TRANSMISSION",
      storyPhase:$("storyPhase").value,
      characterFocus:$("characterFocus").value,
      energyLevel:$("energyLevel").value,
      atmosphereMode:$("atmosphereMode").value,
      cState:$("cState").value,
      fakeendEnabled:$("fakeendEnabled").checked,
      finalConvergenceEnabled:$("finalConvergenceEnabled").checked,
      eetpEnabled:$("eetpEnabled").checked,
      teacherAllowed:$("teacherAllowed").checked,
      concept:$("concept").value.trim(),
      modules:selectedModules(),
      titleOutput:$("titleOutput").value,
      stylePrompt:$("stylePrompt").value,
      lyricPrompt:$("lyricPrompt").value,
      extendedPrompt:$("extendedPrompt").value
    });
    return state;
  }
  function writeOutputs(track){
    $("titleOutput").value = track.title || track.titleOutput || "";
    $("stylePrompt").value = track.stylePrompt || "";
    $("lyricPrompt").value = track.lyricPrompt || "";
    $("extendedPrompt").value = track.extendedPrompt || "";
    updateCounts();
    saveLocal();
  }
  function updateCounts(){
    const style=$("stylePrompt").value.length, lyric=$("lyricPrompt").value.length, ext=$("extendedPrompt").value.length;
    $("titleCount").textContent = $("titleOutput").value.length + " chars";
    $("styleCount").textContent = style + "/1000";
    $("lyricCount").textContent = lyric + "/5000";
    $("extendedCount").textContent = ext + "/800";
    $("limitStatus").textContent = (style<=1000 && lyric<=5000 && ext<=800) ? "LIMITS: OK" : "LIMITS: CHECK";
    $("limitStatus").className = "ce-pill " + ((style<=1000 && lyric<=5000 && ext<=800) ? "ok" : "bad");
  }
  function buildLocal(){
    const s = readState();
    const title = `${s.trackNumber} - CHAOS MATRIX SAGA - ${s.trackTitle.toUpperCase()}`.replace(/[–—]/g,"-");
    const modules = s.modules.join(", ") || "Guard Matrix, 6C, 5C, TSS, GMS, USG Prime";
    const stylePrompt = [
      "Dark Techno, Psy-Techno, Psytrance, Industrial Cyberpunk, Cinematic Sci-Fi",
      "142 BPM, giant sub pressure, warehouse bunker energy, rolling bassline, hypnotic movement",
      "emotional electric guitar humanity layer, cinematic atmosphere, controlled psychedelic escalation",
      "DJ mixable, stable grid, no screaming vocals, no generic EDM, no endless loop"
    ].join(", ");
    const lyricPrompt = `(0:00–0:40 | INTRO | ${s.atmosphereMode})
[Heartbeat]
[spoken - ${s.characterFocus}]
You hear me.

(0:40–2:20 | PROTECTED EVOLUTION ZONE | ${s.storyPhase})
${s.concept || "The signal begins inside the human core."}

(2:20–4:30 | PRESSURE DEVELOPMENT | ${s.cState} CONTROLLED ESCALATION)
[Active systems: ${modules}]
The rhythm carries the memory forward.

(4:30–5:40 | EXPANSION ZONE | ${s.energyLevel})
[Rolling bassline]
[Controlled vocal clarity]
The transmission opens wider without losing the human center.

(5:40–6:00 | FAKE END WINDOW | CONTROLLED FALSE ENDING)
[Silence impact]
[Heartbeat returns]

(6:00–6:10 | REACTIVATION WINDOW)
[Sub pressure re-enters]
You're still here.

(6:10–6:45 | FINAL CONVERGENCE ZONE | HARD CUT PREPARATION)
[Final convergence]
Stop.
[Hard cut termination]`;
    const extendedPrompt = "No screaming vocals. Preserve vocal clarity and human core. Maintain DJ mixability, stable grid, fakeend between 5:40–6:00, reactivation after fakeend, final convergence after 6:10, hard anti-loop ending. No fade collapse.";
    writeOutputs({title, stylePrompt, lyricPrompt, extendedPrompt});
  }
  function allFour(){
    readState();
    return `CODEBOX 1 — TITLE\n${$("titleOutput").value}\n\nCODEBOX 2 — STYLE PROMPT\n${$("stylePrompt").value}\n\nCODEBOX 3 — LYRIC / STRUCTURE PROMPT\n${$("lyricPrompt").value}\n\nCODEBOX 4 — EXTENDED / FINAL CONTROL PROMPT\n${$("extendedPrompt").value}`;
  }
  async function apiGenerate(kind, payload){
    const res = await fetch(`${API_BASE}/${kind}`, {method:"POST",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify(payload)});
    const text = await res.text();
    let data; try{data=JSON.parse(text)}catch{data={ok:false,raw:text}};
    data.__status=res.status;
    return data;
  }
  async function generateApi(){
    readState();
    $("debugOutput").textContent = "Worker AI request...";
    try{
      const data = await apiGenerate("track-generate", state);
      $("debugOutput").textContent = JSON.stringify(data,null,2);
      if(data.ok && data.tracks && data.tracks[0]) writeOutputs(data.tracks[0]);
    }catch(e){$("debugOutput").textContent = "API failed: " + e.message;}
  }
  function validate(){
    updateCounts();
    const warnings=[];
    if($("stylePrompt").value.length>1000) warnings.push("Style Prompt > 1000");
    if($("lyricPrompt").value.length>5000) warnings.push("Lyric Prompt > 5000");
    if($("extendedPrompt").value.length>800) warnings.push("Extended Prompt > 800");
    if(/[–—]/.test($("titleOutput").value)) warnings.push("Title uses long dash");
    if(/scream|screaming|shout/i.test($("lyricPrompt").value+" "+$("stylePrompt").value+" "+$("extendedPrompt").value)) warnings.push("No screaming/shouting instruction allowed");
    $("debugOutput").textContent = JSON.stringify({ok:warnings.length===0,warnings},null,2);
    return warnings.length===0;
  }
  function buildStory(){
    readState();
    $("storyOutput").textContent = `CHAOS MATRIX SAGA — STORYLINE PACKAGE\n\nCore Phase: ${state.storyPhase}\nCharacter Focus: ${state.characterFocus}\nEnergy: ${state.energyLevel}\n\nStory Function:\n${state.concept || "Define the emotional transmission arc."}\n\nArc Rules:\n- beginning → escalation → synchronization → fragmentation → resistance → collapse → reactivation → transformation → final transmission\n- every track is a living transmission\n- recurring phrases transform, never copy identically\n- preserve the human core`;
  }
  function buildVisual(){
    readState();
    $("visualOutput").textContent = `VISUAL DNA PACKAGE\n\nColors: Neon Blue, Cyan, Purple, Neon Pink, Industrial Black, Toxic Red\nStyle: holographic cyberpunk, emotional dystopia, recovered transmission artifact\n\nFront Cover A: cinematic signal artifact with ${state.characterFocus} emotional core\nFront Cover B: darker fragmented cyberpunk pressure version\nBack Cover: track transmission archive layout\nDisc Artwork: circular signal geometry, heartbeat pulse, glitch halo\nMP3 Artwork: simplified high-contrast neon symbol\n\nConcept:\n${$("visualInput").value || state.concept}`;
  }
  function buildInlay(){
    $("inlayOutput").textContent = `RECOVERED TRANSMISSION ARCHIVE\n\n1. Welcome Transmission\n2. Creator Origin\n3. Chaos Matrix Lore\n4. Freak Nation Manifest\n5. Signal Theory\n6. Experience Guide\n7. Transmission Warnings\n8. Final Transmission\n\nInput:\n${$("inlayInput").value || $("concept").value}`;
  }
  function saveLocal(){ localStorage.setItem("CHAOS_ENGINE_SINGLE_HTML_STATE", JSON.stringify(readState())); }
  function loadLocal(){
    try{
      const s=JSON.parse(localStorage.getItem("CHAOS_ENGINE_SINGLE_HTML_STATE")||"null");
      if(!s)return;
      for(const [k,v] of Object.entries(s)){
        if($(k) && typeof v !== "object") {
          if($(k).type==="checkbox") $(k).checked=!!v; else $(k).value=v;
        }
      }
      if(s.titleOutput) $("titleOutput").value=s.titleOutput;
      if(s.stylePrompt) $("stylePrompt").value=s.stylePrompt;
      if(s.lyricPrompt) $("lyricPrompt").value=s.lyricPrompt;
      if(s.extendedPrompt) $("extendedPrompt").value=s.extendedPrompt;
    }catch{}
  }
  function exportJson(){
    const blob = new Blob([JSON.stringify({state:readState(), system:SYS, exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="CHAOS_ENGINE_EXPORT.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(){
    try{const obj=JSON.parse($("importBox").value); Object.assign(state,obj.state||obj); for(const [k,v] of Object.entries(state)){ if($(k)&&typeof v!=="object") $(k).value=v; } writeOutputs(state); $("debugOutput").textContent="Import OK";}catch(e){$("debugOutput").textContent="Import failed: "+e.message;}
  }
  async function boot(){
    SYS = await fetch("./assets/data/master-system-v3.json").then(r=>r.json());
    handoffText = await fetch("./assets/data/master-handoff-v3.md").then(r=>r.text()).catch(()=>SYS.fullHandoffMarkdown||"");
    $("bootStatus").textContent="BOOT: V3 ACTIVE";
    $("systemOutput").textContent=JSON.stringify(SYS,null,2);
    setOptions("storyPhase", ["beginning","escalation","synchronization","fragmentation","resistance","collapse","reactivation","transformation","final transmission"]);
    setOptions("characterFocus", Object.keys(SYS.characters));
    setOptions("energyLevel", ["low pulse","controlled pressure","peak-time overload","collapse pressure","final convergence"]);
    setOptions("atmosphereMode", ["3C Human Atmosphere","4C Pressure Atmosphere","Cinematic Drone Intro","Heartbeat Recall","Industrial Bunker Field","Psychedelic Acid Escalation"]);
    setOptions("cState", ["3C","4C","5C","6C"]);
    $("moduleMatrix").innerHTML = MODULES.map(m=>`<label class="ce-module"><input type="checkbox" value="${m}" ${/Guard|6C|5C|TSS|GMS|USG/.test(m)?"checked":""}><span>${m}</span></label>`).join("");
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("is-active",x===b));document.querySelectorAll("[data-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.panel===b.dataset.tab));});
    document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>navigator.clipboard.writeText($(b.dataset.copy).value || $(b.dataset.copy).textContent));
    $("generateLocal").onclick=buildLocal; $("generateApi").onclick=generateApi; $("validateAll").onclick=validate; $("copyAll").onclick=()=>navigator.clipboard.writeText(allFour()); $("clearAll").onclick=()=>{localStorage.removeItem("CHAOS_ENGINE_SINGLE_HTML_STATE");location.reload();};
    $("buildStory").onclick=buildStory; $("buildVisual").onclick=buildVisual; $("buildInlay").onclick=buildInlay;
    $("reloadSystem").onclick=()=>{$("systemOutput").textContent=JSON.stringify(SYS,null,2)}; $("copyHandoff").onclick=()=>navigator.clipboard.writeText(handoffText||SYS.fullHandoffMarkdown||"");
    $("checkApi").onclick=async()=>{try{const r=await fetch("/api/chaos-engine/auth-status",{credentials:"include",cache:"no-store"});$("debugOutput").textContent=await r.text();$("apiStatus").textContent="API: checked";}catch(e){$("debugOutput").textContent=e.message;$("apiStatus").textContent="API: unavailable";}};
    $("exportJson").onclick=exportJson; $("importJson").onclick=importJson; $("openSuno").onclick=()=>window.open(SUNO_URL,"_blank","noopener,noreferrer");
    ["titleOutput","stylePrompt","lyricPrompt","extendedPrompt"].forEach(id=>$(id).addEventListener("input",()=>{updateCounts();saveLocal();}));
    loadLocal(); updateCounts();
  }
  boot().catch(e=>{$("bootStatus").textContent="BOOT: ERROR";$("debugOutput").textContent=e.stack||e.message;});
})();
