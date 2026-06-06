/*
  666SOUNDsDESIGn — STREAM WATCHDOG V1 PATCH2 REBASE — v35.9.0
  Basis: v35.8 custom player/header build.
  Quelle: STREAM_WATCHDOG_V1_PATCH2_2026-06-04.zip, rebased without rolling back v35.8.
  Zweck: Diagnose- und Support-Schicht über Central Audio Stability Guard V2.
  Regel: Watchdog schaltet nie automatisch auf Backup. Lokale Fallback-Recovery ist aus Sicherheitsgründen deaktiviert.
  Worker unverändert. DarkDancer geschützt.
*/
(function(){
  "use strict";
  if(window.__S666StreamWatchdogV1Patch2Rebased) return;
  window.__S666StreamWatchdogV1Patch2Rebased = true;

  var VERSION = "v35.9.0-stream-watchdog-patch2-rebase";
  var BUILD = "v35.9.0-2026-06-05-task9-watchdog-patch2-rebase";
  var CHECK_MS = 2500;
  var NETWORK_MS = 9000;
  var NETWORK_TIMEOUT_MS = 4500;
  var LOCAL_RECOVERY_ENABLED = false;
  var root = document.documentElement;
  var state = {
    lastTime: 0,
    lastMoveAt: Date.now(),
    lastReadyOkAt: Date.now(),
    lastNetworkCheckAt: 0,
    recoverCount: 0,
    history: [],
    network: "unknown",
    bootAt: Date.now(),
    lastMode: "boot",
    lastReason: "boot"
  };

  function qs(sel, base){ return (base || document).querySelector(sel); }
  function audio(){ return document.getElementById("radio") || document.querySelector("audio"); }
  function app(){ return document.getElementById("mffApp") || document.body; }
  function bodyState(){ return String((document.body && document.body.getAttribute("data-player-state")) || root.getAttribute("data-player-state") || "").toLowerCase(); }
  function centralActive(){ return /active|installed/i.test(root.getAttribute("data-central-audio-stability-v2") || ""); }
  function centralWanted(){ return root.getAttribute("data-central-audio-wanted") === "1"; }
  function playerWanted(a){
    if(!a) return false;
    var st = bodyState();
    if(st === "stopped" || st === "paused" || (document.body && document.body.classList.contains("is-stopped"))) return false;
    if(centralWanted()) return true;
    if(st === "playing" || (document.body && document.body.classList.contains("is-playing"))) return true;
    return !!(!a.paused && !a.ended && (a.currentSrc || a.getAttribute("src")));
  }
  function setAttr(name, value){
    try{ root.setAttribute(name, String(value)); }catch(e){}
    try{ var node = app(); if(node) node.setAttribute(name, String(value)); }catch(e){}
  }
  function stateClass(mode){
    return mode === "ok" ? "state-main" :
      mode === "idle" ? "state-off" :
      mode === "central-watch" || mode === "network-watch" || mode === "watch" || mode === "event" ? "state-api" :
      mode === "stall" || mode === "error" || mode === "blocked" ? "state-error" : "state-off";
  }
  function ensureChip(){
    var chip = qs("#streamWatchdogBadge");
    if(chip) return chip;
    chip = document.createElement("button");
    chip.id = "streamWatchdogBadge";
    chip.type = "button";
    chip.className = "status-chip led-state state-off stream-watchdog-badge";
    chip.title = "Stream Watchdog V1";
    chip.innerHTML = '<span class="status-dot"></span><span class="status-code">WDG</span>';
    var target = qs(".systempanel-left") || qs(".systempanel-right") || qs(".status-cluster") || qs("#phase10NowVersion");
    if(target) target.appendChild(chip); else document.body.appendChild(chip);
    return chip;
  }
  function setHudDiagnostic(mode, reason, a, stallMs){
    var ready = a ? Number(a.readyState || 0) : 0;
    var mediaNetwork = a ? Number(a.networkState || 0) : 0;
    var text = "Watchdog " + (mode || "ok") + " | " + (reason || "") + " | stall " + stallMs + "ms | ready " + ready + " | net " + state.network + "/media-" + mediaNetwork + " | rec " + state.recoverCount;
    ["streamState","statusStream","statusSource","streamWatchdogBadge"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      try{
        el.setAttribute("data-stream-watchdog-diagnostic", text);
        el.setAttribute("title", text);
        if(el.dataset) el.dataset.tooltip = text;
      }catch(e){}
    });
    var chip = ensureChip();
    chip.classList.remove("state-main","state-api","state-error","state-off","is-active");
    chip.classList.add(stateClass(mode));
    if(mode !== "idle") chip.classList.add("is-active");
    var code = chip.querySelector(".status-code") || chip;
    code.textContent = mode === "ok" ? "WDG OK" :
      mode === "idle" ? "WDG" :
      mode === "central-watch" ? "WDG CEN" :
      mode === "network-watch" ? "WDG NET" :
      mode === "stall" ? "WDG STALL" :
      mode === "error" ? "WDG ERR" : "WDG";
  }
  function publish(mode, reason, a){
    var ready = a ? Number(a.readyState || 0) : 0;
    var mediaNetwork = a ? Number(a.networkState || 0) : 0;
    var stallMs = Math.max(0, Date.now() - state.lastMoveAt);
    state.lastMode = mode || "ok";
    state.lastReason = reason || "";
    setAttr("data-stream-watchdog-v1", "active");
    setAttr("data-stream-watchdog-build", BUILD);
    setAttr("data-stream-watchdog-version", VERSION);
    setAttr("data-stream-watchdog-state", state.lastMode);
    setAttr("data-stream-watchdog-reason", state.lastReason);
    setAttr("data-stream-watchdog-audio-stall-ms", stallMs);
    setAttr("data-stream-watchdog-ready", ready);
    setAttr("data-stream-watchdog-network", state.network + "/media-" + mediaNetwork);
    setAttr("data-stream-watchdog-recover-count", state.recoverCount);
    setAttr("data-stream-watchdog-last-step", root.getAttribute("data-stream-watchdog-last-step") || "none");
    setAttr("data-stream-watchdog-local-recovery", LOCAL_RECOVERY_ENABLED ? "enabled" : "disabled");
    try{
      window.S666StreamWatchdogV1 = {
        version: VERSION,
        build: BUILD,
        state: state.lastMode,
        reason: state.lastReason,
        stallMs: stallMs,
        readyState: ready,
        networkState: mediaNetwork,
        network: state.network,
        recoverCount: state.recoverCount,
        lastStep: root.getAttribute("data-stream-watchdog-last-step") || "none",
        localRecoveryEnabled: LOCAL_RECOVERY_ENABLED,
        history: state.history.slice(0),
        updatedAt: new Date().toISOString(),
        evaluate: evaluate,
        snapshot: snapshot
      };
    }catch(e){}
    setHudDiagnostic(state.lastMode, state.lastReason, a, stallMs);
  }
  function pushHistory(step, reason, source){
    var item = { at: new Date().toISOString(), step: step || "diagnose", reason: reason || "", source: source || "watchdog" };
    state.history.unshift(item);
    state.history = state.history.slice(0, 8);
    setAttr("data-stream-watchdog-recovery-history", JSON.stringify(state.history));
  }
  function countRecovery(step, reason, source){
    state.recoverCount += 1;
    setAttr("data-stream-watchdog-recover-count", state.recoverCount);
    setAttr("data-stream-watchdog-last-step", step || "unknown");
    pushHistory(step, reason, source);
  }
  function markMoved(a){
    if(!a) return;
    var current = Number(a.currentTime || 0);
    if(Math.abs(current - state.lastTime) > 0.05){
      state.lastMoveAt = Date.now();
      state.lastReadyOkAt = Date.now();
    }
    if(Number(a.readyState || 0) >= 2) state.lastReadyOkAt = Date.now();
    state.lastTime = current;
  }
  function evaluate(){
    var a = audio();
    if(!a){ publish("blocked", "audio-missing", null); return; }
    markMoved(a);
    var wanted = playerWanted(a);
    var ready = Number(a.readyState || 0);
    var stallMs = Math.max(0, Date.now() - state.lastMoveAt);
    var readyLowMs = Math.max(0, Date.now() - state.lastReadyOkAt);
    var reason = "ok";
    var mode = wanted ? "ok" : "idle";
    if(a.error){ reason = "media-error"; mode = "error"; }
    else if(wanted && a.paused){ reason = "paused-wanted"; mode = "watch"; }
    else if(wanted && !a.paused && stallMs > 16000){ reason = "currentTime-stall"; mode = centralActive() ? "central-watch" : "stall"; }
    else if(wanted && ready < 2 && readyLowMs > 9000){ reason = "readyState-low"; mode = centralActive() ? "central-watch" : "stall"; }
    else if(wanted && state.network === "error"){ reason = "network-stall"; mode = "network-watch"; }
    publish(mode, reason, a);
  }
  function pingNetwork(){
    if(Date.now() - state.lastNetworkCheckAt < NETWORK_MS) return;
    state.lastNetworkCheckAt = Date.now();
    if(!window.fetch){ state.network = "unknown"; return; }
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, NETWORK_TIMEOUT_MS) : 0;
    fetch("/health?t=" + Date.now(), { cache:"no-store", signal: controller ? controller.signal : undefined })
      .then(function(res){ state.network = res && res.ok ? "ok" : "warn"; })
      .catch(function(){ state.network = navigator.onLine === false ? "offline" : "error"; })
      .finally(function(){ if(timer) clearTimeout(timer); publish(state.lastMode || "ok", state.lastReason || "network-check", audio()); });
  }
  function bindAudioEvents(){
    var a = audio();
    if(!a || a.__streamWatchdogV1Patch2RebasedBound) return;
    a.__streamWatchdogV1Patch2RebasedBound = true;
    ["play","playing","timeupdate","canplay","canplaythrough","loadeddata"].forEach(function(evt){
      a.addEventListener(evt, function(){ markMoved(a); publish("ok", evt, a); }, {passive:true});
    });
    ["waiting","stalled","suspend","emptied","abort","pause","ended","error"].forEach(function(evt){
      a.addEventListener(evt, function(){ publish(evt === "error" ? "error" : "event", evt, a); setTimeout(evaluate, 900); }, {passive:true});
    });
  }
  function observeCentralGuard(){
    if(!window.MutationObserver) return;
    var lastReason = "";
    var observer = new MutationObserver(function(){
      var reason = root.getAttribute("data-central-audio-reason") || root.getAttribute("data-last-audio-recover-disabled") || root.getAttribute("data-last-safe-play-disabled") || root.getAttribute("data-last-rare-reconnect-disabled") || "";
      if(!reason || reason === lastReason) return;
      lastReason = reason;
      var step = /main|rebind/i.test(reason) ? "central-main-rebind" : (/load/i.test(reason) ? "central-load-play" : "central-play");
      countRecovery(step, reason, "central-audio-stability-v2");
      publish("central-watch", reason, audio());
    });
    observer.observe(root, { attributes:true, attributeFilter:["data-central-audio-reason","data-last-audio-recover-disabled","data-last-safe-play-disabled","data-last-rare-reconnect-disabled"] });
  }
  function snapshot(){
    return JSON.parse(JSON.stringify(state));
  }
  function boot(){
    setAttr("data-stream-watchdog-v1", "installed");
    setAttr("data-stream-watchdog-build", BUILD);
    setAttr("data-stream-watchdog-version", VERSION);
    setAttr("data-stream-watchdog-state", "boot");
    setAttr("data-stream-watchdog-recover-count", "0");
    setAttr("data-stream-watchdog-local-recovery", LOCAL_RECOVERY_ENABLED ? "enabled" : "disabled");
    ensureChip();
    bindAudioEvents();
    observeCentralGuard();
    evaluate();
    setInterval(function(){ bindAudioEvents(); pingNetwork(); evaluate(); }, CHECK_MS);
    ["focus","pageshow","online"].forEach(function(evt){ window.addEventListener(evt, function(){ setTimeout(evaluate, 500); }, true); });
    window.S666StreamWatchdogV1 = { version: VERSION, build: BUILD, snapshot: snapshot, evaluate: evaluate, localRecoveryEnabled: LOCAL_RECOVERY_ENABLED };
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
