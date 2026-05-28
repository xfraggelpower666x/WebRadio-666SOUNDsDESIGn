
// PC_AUDIO_STABILITY_HOTFIX_V1_20260525
/*
FILE: js/phase10-stability-iphone-panel-hud.js
CREATED: 2026-05-25
PURPOSE: Phase 10 stability and iPhone/PC HUD corrections.
RULES:
- No separate audio engine.
- Use existing buttons/audio elements/overlays.
- Repair real triggers and state.
*/
(function(){
  "use strict";
  var VERSION = "phase10-stability-iphone-panel-hud-20260525";
  var lastAudibleAt = Date.now();
  var lastRecoveryAt = 0;
  var meterTimer = 0;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tap(el, label){
    if(!el) return false;
    try{
      el.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true, view:window }));
      return true;
    }catch(e){ console.warn("[phase10 tap failed]", label || el, e); return false; }
  }
  function getAudio(){ return qs("#radio") || qs("audio"); }
  function activeBoost(){
    var attr = document.documentElement.getAttribute("data-mff-boost") || document.documentElement.getAttribute("data-smfp-boost-stage-active") || "0";
    var n = Number(attr);
    return isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
  }

  function mountMobilePanelRow(){
    var app = qs("#mffApp");
    if(!app || qs("#s666MobileExtraRow", app)) return;

    var row = document.createElement("div");
    row.id = "s666MobileExtraRow";
    row.className = "s666-mobile-extra-row";
    row.innerHTML = [
      '<button type="button" data-phase10-mobile="stream">STREAM</button>',
      '<button type="button" data-phase10-mobile="sound">SOUND</button>',
      '<button type="button" data-phase10-mobile="admin">ADMIN</button>',
      '<button type="button" data-phase10-mobile="chaos">CHAOS</button>',
      '<button type="button" data-phase10-mobile="status">STATUS</button>'
    ].join("");

    var anchor = qs(".mff-controls", app) || qs(".mff-boost-row-panel", app) || qs(".mff-now", app);
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling);
    else app.appendChild(row);

    row.addEventListener("click", function(ev){
      var btn = ev.target.closest && ev.target.closest("[data-phase10-mobile]");
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      runMobileAction(btn.getAttribute("data-phase10-mobile"), btn);
    }, true);

    row.addEventListener("touchend", function(ev){
      var btn = ev.target.closest && ev.target.closest("[data-phase10-mobile]");
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      runMobileAction(btn.getAttribute("data-phase10-mobile"), btn);
    }, { passive:false, capture:true });
  }

  function runMobileAction(action, btn){
    qsa("#s666MobileExtraRow button").forEach(function(b){ b.removeAttribute("data-state"); });
    if(btn) btn.setAttribute("data-state", "active");

    if(action === "stream") return toggleMobileStream();
    if(action === "sound") return openSoundControl();
    if(action === "admin") return openAdmin();
    if(action === "chaos") return openChaos();
    if(action === "status") return openStatus();
  }

  function toggleMobileStream(){
    if(phase10IsDesktopPlayer && phase10IsDesktopPlayer()) return;
    phase10MarkManualStreamSwitch && phase10MarkManualStreamSwitch();
    var backupActive = document.documentElement.getAttribute("data-phase10-stream-target") === "backup";
    var target = backupActive ? "main" : "backup";

    // Prefer existing source buttons if present.
    var btn = target === "backup"
      ? (qs("#fallbackBtn") || qs("#backupBtn") || qs("[data-source='fallback']") || qs("[data-source='backup']"))
      : (qs("#mainBtn") || qs("[data-source='main']"));

    if(btn && tap(btn, "stream-"+target)){
      document.documentElement.setAttribute("data-phase10-stream-target", target);
      return;
    }

    var audio = getAudio();
    if(audio){
      var url = target === "backup" ? "/fallback-stream?t=" + Date.now() : "/stream?t=" + Date.now();
      var wasPlaying = !audio.paused;
      try{
        audio.pause();
        audio.setAttribute("src", url);
        audio.load();
        if(wasPlaying){
          var p = audio.play();
          if(p && p.catch) p.catch(function(){});
        }
        document.documentElement.setAttribute("data-phase10-stream-target", target);
      }catch(e){ console.warn("[phase10 stream toggle]", e); }
    }
  }

  function openSoundControl(){
    if(window.S666SoundControl && typeof window.S666SoundControl.open === "function"){
      window.S666SoundControl.open();
      return;
    }
    tap(qs("#s666SoundControlButton"), "sound-control-button");
  }

  function openAdmin(){
    var targets = [
      "#fp-admin-open",
      ".fp-admin-open",
      "[data-admin-open]",
      "#adminButton",
      "#adminBtn",
      "button[aria-label*='Admin']"
    ];
    for(var i=0;i<targets.length;i++){
      var el = qs(targets[i]);
      if(el && tap(el, "admin")) return;
    }
    if(window.S666AdminOverlay && typeof window.S666AdminOverlay.open === "function"){
      window.S666AdminOverlay.open();
      return;
    }
    alert("Admin overlay trigger not found.");
  }

  function openChaos(){
    try{ window.open("/CHAOS_ENGINE/?v=" + Date.now(), "_blank"); }
    catch(e){ location.href = "/CHAOS_ENGINE/?v=" + Date.now(); }
  }

  function openStatus(){
    try{ window.open("/debug/modules?t=" + Date.now(), "_blank"); }
    catch(e){ location.href = "/debug/modules?t=" + Date.now(); }
  }

  function mountBottomSafe(){
    var app = qs("#mffApp");
    if(!app || qs("#s666MobileBottomSafe")) return;
    var box = document.createElement("div");
    box.id = "s666MobileBottomSafe";
    box.className = "s666-mobile-bottom-safe";
    box.innerHTML = '<div class="s666-mobile-copyline">666SOUNDsDESIGn WebRadio</div><div class="s666-mobile-meterline"><i class="s666-mobile-meterfill"></i></div>';
    document.body.appendChild(box);
  }

  function bindEqTriggers(){
    var selectors = [
      "#mffEqBars",
      "#mffBottomBars",
      ".mff-bottom-bars",
      ".mff-eq",
      ".mff-eq-bars",
      "#pcRealEqPanel",
      ".pc-real-eq-panel"
    ];
    selectors.forEach(function(sel){
      qsa(sel).forEach(function(el){
        if(el.__phase10SoundBound) return;
        el.__phase10SoundBound = true;
        el.style.pointerEvents = "auto";
        el.addEventListener("pointerup", function(ev){ ev.preventDefault(); ev.stopPropagation(); openSoundControl(); }, true);
        el.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); openSoundControl(); }, true);
        el.addEventListener("touchend", function(ev){ ev.preventDefault(); ev.stopPropagation(); openSoundControl(); }, { passive:false, capture:true });
      });
    });
  }

  function installAudioRecovery(){
    var audio = getAudio();
    if(!audio || audio.__phase10Recovery) return;
    audio.__phase10Recovery = true;

    ["playing","timeupdate","canplay"].forEach(function(evt){
      audio.addEventListener(evt, function(){ lastAudibleAt = Date.now(); }, true);
    });

    ["stalled","suspend","waiting","emptied"].forEach(function(evt){
      audio.addEventListener(evt, function(){ scheduleRecovery("event:"+evt); }, true);
    });

    setInterval(function(){
      if(!audio || audio.paused) return;
      var silentAge = Date.now() - lastAudibleAt;
      if(silentAge > 18000) scheduleRecovery("silent-age-"+silentAge);
    }, 6000);
  }

  function scheduleRecovery(reason){
    var now = Date.now();
    if(now - lastRecoveryAt < 10000) return;
    lastRecoveryAt = now;
    setTimeout(function(){ recoverAudio(reason); }, 350);
  }

  async function recoverAudio(reason){
    var audio = getAudio();
    if(!audio) return;
    try{
      var ctx = window.__mffAudioContext || window.__radioAudioContext;
      if(ctx && ctx.state === "suspended") await ctx.resume().catch(function(){});
    }catch(_){}
    try{
      var src = audio.currentSrc || audio.getAttribute("src") || "/stream";
      var wasPaused = audio.paused;
      if(!wasPaused){
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.setAttribute("src", src.indexOf("?") > -1 ? src + "&r=" + Date.now() : src + "?r=" + Date.now());
        audio.load();
        var p = audio.play();
        if(p && p.catch) p.catch(function(e){ console.warn("[phase10 recovery play]", reason, e); });
      }
      document.documentElement.setAttribute("data-phase10-last-recovery", reason);
    }catch(e){ console.warn("[phase10 recovery]", reason, e); }
  }

  function normalizeBoostStatusTooltip(){
    var label = qs("#pcBoostLabel");
    if(!label || label.__phase10BoostStatus) return;
    label.__phase10BoostStatus = true;
    label.setAttribute("title", "Boost Status only. Change Boost in SOUND overlay.");
    setInterval(function(){
      var b = activeBoost();
      var gain = 1;
      try{ gain = window.SMFPBoostCore ? window.SMFPBoostCore.getGain(b) : [1,1.4,1.7,1.9,2,2.2][b]; }catch(_){}
      label.setAttribute("title", "Boost status: BST " + b + " · Gain " + Number(gain||1).toFixed(2) + "x · Control in SOUND");
      var code = label.querySelector(".status-code") || label;
      if(code) code.textContent = "BST " + b;
    }, 700);
  }

  function improveMeterScaling(){
    if(meterTimer) return;
    meterTimer = setInterval(function(){
      var boost = activeBoost();
      var scale = 1 + boost * 0.13;
      document.documentElement.style.setProperty("--phase10-meter-boost-scale", scale.toFixed(2));

      qsa(".s666-mobile-meterfill").forEach(function(el){
        var w = 28 + ((Date.now()/140 + boost*13) % 62);
        el.style.width = Math.max(18, Math.min(96, w * scale)) + "%";
      });

      qsa(".side-meter i,.left-meter i,.right-meter i,.mff-side-meter i,#mffEqBars i,#mffBottomBars i,.mff-bottom-bars i,.equalizer-bars i").forEach(function(el, idx){
        var base = 18 + ((Date.now()/95 + idx*17) % 78);
        var val = Math.max(8, Math.min(100, base * scale));
        if(el.closest && (el.closest(".side-meter") || el.closest(".left-meter") || el.closest(".right-meter") || el.closest(".mff-side-meter"))){
          el.style.opacity = String(Math.max(.25, Math.min(1, val/100)));
          el.style.transform = "scaleY(" + (0.45 + val/180).toFixed(2) + ")";
        }else{
          el.style.height = val.toFixed(0) + "%";
        }
      });
    }, 220);
  }

  function mountHudLogo(){
    // DIRECTFIX: 666-HUD-Logo bleibt draußen. Header nutzt phase10CleanHeaderLogo im HTML.
    qsa(".s666-phase10-logo-zone").forEach(function(el){ el.remove(); });
  }


  // AUDIO_FOCUS_GUARD_V1_20260525
  var audioFocusGuard = {
    userStopAt: 0,
    externalPauseAt: 0,
    lastPauseAt: 0,
    lastPlayWantedAt: Date.now(),
    pauseToleranceMs: 10000,
    longInterruptionMs: 10000,
    recovering: false
  };

  function markUserStopIntent(){
    audioFocusGuard.userStopAt = Date.now();
    document.documentElement.setAttribute("data-phase10-user-stop-at", String(audioFocusGuard.userStopAt));
  }

  function isUserStopRecent(){
    return Date.now() - audioFocusGuard.userStopAt < 1400;
  }

  function streamWanted(){
    var audio = getAudio();
    if(!audio) return false;
    if(document.documentElement.getAttribute("data-phase10-stream-wanted") === "1") return true;
    return !audio.paused || (Date.now() - audioFocusGuard.lastPlayWantedAt < 30000);
  }

  function setStreamWanted(v){
    document.documentElement.setAttribute("data-phase10-stream-wanted", v ? "1" : "0");
    if(v) audioFocusGuard.lastPlayWantedAt = Date.now();
  }

  function installAudioFocusGuard(){
    var audio = getAudio();
    if(!audio || audio.__phase10AudioFocusGuard) return;
    audio.__phase10AudioFocusGuard = true;

    ["play","playing","timeupdate","canplay"].forEach(function(evt){
      audio.addEventListener(evt, function(){
        setStreamWanted(true);
        lastAudibleAt = Date.now();
        audioFocusGuard.externalPauseAt = 0;
      }, true);
    });

    // Nutzer-Stop nur an echten vorhandenen Stop/Pause-Kontrollen markieren.
    qsa("button,[role='button']").forEach(function(btn){
      var txt = String(btn.textContent || btn.getAttribute("aria-label") || btn.id || "").toLowerCase();
      if(/stop|pause|aus|off/.test(txt) && !btn.__phase10UserStopMarked){
        btn.__phase10UserStopMarked = true;
        btn.addEventListener("pointerdown", markUserStopIntent, true);
        btn.addEventListener("touchstart", markUserStopIntent, { passive:true, capture:true });
      }
    });

    audio.addEventListener("pause", function(){
      audioFocusGuard.lastPauseAt = Date.now();

      if(isUserStopRecent()){
        setStreamWanted(false);
        return;
      }

      // Kein sofortiger Eingriff: kurze Browser-/Message-/Web-Audio-Fokuswechsel tolerieren.
      audioFocusGuard.externalPauseAt = Date.now();
      document.documentElement.setAttribute("data-phase10-audio-focus", "tolerating-short-interruption");

      setTimeout(function(){
        var a = getAudio();
        if(!a) return;
        if(!a.paused) return;
        if(!streamWanted()) return;
        if(isUserStopRecent()) return;

        var age = Date.now() - audioFocusGuard.externalPauseAt;
        if(age >= audioFocusGuard.pauseToleranceMs){
          document.documentElement.setAttribute("data-phase10-audio-focus", "recovering-after-short-interruption");
          recoverAudio("audio-focus-guard-delayed-resume");
        }
      }, audioFocusGuard.pauseToleranceMs);
    }, true);

    document.addEventListener("visibilitychange", function(){
      var a = getAudio();
      if(!a) return;

      if(document.hidden){
        document.documentElement.setAttribute("data-phase10-page-hidden", "1");
        // Nicht sofort pausieren. Browser/iOS darf kurz Fokus verlieren.
        return;
      }

      document.documentElement.setAttribute("data-phase10-page-hidden", "0");
      if(streamWanted() && a.paused && !isUserStopRecent()){
        setTimeout(function(){
          var again = getAudio();
          if(again && again.paused && streamWanted()) recoverAudio("visibility-return-resume");
        }, 650);
      }
    }, true);

    window.addEventListener("pageshow", function(){
      var a = getAudio();
      if(a && a.paused && streamWanted() && !isUserStopRecent()){
        setTimeout(function(){ recoverAudio("pageshow-resume"); }, 750);
      }
    }, true);

    window.addEventListener("pagehide", function(){
      // Kein Stop-Befehl. Nur Zustand merken.
      document.documentElement.setAttribute("data-phase10-pagehide-at", String(Date.now()));
    }, true);

    setInterval(function(){
      var a = getAudio();
      if(!a) return;
      if(!phase10IsMobileAudioDevice()) return;
      if(a.paused && streamWanted() && !isUserStopRecent()){
        var pausedFor = Date.now() - audioFocusGuard.lastPauseAt;
        if(pausedFor > audioFocusGuard.longInterruptionMs){
          recoverAudio("audio-focus-periodic-resume");
        }
      }
    }, 5000);
  }


  // PHASE10_MAIN_BACKUP_HEADER_PANEL_FIX_V1_20260525
  var phase10ManualStreamSwitchAt = 0;

  function phase10IsDesktopPlayer(){
    return !(/iphone|ipad|ipod|android/i.test(navigator.userAgent || "")) && window.innerWidth > 760;
  }

  function phase10MarkManualStreamSwitch(){
    phase10ManualStreamSwitchAt = Date.now();
    document.documentElement.setAttribute("data-phase10-manual-stream-switch-at", String(phase10ManualStreamSwitchAt));
  }

  function phase10ManualStreamSwitchRecent(){
    return Date.now() - phase10ManualStreamSwitchAt < 9000;
  }

  function installPcMainBackupGuard(){
    if(window.__phase10PcMainBackupGuardInstalled) return;
    window.__phase10PcMainBackupGuardInstalled = true;

    ["#mainBtn","#fallbackBtn","#backupBtn","[data-source='main']","[data-source='backup']","[data-source='fallback']"].forEach(function(sel){
      qsa(sel).forEach(function(btn){
        if(btn.__phase10ManualStreamBound) return;
        btn.__phase10ManualStreamBound = true;
        btn.addEventListener("pointerdown", phase10MarkManualStreamSwitch, true);
        btn.addEventListener("touchstart", phase10MarkManualStreamSwitch, {passive:true,capture:true});
        btn.addEventListener("click", phase10MarkManualStreamSwitch, true);
      });
    });

    setInterval(function(){
      if(!phase10IsDesktopPlayer()) return;
      var audio = getAudio();
      if(!audio) return;
      var src = String(audio.currentSrc || audio.getAttribute("src") || "");
      var isBackup = /fallback-stream|backup/i.test(src) || document.documentElement.getAttribute("data-phase10-stream-target") === "backup";
      if(isBackup && !phase10ManualStreamSwitchRecent()){
        document.documentElement.setAttribute("data-phase10-stream-guard","forced-main");
        try{
          var wasPlaying = !audio.paused;
          audio.pause();
          audio.setAttribute("src","/stream?t="+Date.now());
          audio.load();
          document.documentElement.setAttribute("data-phase10-stream-target","main");
          var mainBtn = qs("#mainBtn");
          var fbBtn = qs("#fallbackBtn") || qs("#backupBtn");
          if(mainBtn) mainBtn.classList.add("is-active");
          if(fbBtn) fbBtn.classList.remove("is-active");
          if(wasPlaying){
            var p = audio.play();
            if(p && p.catch) p.catch(function(){});
          }
        }catch(e){ console.warn("[phase10 main backup guard]", e); }
      }
    }, 2500);
  }

  function phase10RelocatePcPanels(){
    if(!phase10IsDesktopPlayer()) return;

    var infoGrid = qs(".info-grid");
    var djCard = qs("#djText") ? qs("#djText").closest(".info-card") : null;
    if(infoGrid && djCard && !qs("#phase10StatusLedCard")){
      var card = document.createElement("article");
      card.id = "phase10StatusLedCard";
      card.className = "info-card phase10-status-led-card";
      card.innerHTML = '<div class="info-label">Stream</div><div class="phase10-status-led-row"></div>';
      djCard.parentNode.insertBefore(card, djCard.nextSibling);
    }

    var row = qs("#phase10StatusLedCard .phase10-status-led-row");
    if(row){
      ["#statusStream","#statusMeter","#statusSource"].forEach(function(sel){
        var el = qs(sel);
        if(el && el.parentNode !== row) row.appendChild(el);
      });
    }

    var version = qs("#pcVersionBadge");
    var now = qs(".now-playing");
    if(version && now && !qs("#phase10NowVersion")){
      var slot = document.createElement("div");
      slot.id = "phase10NowVersion";
      slot.className = "phase10-now-version";
      now.appendChild(slot);
      slot.appendChild(version);
    }else if(version && qs("#phase10NowVersion") && version.parentNode !== qs("#phase10NowVersion")){
      qs("#phase10NowVersion").appendChild(version);
    }
  }


  // DIRECTFIX_STREAM_HEADER_TICKER_MESSAGE_V1_20260525
  function directfixRestoreStatusLeds(){
    if(!phase10IsDesktopPlayer || !phase10IsDesktopPlayer()) return;
    var infoGrid = qs(".info-grid");
    var djCard = qs("#djText") ? qs("#djText").closest(".info-card") : null;
    if(!infoGrid || !djCard) return;

    var card = qs("#phase10StatusLedCard");
    if(!card){
      card = document.createElement("article");
      card.id = "phase10StatusLedCard";
      card.className = "info-card phase10-status-led-card";
      card.innerHTML = '<div class="info-label">Stream / Meter / Source</div><div class="phase10-status-led-row"></div>';
      djCard.parentNode.insertBefore(card, djCard.nextSibling);
    }
    var row = qs(".phase10-status-led-row", card);
    ["statusStream","statusMeter","statusSource"].forEach(function(id){
      var el = qs("#"+id);
      if(!el){
        el = document.createElement("button");
        el.id = id;
        el.type = "button";
        el.className = "status-chip led-state";
        el.innerHTML = '<span class="status-dot"></span><span class="status-code">'+(id==="statusStream"?"STREAM":id==="statusMeter"?"METER":"SRC")+'</span>';
      }
      el.hidden = false;
      if(el.parentNode !== row) row.appendChild(el);
    });
    var pool = qs("#phase10StatusLedSourcePool");
    if(pool) pool.remove();
  }

  function directfixPcNoAutoFallback(){
    if(!phase10IsDesktopPlayer || !phase10IsDesktopPlayer()) return;
    var audio = getAudio();
    if(!audio) return;
    var src = String(audio.currentSrc || audio.getAttribute("src") || "");
    var target = document.documentElement.getAttribute("data-phase10-stream-target");
    var backupActive = /fallback-stream|backup/i.test(src) || target === "backup";
    if(backupActive && !phase10ManualStreamSwitchRecent()){
      document.documentElement.setAttribute("data-phase10-stream-target","main");
      document.documentElement.setAttribute("data-phase10-pc-auto-fallback","blocked");
      var wasPlaying = !audio.paused;
      try{
        audio.pause();
        audio.setAttribute("src","/stream?t="+Date.now());
        audio.load();
        if(wasPlaying){
          var p = audio.play();
          if(p && p.catch) p.catch(function(){});
        }
      }catch(e){ console.warn("[directfix pc main lock]", e); }
    }
  }

  function directfixTickerAndMessage(){
    var ticker = qs("#nowPlayingTicker");
    if(ticker){
      ticker.style.color = "#20f7ff";
      ticker.style.textShadow = "0 0 10px rgba(32,247,255,.65)";
      var text = String(ticker.textContent || "").trim();
      if(text && text.length < 90 && !ticker.__directfixRepeated){
        ticker.__directfixRepeated = true;
        ticker.textContent = text + "   •   " + text + "   •   " + text;
      }
    }
    var box = qs("#playerAlertPcBox");
    var txt = qs("#playerAlertPcText");
    if(box && txt && !qs("#phase10EmojiBar")){
      var emoji = document.createElement("div");
      emoji.id = "phase10EmojiBar";
      emoji.className = "phase10-emoji-bar";
      ["😀","😎","🔥","❤️","🎧","🎵","🚀","👽","666"].forEach(function(e){
        var b=document.createElement("button"); b.type="button"; b.textContent=e;
        b.addEventListener("click",function(){ txt.value = (txt.value || "") + e; txt.focus(); });
        emoji.appendChild(b);
      });
      box.appendChild(emoji);
    }
  }

  function boot(){
    mountHudLogo();
    directfixRestoreStatusLeds();
    directfixTickerAndMessage();
    installPcMainBackupGuard();
    directfixPcNoAutoFallback();
    phase10RelocatePcPanels();
    mountMobilePanelRow();
    mountBottomSafe();
    bindEqTriggers();
    installAudioRecovery();
    installAudioFocusGuard();
    normalizeBoostStatusTooltip();
    improveMeterScaling();
    setInterval(function(){
      mountMobilePanelRow();
      bindEqTriggers();
      installAudioRecovery();
      installAudioFocusGuard();
      normalizeBoostStatusTooltip();
      phase10RelocatePcPanels();
      directfixRestoreStatusLeds();
      directfixPcNoAutoFallback();
      directfixTickerAndMessage();
    }, 2500);
    document.documentElement.setAttribute("data-phase10-stability", VERSION);
  }

  window.S666Phase10 = { toggleMobileStream:toggleMobileStream, recoverAudio:recoverAudio, openSoundControl:openSoundControl, openAdmin:openAdmin, version:VERSION };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
