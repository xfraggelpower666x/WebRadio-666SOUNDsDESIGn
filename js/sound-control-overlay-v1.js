/*
FILE: js/sound-control-overlay-v1.js
CREATED: 2026-05-25
PURPOSE: PC+iPhone Sound Control Overlay V1.
CHANGE SUMMARY:
- 9-band EQ UI + Booster controls in one overlay.
- Bridges to existing real WebAudio EQ/Booster controls instead of creating a second AudioContext.
- localStorage state + 3 presets.
- Dirty-state close confirmation.
*/
(function(){
  "use strict";

  var STORAGE_KEY = "s666_sound_control_state_v1";
  var PRESET_PREFIX = "s666_sound_control_preset_v1_";
  var VERSION = "sound-control-overlay-v1-20260525";
  var BANDS = [
    { key:"low", label:"LOW" },
    { key:"lowMid", label:"260" },
    { key:"mid", label:"1K" },
    { key:"highMid", label:"3.4K" },
    { key:"high", label:"HIGH" }
  ];

  var state = loadState();
  var draft = clone(state);
  var dirty = false;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, min, max){ n = Number(n); if(!isFinite(n)) n = 0; return Math.max(min, Math.min(max, Math.round(n))); }
  function clone(obj){ return JSON.parse(JSON.stringify(obj || {})); }

  function defaultState(){
    var eq = {};
    BANDS.forEach(function(b){ eq[b.key] = 0; });
    return { version: VERSION, active: true, boosterActive: true, boosterLevel: readBoostStage(), eq: eq, updatedAt: new Date().toISOString() };
  }

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        var parsed = JSON.parse(raw);
        var d = defaultState();
        parsed.eq = Object.assign(d.eq, parsed.eq || {});
        return Object.assign(d, parsed);
      }
    }catch(_){}
    return defaultState();
  }

  function saveState(next){
    state = clone(next || draft);
    state.version = VERSION;
    state.updatedAt = new Date().toISOString();
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_){}
    dirty = false;
    updateLed();
    renderValues();
  }

  function readEqFromDom(){
    if(window.SMFPRealEq && typeof window.SMFPRealEq.getState === "function"){
      draft.eq = Object.assign(draft.eq || {}, window.SMFPRealEq.getState());
      return;
    }
    BANDS.forEach(function(b){
      var input = b.selector ? qs(b.selector) : null;
      if(input) draft.eq[b.key] = clamp(input.value, -12, 12);
    });
  }

  function dispatchInput(input){
    if(!input) return;
    input.dispatchEvent(new Event("input", { bubbles:true }));
    input.dispatchEvent(new Event("change", { bubbles:true }));
  }

  function applyEqToDom(next){
    var values = {};
    BANDS.forEach(function(b){
      var value = clamp((next.eq || {})[b.key], -12, 12);
      values[b.key] = value;
      var input = b.selector ? qs(b.selector) : null;
      if(input){
        input.value = String(value);
        dispatchInput(input);
      }
    });
    if(window.SMFPRealEq && typeof window.SMFPRealEq.setState === "function") window.SMFPRealEq.setState(values);
    document.dispatchEvent(new CustomEvent("s666:sound-eq", { detail:{ values:values } }));
  }

  function readBoostStage(){
    var attr = document.documentElement.getAttribute("data-mff-boost") || document.documentElement.getAttribute("data-smfp-boost-stage-active") || "";
    var n = Number(attr);
    if(isFinite(n)) return clamp(n, 0, 5);
    var label = qs("#pcBoostLabel .status-code,#mffBoost");
    if(label){
      var m = String(label.textContent || "").match(/(\d+)/);
      if(m) return clamp(m[1], 0, 5);
    }
    try{
      if(window.SMFPBoostCore && typeof window.SMFPBoostCore.loadStage === "function") return clamp(window.SMFPBoostCore.loadStage(),0,5);
    }catch(_){}
    return 0;
  }

  function clickBoostStep(delta){
    var selector = delta > 0 ? "#pcBoostPlus,[data-boost-step='1'],.boost-step-up" : "#pcBoostMinus,[data-boost-step='-1'],.boost-step-down";
    var btn = qs(selector);
    if(btn){
      btn.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true, view:window }));
      return true;
    }
    return false;
  }

  function setBoostStage(target){
    target = clamp(target,0,5);
    document.dispatchEvent(new CustomEvent("s666:sound-boost", { detail:{ stage:target } }));
    if(window.SMFPPlayerBoost && typeof window.SMFPPlayerBoost.setStage === "function"){
      window.SMFPPlayerBoost.setStage(target);
      return;
    }
    var guard = 0;
    var current = readBoostStage();
    while(current < target && guard++ < 8){ if(!clickBoostStep(1)) break; current += 1; }
    while(current > target && guard++ < 16){ if(!clickBoostStep(-1)) break; current -= 1; }
    document.documentElement.setAttribute("data-s666-sound-boost-target", String(target));
    try{
      if(window.SMFPBoostCore && typeof window.SMFPBoostCore.saveStage === "function") window.SMFPBoostCore.saveStage(target);
    }catch(_){}
  }

  function applyDraft(){
    applyEqToDom(draft);
    if(draft.boosterActive) setBoostStage(draft.boosterLevel);
    else setBoostStage(0);
    updateLed();
  }

  function getOverlay(){
    var el = qs("#s666SoundControlOverlay");
    if(el) return el;
    el = document.createElement("div");
    el.id = "s666SoundControlOverlay";
    el.className = "s666-sound-overlay is-hidden";
    el.innerHTML = [
      '<div class="s666-sound-backdrop" data-sound-close="1"></div>',
      '<section class="s666-sound-panel" role="dialog" aria-modal="true" aria-label="Sound Control">',
        '<header class="s666-sound-head">',
          '<div><b>SOUND CONTROL</b><span>5-BAND EQ · BOOSTER · LOCAL PRESETS</span></div>',
          '<button type="button" class="s666-sound-x" data-sound-close="1">×</button>',
        '</header>',
        '<main class="s666-sound-body">',
          '<div class="s666-sound-eq" id="s666SoundEq"></div>',
          '<section class="s666-sound-boost">',
            '<div class="s666-sound-boost-title">BOOSTER</div>',
            '<label class="s666-sound-toggle"><input id="s666SoundBoostActive" type="checkbox"> <span>Booster active</span></label>',
            '<input id="s666SoundBoostLevel" type="range" min="0" max="5" step="1">',
            '<div class="s666-sound-boost-readout"><span id="s666SoundBoostValue">0</span><span id="s666SoundBoostGain">1.00×</span></div>',
          '</section>',
          '<section class="s666-sound-presets">',
            '<button type="button" data-preset-load="1">PRESET 1</button><button type="button" data-preset-save="1">SAVE 1</button>',
            '<button type="button" data-preset-load="2">PRESET 2</button><button type="button" data-preset-save="2">SAVE 2</button>',
            '<button type="button" data-preset-load="3">PRESET 3</button><button type="button" data-preset-save="3">SAVE 3</button>',
          '</section>',
        '</main>',
        '<footer class="s666-sound-actions">',
          '<span id="s666SoundDirty" class="s666-sound-status">READY</span>',
          '<button type="button" data-sound-reset>RESET</button>',
          '<button type="button" data-sound-save>SAVE</button>',
          '<button type="button" data-sound-close="1">CLOSE</button>',
        '</footer>',
      '</section>'
    ].join("");
    document.body.appendChild(el);

    var eq = qs("#s666SoundEq", el);
    BANDS.forEach(function(b){
      var row = document.createElement("label");
      row.className = "s666-sound-band";
      row.innerHTML = '<span>'+b.label+'</span><input type="range" min="-12" max="12" step="1" data-sound-band="'+b.key+'"><b data-sound-band-value="'+b.key+'">0</b>';
      eq.appendChild(row);
    });

    el.addEventListener("click", function(ev){
      if(ev.target && ev.target.getAttribute("data-sound-close")) { ev.preventDefault(); requestClose(); return; }
      var savePreset = ev.target && ev.target.getAttribute("data-preset-save");
      if(savePreset){ ev.preventDefault(); savePresetSlot(savePreset); return; }
      var loadPreset = ev.target && ev.target.getAttribute("data-preset-load");
      if(loadPreset){ ev.preventDefault(); loadPresetSlot(loadPreset); return; }
      if(ev.target && ev.target.getAttribute("data-sound-save") !== null){ ev.preventDefault(); saveState(draft); applyDraft(); return; }
      if(ev.target && ev.target.getAttribute("data-sound-reset") !== null){ ev.preventDefault(); resetDraft(); return; }
    }, true);

    el.addEventListener("input", function(ev){
      var key = ev.target && ev.target.getAttribute("data-sound-band");
      if(key){
        draft.eq[key] = clamp(ev.target.value, -12, 12);
        markDirty();
        applyEqToDom(draft);
        renderValues();
      }
      if(ev.target && ev.target.id === "s666SoundBoostLevel"){
        draft.boosterLevel = clamp(ev.target.value,0,5);
        markDirty();
        renderValues();
        applyDraft();
      }
      if(ev.target && ev.target.id === "s666SoundBoostActive"){
        draft.boosterActive = !!ev.target.checked;
        markDirty();
        applyDraft();
        renderValues();
      }
    }, true);

    return el;
  }

  function renderValues(){
    var el = getOverlay();
    BANDS.forEach(function(b){
      var val = clamp((draft.eq || {})[b.key], -12, 12);
      var input = qs('[data-sound-band="'+b.key+'"]', el);
      var out = qs('[data-sound-band-value="'+b.key+'"]', el);
      if(input) input.value = String(val);
      if(out) out.textContent = (val > 0 ? "+" : "") + val;
    });
    var active = qs("#s666SoundBoostActive", el);
    var level = qs("#s666SoundBoostLevel", el);
    var value = qs("#s666SoundBoostValue", el);
    var gain = qs("#s666SoundBoostGain", el);
    if(active) active.checked = !!draft.boosterActive;
    if(level) level.value = String(clamp(draft.boosterLevel,0,5));
    if(value) value.textContent = "BST " + clamp(draft.boosterLevel,0,5);
    var g = 1;
    try{ g = window.SMFPBoostCore ? window.SMFPBoostCore.getGain(clamp(draft.boosterLevel,0,5)) : [1,1.4,1.7,1.9,2,2.2][clamp(draft.boosterLevel,0,5)]; }catch(_){}
    if(gain) gain.textContent = Number(g || 1).toFixed(2) + "×";
    var status = qs("#s666SoundDirty", el);
    if(status) status.textContent = dirty ? "UNSAVED" : "READY";
  }

  function markDirty(){ dirty = true; renderValues(); updateLed(); }

  function open(){
    readEqFromDom();
    draft = clone(state);
    // If user changed old EQ panel before opening, reflect existing DOM once.
    BANDS.forEach(function(b){
      var input = b.selector ? qs(b.selector) : null;
      if(input) draft.eq[b.key] = clamp(input.value,-12,12);
    });
    draft.boosterLevel = readBoostStage();
    getOverlay().classList.remove("is-hidden");
    renderValues();
    updateLed();
  }

  function requestClose(){
    if(dirty){
      var save = confirm("Sound-Control Änderungen speichern?");
      if(save){ saveState(draft); applyDraft(); }
      else { draft = clone(state); applyDraft(); dirty = false; renderValues(); }
    }
    getOverlay().classList.add("is-hidden");
  }

  function resetDraft(){
    draft.eq = defaultState().eq;
    draft.boosterLevel = 0;
    draft.boosterActive = true;
    markDirty();
    applyDraft();
  }

  function savePresetSlot(slot){
    try{ localStorage.setItem(PRESET_PREFIX + slot, JSON.stringify(draft)); }catch(_){}
    var status = qs("#s666SoundDirty"); if(status) status.textContent = "PRESET " + slot + " SAVED";
  }

  function loadPresetSlot(slot){
    try{
      var raw = localStorage.getItem(PRESET_PREFIX + slot);
      if(!raw){ alert("Preset " + slot + " ist leer."); return; }
      draft = Object.assign(defaultState(), JSON.parse(raw));
      markDirty();
      applyDraft();
      renderValues();
    }catch(e){ alert("Preset konnte nicht geladen werden."); }
  }

  function updateLed(){
    var active = !!(state && state.active);
    var btn = qs("#s666SoundControlButton");
    if(btn){
      btn.classList.toggle("is-dirty", !!dirty);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("title", dirty ? "Sound Control: unsaved" : "Sound Control");
    }
  }

  function mountButton(){
    var btn = qs("#s666SoundControlButton");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "s666SoundControlButton";
      btn.type = "button";
      btn.className = "s666-sound-button is-active";
      btn.innerHTML = '<span class="s666-sound-led"></span><span>SOUND</span>';
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); open(); }, true);
    }
    var mobileTarget = window.innerWidth <= 760 ? qs("#s666MobileExtraRow") : null;
    var target = mobileTarget || qs("#s666SoundActionSlot") || qs("#s666MobileExtraRow") || document.body;
    if(btn.parentNode !== target){
      if(mobileTarget && target.firstChild) target.insertBefore(btn, target.firstChild);
      else target.appendChild(btn);
    }
  }

  function mountTriggers(){
    mountButton();
  }

  function boot(){
    mountButton();
    mountTriggers();
    applyDraft();
    var observer = new MutationObserver(function(){
      if(window.innerWidth <= 760 && qs("#s666MobileExtraRow")) mountButton();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(function(){ observer.disconnect(); }, 10000);
    [300,900,1800,4000,8000].forEach(function(delay){ setTimeout(mountTriggers, delay); });
  }

  window.S666SoundControl = { open:open, save:function(){saveState(draft); applyDraft();}, getState:function(){return clone(state);} };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
