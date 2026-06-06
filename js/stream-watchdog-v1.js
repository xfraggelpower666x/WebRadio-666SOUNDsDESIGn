/*
  STREAM_WATCHDOG_V1_20260604
  Zweck: Diagnose- und Support-Schicht fuer Central Audio Stability Guard V2.
  Regel: Ersetzt den Central Audio Guard nicht und schaltet nie automatisch auf Backup.
*/
(function(){
  "use strict";

  var VERSION = "stream-watchdog-v1-patch2-20260604";
  var BUILD = "v2026.06.04-stream-watchdog-v1-patch2";
  var CHECK_MS = 2500;
  var NETWORK_MS = 9000;
  var RECOVERY_COOLDOWN_MS = 14000;
  var NETWORK_TIMEOUT_MS = 4500;
  var root = document.documentElement;
  var state = {
    lastTime: 0,
    lastMoveAt: Date.now(),
    lastReadyOkAt: Date.now(),
    lastNetworkCheckAt: 0,
    lastRecoveryAt: 0,
    recoverCount: 0,
    recoveryStep: 0,
    history: [],
    network: "unknown",
    bootAt: Date.now()
  };

  function audio(){ return document.getElementById("radio") || document.querySelector("audio"); }
  function bodyState(){ return String((document.body && document.body.getAttribute("data-player-state")) || root.getAttribute("data-player-state") || "").toLowerCase(); }
  function centralActive(){ return /active|installed/i.test(root.getAttribute("data-central-audio-stability-v2") || ""); }
  function centralWanted(){ return root.getAttribute("data-central-audio-wanted") === "1"; }
  function playerWanted(a){
    if(!a) return false;
    if(centralWanted()) return true;
    if(bodyState() === "playing" || (document.body && document.body.classList.contains("is-playing"))) return true;
    return !!(!a.paused && !a.ended && (a.currentSrc || a.getAttribute("src")));
  }
  function sourceLabel(a){
    var src = String((a && (a.currentSrc || a.getAttribute("src"))) || "");
    return /fallback-stream|backup/i.test(src) ? "backup-manual" : "main";
  }
  function setAttr(name, value){
    try{ root.setAttribute(name, String(value)); }catch(e){}
  }
  function setHudDiagnostic(reason){
    var text = "Watchdog " + (reason || "ok") + " | ready " + (root.getAttribute("data-stream-watchdog-ready") || "0") + " | net " + (root.getAttribute("data-stream-watchdog-network") || "unknown");
    ["streamState","statusStream","statusSource"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      try{
        el.setAttribute("data-stream-watchdog-diagnostic", text);
        el.setAttribute("title", text);
        el.dataset.tooltip = text;
      }catch(e){}
    });
  }
  function publish(mode, reason, a){
    var ready = a ? Number(a.readyState || 0) : 0;
    var network = a ? Number(a.networkState || 0) : 0;
    var stallMs = Math.max(0, Date.now() - state.lastMoveAt);
    setAttr("data-stream-watchdog-v1", "active");
    setAttr("data-stream-watchdog-build", BUILD);
    setAttr("data-stream-watchdog-state", mode || "ok");
    setAttr("data-stream-watchdog-reason", reason || "");
    setAttr("data-stream-watchdog-audio-stall-ms", stallMs);
    setAttr("data-stream-watchdog-ready", ready);
    setAttr("data-stream-watchdog-network", state.network + "/media-" + network);
    setAttr("data-stream-watchdog-recover-count", state.recoverCount);
    setAttr("data-stream-watchdog-last-step", root.getAttribute("data-stream-watchdog-last-step") || "none");
    setHudDiagnostic(reason || mode || "ok");
  }
  function pushHistory(step, reason, source){
    var item = {
      at: new Date().toISOString(),
      step: step || "diagnose",
      reason: reason || "",
      source: source || "watchdog"
    };
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
      state.recoveryStep = 0;
    }
    if(Number(a.readyState || 0) >= 2) state.lastReadyOkAt = Date.now();
    state.lastTime = current;
  }
  function play(a, reason){
    state.lastRecoveryAt = Date.now();
    countRecovery("watchdog-play", reason, "stream-watchdog-v1");
    try{
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ setAttr("data-stream-watchdog-error", String(err && err.message || err).slice(0, 140)); });
    }catch(e){ setAttr("data-stream-watchdog-error", String(e && e.message || e).slice(0, 140)); }
  }
  function loadPlay(a, reason){
    state.lastRecoveryAt = Date.now();
    countRecovery("watchdog-load-play", reason, "stream-watchdog-v1");
    try{
      a.load();
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ setAttr("data-stream-watchdog-error", String(err && err.message || err).slice(0, 140)); });
    }catch(e){ setAttr("data-stream-watchdog-error", String(e && e.message || e).slice(0, 140)); }
  }
  function mainRebind(a, reason){
    state.lastRecoveryAt = Date.now();
    countRecovery("watchdog-main-rebind", reason, "stream-watchdog-v1");
    try{
      var src = String(a.currentSrc || a.getAttribute("src") || "");
      var target = /fallback-stream|backup/i.test(src) ? "/fallback-stream" : "/stream";
      a.pause();
      a.setAttribute("src", target + "?t=" + Date.now());
      a.load();
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ setAttr("data-stream-watchdog-error", String(err && err.message || err).slice(0, 140)); });
    }catch(e){ setAttr("data-stream-watchdog-error", String(e && e.message || e).slice(0, 140)); }
  }
  function fallbackRecovery(reason, a){
    if(centralActive()) return;
    if(Date.now() - state.bootAt < 7000) return;
    if(Date.now() - state.lastRecoveryAt < RECOVERY_COOLDOWN_MS) return;
    state.recoveryStep = (state.recoveryStep + 1) % 3;
    if(state.recoveryStep === 0) return play(a, reason);
    if(state.recoveryStep === 1) return loadPlay(a, reason);
    return mainRebind(a, reason);
  }
  function evaluate(){
    var a = audio();
    if(!a){
      publish("blocked", "audio-missing", null);
      return;
    }
    markMoved(a);
    var wanted = playerWanted(a);
    var ready = Number(a.readyState || 0);
    var stallMs = Math.max(0, Date.now() - state.lastMoveAt);
    var readyLowMs = Math.max(0, Date.now() - state.lastReadyOkAt);
    var reason = "ok";
    var mode = wanted ? "ok" : "idle";
    if(wanted && a.paused){
      reason = "paused-wanted";
      mode = "watch";
    }else if(wanted && !a.paused && stallMs > 16000){
      reason = "currentTime-stall";
      mode = centralActive() ? "central-watch" : "recovering";
    }else if(wanted && ready < 2 && readyLowMs > 9000){
      reason = "readyState-low";
      mode = centralActive() ? "central-watch" : "recovering";
    }else if(wanted && state.network === "error"){
      reason = "network-stall";
      mode = "network-watch";
    }
    publish(mode, reason, a);
    if(mode === "recovering") fallbackRecovery(reason + ":" + sourceLabel(a), a);
  }
  function pingNetwork(){
    if(Date.now() - state.lastNetworkCheckAt < NETWORK_MS) return;
    state.lastNetworkCheckAt = Date.now();
    if(!window.fetch){
      state.network = "unknown";
      return;
    }
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, NETWORK_TIMEOUT_MS) : 0;
    fetch("/health?t=" + Date.now(), {
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    }).then(function(res){
      state.network = res && res.ok ? "ok" : "warn";
    }).catch(function(){
      state.network = navigator.onLine === false ? "offline" : "error";
    }).finally(function(){
      if(timer) clearTimeout(timer);
      setAttr("data-stream-watchdog-network", state.network + "/media-" + ((audio() && audio().networkState) || 0));
    });
  }
  function bindAudioEvents(){
    var a = audio();
    if(!a || a.__streamWatchdogV1Bound) return;
    a.__streamWatchdogV1Bound = true;
    ["play","playing","timeupdate","canplay","canplaythrough","loadeddata"].forEach(function(evt){
      a.addEventListener(evt, function(){ markMoved(a); publish("ok", evt, a); }, true);
    });
    ["waiting","stalled","suspend","emptied","abort","error"].forEach(function(evt){
      a.addEventListener(evt, function(){ publish("event", evt, a); setTimeout(evaluate, 900); }, true);
    });
  }
  function observeCentralGuard(){
    if(!window.MutationObserver) return;
    var lastReason = "";
    var observer = new MutationObserver(function(){
      var reason = root.getAttribute("data-central-audio-reason") || "";
      if(!reason || reason === lastReason) return;
      lastReason = reason;
      var step = /main/i.test(reason) ? "central-main-rebind" : (/load/i.test(reason) ? "central-load-play" : "central-play");
      countRecovery(step, reason, "central-audio-stability-v2");
      publish("central-recovery", reason, audio());
    });
    observer.observe(root, { attributes:true, attributeFilter:["data-central-audio-reason"] });
  }
  function boot(){
    setAttr("data-stream-watchdog-v1", "installed");
    setAttr("data-stream-watchdog-build", BUILD);
    setAttr("data-stream-watchdog-state", "boot");
    setAttr("data-stream-watchdog-recover-count", "0");
    bindAudioEvents();
    observeCentralGuard();
    evaluate();
    setInterval(function(){
      bindAudioEvents();
      pingNetwork();
      evaluate();
    }, CHECK_MS);
    ["focus","pageshow","online"].forEach(function(evt){ window.addEventListener(evt, function(){ setTimeout(evaluate, 500); }, true); });
    window.S666StreamWatchdogV1 = {
      version: VERSION,
      build: BUILD,
      snapshot: function(){ return JSON.parse(JSON.stringify(state)); },
      evaluate: evaluate
    };
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
