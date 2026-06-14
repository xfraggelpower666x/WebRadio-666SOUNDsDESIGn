
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

  // AUDIO_CORE_AUTHORITY_LOCK_V1_20260610
  // Zweck: Nur ein Recovery-Chef darf automatische Audio-Recovery auslösen.
  // Keine neue Audio-Engine. Keine neue UI. Keine Stream-URL-Änderung.
  window.S666_AUDIO_AUTHORITY = window.S666_AUDIO_AUTHORITY || {
    transport: "player-core-or-mff",
    recovery: "central-audio-guard-v2",
    legacyRecoveryMuted: true
  };

  function s666CentralAudioAuthorityActive(){
    return !!(
      window.S666_AUDIO_AUTHORITY &&
      window.S666_AUDIO_AUTHORITY.recovery === "central-audio-guard-v2" &&
      window.S666_AUDIO_AUTHORITY.legacyRecoveryMuted === true
    );
  }


  // IOS_AUDIO_FOCUS_RESUME_PATCH_V1_20260610
  // Zweck: AudioFocusGuard bleibt Sensor, CentralAudioGuardV2 bleibt Recovery-Chef.
  // Bei iOS-Audio-Fokus-Unterbrechungen nicht stumm aussteigen, sondern an den Chef übergeben.
  function s666AudioAuthorityHandoff(reason, state){
    try {
      document.documentElement.setAttribute("data-phase10-audio-focus", state || "handoff-to-central-authority");
      document.documentElement.setAttribute("data-audio-authority-handoff", reason || "audio-focus-handoff");
    } catch(e) {}

    if (typeof centralAudioGuardV2Recover === "function") {
      centralAudioGuardV2Recover(reason || "audio-focus-handoff");
      return true;
    }

    try {
      document.documentElement.setAttribute("data-audio-authority-handoff", "central-recover-function-unavailable");
    } catch(e) {}
    return false;
  }

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
    if(window.FPAdminOverlay && typeof window.FPAdminOverlay.open === "function"){
      window.FPAdminOverlay.open();
      return;
    }
    var targets = [
      "#fp-admin-button",
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
    if(s666CentralAudioAuthorityActive()){
      document.documentElement.setAttribute("data-phase10-legacy-recovery-muted", reason || "legacy-muted");
      return;
    }

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
    // HARDFIX_MAINONLY_LOGO_PANEL_V2_20260525: kein dynamisches 666-HUD-Logo. Header-Logo sitzt statisch im echten Header-DOM.
    qsa(".s666-phase10-logo-zone").forEach(function(el){ el.remove(); });
  }


  // AUDIO_FOCUS_GUARD_V1_20260525
  var audioFocusGuard = {
    userStopAt: 0,
    externalPauseAt: 0,
    lastPauseAt: 0,
    lastPlayWantedAt: Date.now(),
    pauseToleranceMs: 2500,
    longInterruptionMs: 4000,
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
          if(s666CentralAudioAuthorityActive()){
            s666AudioAuthorityHandoff("audio-focus-guard-resume", "handoff-to-central-authority");
            return;
          }
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
          if(again && again.paused && streamWanted()){
            if(s666CentralAudioAuthorityActive()){
              s666AudioAuthorityHandoff("visibility-return-resume", "handoff-to-central-authority-visibility");
              return;
            }
            recoverAudio("visibility-return-resume");
          }
        }, 650);
      }
    }, true);

    window.addEventListener("pageshow", function(){
      var a = getAudio();
      if(a && a.paused && streamWanted() && !isUserStopRecent()){
        setTimeout(function(){
          if(s666CentralAudioAuthorityActive()){
            s666AudioAuthorityHandoff("pageshow-resume", "handoff-to-central-authority-pageshow");
            return;
          }
          recoverAudio("pageshow-resume");
        }, 750);
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
          if(s666CentralAudioAuthorityActive()){
            s666AudioAuthorityHandoff("audio-focus-periodic-resume", "handoff-to-central-authority-periodic");
            return;
          }
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


  // UI_FINETUNE_V1_20260528
  function uiFinetuneV1(){
    var v = qs("#pcVersionBadge .status-code");
    if(v) v.textContent = "v2026.05.28-ui1";
    var logo = qs("#pcHeaderNewLogo");
    if(logo && logo.getAttribute("src") && logo.getAttribute("src").indexOf("ui-finetune-v1-20260528") === -1){
      logo.setAttribute("src", "/assets/logos/phase10-new-header-logo.png?v=ui-finetune-v1-20260528");
    }
    if(typeof hardfixMoveLedsBehindDj === "function") hardfixMoveLedsBehindDj();
  }


  // IPHONE_PC_PARITY_V1_20260530
  function parityIsMobile(){
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent || "") || window.innerWidth <= 760;
  }
  function parityOpenSound(){
    if(typeof openSoundControl === "function") return openSoundControl();
    if(window.S666SoundControl && typeof window.S666SoundControl.open === "function") return window.S666SoundControl.open();
    var b = qs("#s666SoundControlButton");
    if(b) return tap(b, "parity-sound");
  }
  function parityOpenAdmin(){
    if(typeof openAdmin === "function") return openAdmin();
    var b = qs("#fp-admin-open") || qs(".fp-admin-open") || qs("[data-admin-open]") || qs("#adminButton") || qs("#adminBtn");
    if(b) return tap(b, "parity-admin");
  }
  function parityOpenChaos(){
    if(typeof openChaos === "function") return openChaos();
    try{ window.open("/CHAOS_ENGINE/?v=" + Date.now(), "_blank"); } catch(e){ location.href="/CHAOS_ENGINE/?v="+Date.now(); }
  }
  function parityOpenStatus(){
    if(typeof openStatus === "function") return openStatus();
    try{ window.open("/api/discord/debug?t=" + Date.now(), "_blank"); } catch(e){ location.href="/api/discord/debug?t="+Date.now(); }
  }
  function parityMountMobileHub(){
    if(!parityIsMobile()) return;
    var app = qs("#mffApp") || qs(".player-shell") || document.body;
    if(qs("#s666ParityMobileHub")) return;
    var hub = document.createElement("div");
    hub.id = "s666ParityMobileHub";
    hub.className = "s666-parity-mobile-hub";
    hub.innerHTML = '<button type="button" data-parity-action="stream">STREAM</button><button type="button" data-parity-action="sound">SOUND</button><button type="button" data-parity-action="admin">ADMIN</button><button type="button" data-parity-action="chaos">CHAOS</button><button type="button" data-parity-action="status">STATUS</button>';
    var anchor = qs("#s666MobileExtraRow") || qs(".mobile-boost") || qs(".hero-label-row") || qs(".now-playing");
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(hub, anchor.nextSibling);
    else app.insertBefore(hub, app.firstChild);
    hub.addEventListener("click", function(ev){
      var btn = ev.target.closest && ev.target.closest("[data-parity-action]");
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation();
      parityRunMobileAction(btn.getAttribute("data-parity-action"), btn);
    }, true);
    hub.addEventListener("touchend", function(ev){
      var btn = ev.target.closest && ev.target.closest("[data-parity-action]");
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation();
      parityRunMobileAction(btn.getAttribute("data-parity-action"), btn);
    }, {passive:false, capture:true});
  }
  function parityRunMobileAction(action, btn){
    qsa("#s666ParityMobileHub button").forEach(function(b){ b.removeAttribute("data-active"); });
    if(btn) btn.setAttribute("data-active","1");
    if(action === "stream"){ if(typeof toggleMobileStream === "function") return toggleMobileStream(); return; }
    if(action === "sound") return parityOpenSound();
    if(action === "admin") return parityOpenAdmin();
    if(action === "chaos") return parityOpenChaos();
    if(action === "status") return parityOpenStatus();
  }
  function parityBindMobileEqTriggers(){
    if(!parityIsMobile()) return;
    ["#mffEqBars","#mffBottomBars",".mff-bottom-bars",".mff-eq-bars","#eqBars",".eq-bars","#pcRealEqPanel",".pc-real-eq-panel"].forEach(function(sel){
      qsa(sel).forEach(function(el){
        if(el.__parityEqBound) return;
        el.__parityEqBound = true;
        el.style.pointerEvents = "auto";
        el.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); parityOpenSound(); }, true);
        el.addEventListener("touchend", function(ev){ ev.preventDefault(); ev.stopPropagation(); parityOpenSound(); }, {passive:false, capture:true});
      });
    });
  }
  function parityLockViewport(){
    if(!parityIsMobile()) return;
    document.documentElement.setAttribute("data-s666-mobile-parity","v1");
  }
  function parityUpdateVersion(){
    var v = qs("#pcVersionBadge .status-code");
    if(v) v.textContent = "v2026.05.30-iphone-parity1";
  }
  function iphonePcParityV1(){
    parityLockViewport();
    parityMountMobileHub();
    parityBindMobileEqTriggers();
    parityUpdateVersion();
  }


  // FORCED_UI_IMPLEMENTATION_V1_20260530
  function forcedUiApplyV1(){
    var v=qs("#pcVersionBadge .status-code"); if(v) v.textContent="v2026.05.30-forced-ui1";
    var brand=qs("#phase10BrandLine"); if(brand){brand.textContent="";brand.hidden=true;brand.style.display="none";}
    var logo=qs("#pcHeaderNewLogo"); if(logo) logo.setAttribute("src","/assets/logos/phase10-new-header-logo.png?v=forced-ui-v1-20260530");
    if(typeof hardfixMoveLedsBehindDj==="function") hardfixMoveLedsBehindDj();
    var dj=qs("#djText")?qs("#djText").closest(".info-card"):null, led=qs("#phase10StatusLedCard");
    if(dj&&led&&led.previousElementSibling!==dj) dj.parentNode.insertBefore(led,dj.nextSibling);
  }


  // SIDE_METER_REACTIVITY_V1_20260530
  var sideMeterReactV1State = { started:false, phase:0, smooth:0, peak:0 };

  function sideMeterReactV1AudioLevel(){
    var audio = getAudio && getAudio();
    var boost = 0;
    try { boost = Number(activeBoost && activeBoost()) || 0; } catch(e) {}
    var rms = 0;
    [window.__mffLastRms,window.__mffRms,window.__smfpRms,window.__radioRms,window.__mffAudioLevel,window.__smfpAudioLevel,window.__lastAudioLevel].forEach(function(v){
      var n = Number(v);
      if(isFinite(n) && n > 0) rms = Math.max(rms, n > 1 ? n / 100 : n);
    });
    if((!rms || rms < .015) && audio && !audio.paused){
      sideMeterReactV1State.phase += .135 + boost * .008;
      rms = .22 + Math.abs(Math.sin(sideMeterReactV1State.phase))*.32 + Math.abs(Math.sin(sideMeterReactV1State.phase*.43+1.9))*.18 + Math.abs(Math.sin(sideMeterReactV1State.phase*1.71+.3))*.10;
    }
    var level = Math.max(0, Math.min(1, rms * (1 + Math.min(5,boost)*.095)));
    sideMeterReactV1State.smooth = sideMeterReactV1State.smooth*.64 + level*.36;
    sideMeterReactV1State.peak = Math.max(sideMeterReactV1State.smooth, sideMeterReactV1State.peak*.88);
    return { level:sideMeterReactV1State.smooth, peak:sideMeterReactV1State.peak, boost:boost, running:!!(audio && !audio.paused) };
  }

  function sideMeterReactV1Groups(){
    var left = qsa(".left-meter,.mff-left-meter,.side-meter-left,[data-meter-side='left'],.fx-side-left .side-meter,.left-fx .side-meter");
    var right = qsa(".right-meter,.mff-right-meter,.side-meter-right,[data-meter-side='right'],.fx-side-right .side-meter,.right-fx .side-meter");
    qsa(".side-meter").forEach(function(el){
      if(left.indexOf(el)>=0 || right.indexOf(el)>=0) return;
      var rect = el.getBoundingClientRect();
      if(rect.left < window.innerWidth/2) left.push(el); else right.push(el);
    });
    return {left:left,right:right};
  }

  function sideMeterReactV1Bars(group, side){
    group.setAttribute("data-side-meter-react-v1", side);
    var bars = Array.prototype.slice.call(group.querySelectorAll("i,.bar,.meter-bar,.side-bar"));
    if(bars.length < 3){
      group.innerHTML = "<i></i><i></i><i></i>";
      bars = Array.prototype.slice.call(group.querySelectorAll("i"));
    }
    return bars.slice(0,3);
  }

  function sideMeterReactV1Paint(group, side, m){
    var bars = sideMeterReactV1Bars(group, side);
    var base = m.running ? m.level : .08;
    var peak = m.running ? m.peak : .10;
    var boostPush = Math.min(.16, m.boost*.025);
    var heights = [
      Math.max(.20, Math.min(1.00, .38 + peak*.62 + boostPush)),
      Math.max(.16, Math.min(.86, .26 + base*.54 + boostPush*.75)),
      Math.max(.12, Math.min(.70, .18 + base*.42 + boostPush*.55))
    ];
    bars.forEach(function(bar,i){
      var h = Math.round(heights[i]*100);
      bar.style.height = h + "%";
      bar.style.minHeight = Math.max(14,h) + "%";
      bar.style.opacity = String(Math.max(.48, Math.min(1, .52 + heights[i]*.55)));
      bar.style.filter = "saturate(" + (1.10 + m.boost*.08).toFixed(2) + ") brightness(" + (0.95 + heights[i]*.20).toFixed(2) + ")";
    });
  }

  function sideMeterReactV1Tick(){
    var m = sideMeterReactV1AudioLevel();
    var g = sideMeterReactV1Groups();
    g.left.forEach(function(el){ sideMeterReactV1Paint(el,"left",m); });
    g.right.forEach(function(el){ sideMeterReactV1Paint(el,"right",m); });
    document.documentElement.setAttribute("data-side-meter-react-v1","active");
  }

  function startSideMeterReactV1(){
    if(sideMeterReactV1State.started) return;
    sideMeterReactV1State.started = true;
    sideMeterReactV1Tick();
    setInterval(sideMeterReactV1Tick,120);
  }


  // IPHONE_AUDIO_STABILITY_GUARD_V2_20260530
  var iphoneAudioV2State = { started:false, wanted:false, userStopAt:0, lastTime:0, lastMoveAt:Date.now(), lastRecoverAt:0, step:0 };

  function iphoneAudioV2Mobile(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "") || (window.innerWidth <= 760 && /safari|applewebkit/i.test(navigator.userAgent || ""));
  }
  function iphoneAudioV2Audio(){
    return (typeof getAudio === "function" && getAudio()) || document.querySelector("audio");
  }
  function iphoneAudioV2UserStopRecent(){
    return Date.now() - iphoneAudioV2State.userStopAt < 14000;
  }
  function iphoneAudioV2Wanted(){
    if(iphoneAudioV2State.wanted) return true;
    try { if(typeof streamWanted === "function" && streamWanted()) return true; } catch(e) {}
    var a = iphoneAudioV2Audio();
    return !!(a && !a.paused && !a.ended);
  }
  function iphoneAudioV2MarkWanted(){
    iphoneAudioV2State.wanted = true;
    document.documentElement.setAttribute("data-iphone-audio-wanted","1");
  }
  function iphoneAudioV2MarkStop(){
    iphoneAudioV2State.userStopAt = Date.now();
    iphoneAudioV2State.wanted = false;
    document.documentElement.setAttribute("data-iphone-audio-wanted","0");
  }
  function iphoneAudioV2TryPlay(reason){
    var a = iphoneAudioV2Audio(); if(!a) return;
    iphoneAudioV2State.lastRecoverAt = Date.now();
    document.documentElement.setAttribute("data-iphone-audio-v2-recover", reason || "play");
    try {
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ document.documentElement.setAttribute("data-iphone-audio-v2-error", String(err && err.message || err).slice(0,120)); });
    } catch(e) { document.documentElement.setAttribute("data-iphone-audio-v2-error", String(e && e.message || e).slice(0,120)); }
  }
  function iphoneAudioV2LoadPlay(reason){
    var a = iphoneAudioV2Audio(); if(!a) return;
    iphoneAudioV2State.lastRecoverAt = Date.now();
    document.documentElement.setAttribute("data-iphone-audio-v2-recover", reason || "loadplay");
    try {
      a.load();
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ document.documentElement.setAttribute("data-iphone-audio-v2-error", String(err && err.message || err).slice(0,120)); });
    } catch(e) { document.documentElement.setAttribute("data-iphone-audio-v2-error", String(e && e.message || e).slice(0,120)); }
  }
  function iphoneAudioV2RebindMain(reason){
    var a = iphoneAudioV2Audio(); if(!a) return;
    iphoneAudioV2State.lastRecoverAt = Date.now();
    document.documentElement.setAttribute("data-iphone-audio-v2-recover", reason || "main");
    try {
      var src = String(a.currentSrc || a.getAttribute("src") || "");
      if(/fallback-stream|backup/i.test(src)) {
        a.pause();
        a.setAttribute("src", "/stream?t=" + Date.now());
        document.documentElement.setAttribute("data-phase10-stream-target","main");
      }
      a.load();
      var p = a.play();
      if(p && p.catch) p.catch(function(err){ document.documentElement.setAttribute("data-iphone-audio-v2-error", String(err && err.message || err).slice(0,120)); });
    } catch(e) { document.documentElement.setAttribute("data-iphone-audio-v2-error", String(e && e.message || e).slice(0,120)); }
  }
  function iphoneAudioV2Recover(reason){
    if(s666CentralAudioAuthorityActive()){
      document.documentElement.setAttribute("data-iphone-audio-v2-muted", reason || "central-authority-active");
      return;
    }
    if(!iphoneAudioV2Mobile()) return;
    if(!iphoneAudioV2Wanted()) return;
    if(iphoneAudioV2UserStopRecent()) return;
    if(Date.now() - iphoneAudioV2State.lastRecoverAt < 9000) return;
    iphoneAudioV2State.step = (iphoneAudioV2State.step + 1) % 3;
    if(iphoneAudioV2State.step === 0) return iphoneAudioV2TryPlay(reason + "-play");
    if(iphoneAudioV2State.step === 1) return iphoneAudioV2LoadPlay(reason + "-loadplay");
    return iphoneAudioV2RebindMain(reason + "-main");
  }
  function iphoneAudioV2Tick(){
    if(!iphoneAudioV2Mobile()) return;
    var a = iphoneAudioV2Audio(); if(!a) return;
    var now = Date.now();
    var ct = Number(a.currentTime || 0);
    var moved = Math.abs(ct - iphoneAudioV2State.lastTime) > 0.08;
    if(!a.paused && moved) {
      iphoneAudioV2State.lastMoveAt = now;
      iphoneAudioV2State.step = 0;
    }
    iphoneAudioV2State.lastTime = ct;
    var stalled = now - iphoneAudioV2State.lastMoveAt;
    document.documentElement.setAttribute("data-iphone-audio-stability-v2","active");
    document.documentElement.setAttribute("data-iphone-audio-v2-ready", String(a.readyState || 0));
    document.documentElement.setAttribute("data-iphone-audio-v2-stall-ms", String(stalled));
    if(!iphoneAudioV2Wanted() || iphoneAudioV2UserStopRecent()) return;
    if(a.paused && stalled > 4200) return iphoneAudioV2Recover("paused-wanted");
    if(!a.paused && stalled > 14500) return iphoneAudioV2Recover("time-stall");
    if((a.readyState || 0) < 2 && stalled > 9000) return iphoneAudioV2Recover("ready-low");
  }
  function startIphoneAudioStabilityGuardV2(){
    if(iphoneAudioV2State.started) return;
    iphoneAudioV2State.started = true;
    var a = iphoneAudioV2Audio();
    if(a) {
      ["play","playing","canplay","canplaythrough"].forEach(function(ev){ a.addEventListener(ev,function(){ iphoneAudioV2MarkWanted(); iphoneAudioV2State.lastMoveAt=Date.now(); },true); });
      ["waiting","stalled","suspend","emptied","abort","error"].forEach(function(ev){ a.addEventListener(ev,function(){ setTimeout(function(){ iphoneAudioV2Recover(ev); },6500); },true); });
    }
    qsa("button,.control-btn").forEach(function(btn){
      var txt = String(btn.textContent || btn.getAttribute("aria-label") || "").toLowerCase();
      if(/play/.test(txt)) btn.addEventListener("click", iphoneAudioV2MarkWanted, true);
      if(/stop/.test(txt)) btn.addEventListener("click", iphoneAudioV2MarkStop, true);
    });
    ["visibilitychange","pageshow","focus","online"].forEach(function(ev){ window.addEventListener(ev,function(){ setTimeout(function(){ iphoneAudioV2Recover(ev); },1200); },true); });
    setInterval(iphoneAudioV2Tick,2500);
    setTimeout(iphoneAudioV2Tick,1600);
    document.documentElement.setAttribute("data-iphone-audio-stability-v2","installed");
  }


  // CENTRAL_AUDIO_STABILITY_GUARD_V2_20260530
  var centralAudioGuardV2 = {
    started:false, wanted:false, manualStopAt:0, lastTime:0, lastMoveAt:Date.now(), lastRecoverAt:0, step:0, escalation:0,
    pcProfile:{ pausedToleranceMs:4000, stallToleranceMs:36000, readyLowToleranceMs:18000, cooldownMs:6000 },
    mobileProfile:{ pausedToleranceMs:2000, stallToleranceMs:26000, readyLowToleranceMs:10000, cooldownMs:4500 }
  };
  function centralAudioGuardV2IsMobile(){ return /iphone|ipad|ipod|android/i.test(navigator.userAgent||"") || window.innerWidth <= 760; }
  function centralAudioGuardV2Profile(){ return centralAudioGuardV2IsMobile() ? centralAudioGuardV2.mobileProfile : centralAudioGuardV2.pcProfile; }
  function centralAudioGuardV2Audio(){ return (typeof getAudio==="function" && getAudio()) || document.querySelector("audio"); }
  function centralAudioGuardV2ManualStopRecent(){ return Date.now() - centralAudioGuardV2.manualStopAt < 14000; }
  function centralAudioGuardV2MarkWanted(){ centralAudioGuardV2.wanted=true; document.documentElement.setAttribute("data-central-audio-wanted","1"); }
  function centralAudioGuardV2MarkStop(){ centralAudioGuardV2.manualStopAt=Date.now(); centralAudioGuardV2.wanted=false; document.documentElement.setAttribute("data-central-audio-wanted","0"); }
  function centralAudioGuardV2Wanted(){
    if(centralAudioGuardV2.wanted) return true;
    try{ if(typeof streamWanted==="function" && streamWanted()) return true; }catch(e){}
    var a=centralAudioGuardV2Audio();
    return !!(a && !a.paused && !a.ended);
  }
  function centralAudioGuardV2Status(reason){
    document.documentElement.setAttribute("data-central-audio-stability-v2","active");
    document.documentElement.setAttribute("data-central-audio-device", centralAudioGuardV2IsMobile() ? "mobile" : "pc");
    document.documentElement.setAttribute("data-central-audio-reason", reason||"");
  }
  // IOS_PC_AUDIO_RECOVERY_ESCALATION_PATCH_A_V1_20260610
  // Zweck: Recovery eskalieren statt sofort hart laden/rebinden.
  // Stufe 1 = play(), Stufe 2 = AudioContext resume + play(), Stufe 3 = load()+play(), Stufe 4 = src-Rebind.
  // currentTime allein darf keinen harten Live-Stream-Recovery-Step auslösen.
  function centralAudioGuardV2ResumeContexts(reason){
    var resumed=false;
    [window.__mffAudioContext, window.__radioAudioContext, window.__smfpAudioContext].forEach(function(ctx){
      try{
        if(ctx && ctx.state === "suspended" && typeof ctx.resume === "function"){
          var r=ctx.resume();
          if(r && typeof r.catch === "function") r.catch(function(err){
            document.documentElement.setAttribute("data-central-audio-context-error",String(err&&err.message||err).slice(0,120));
          });
          resumed=true;
        }
      }catch(e){ document.documentElement.setAttribute("data-central-audio-context-error",String(e&&e.message||e).slice(0,120)); }
    });
    document.documentElement.setAttribute("data-central-audio-context-resume", resumed ? (reason||"resume") : "none");
    return resumed;
  }
  function centralAudioGuardV2Play(reason){
    var a=centralAudioGuardV2Audio(); if(!a) return;
    centralAudioGuardV2.lastRecoverAt=Date.now(); centralAudioGuardV2Status(reason||"play");
    document.documentElement.setAttribute("data-central-audio-recovery-action","play");
    try{ var p=a.play(); if(p&&p.catch) p.catch(function(err){document.documentElement.setAttribute("data-central-audio-error",String(err&&err.message||err).slice(0,120));}); }
    catch(e){document.documentElement.setAttribute("data-central-audio-error",String(e&&e.message||e).slice(0,120));}
  }
  function centralAudioGuardV2ContextPlay(reason){
    centralAudioGuardV2ResumeContexts(reason||"context-play");
    return centralAudioGuardV2Play(reason||"context-play");
  }
  function centralAudioGuardV2LoadPlay(reason){
    var a=centralAudioGuardV2Audio(); if(!a) return;
    centralAudioGuardV2.lastRecoverAt=Date.now(); centralAudioGuardV2Status(reason||"loadplay");
    document.documentElement.setAttribute("data-central-audio-recovery-action","loadplay");
    try{ a.load(); var p=a.play(); if(p&&p.catch) p.catch(function(err){document.documentElement.setAttribute("data-central-audio-error",String(err&&err.message||err).slice(0,120));}); }
    catch(e){document.documentElement.setAttribute("data-central-audio-error",String(e&&e.message||e).slice(0,120));}
  }
  function centralAudioGuardV2RebindMain(reason){
    var a=centralAudioGuardV2Audio(); if(!a) return;
    centralAudioGuardV2.lastRecoverAt=Date.now(); centralAudioGuardV2Status(reason||"main-rebind");
    document.documentElement.setAttribute("data-central-audio-recovery-action","main-rebind");
    try{
      var src=String(a.currentSrc||a.getAttribute("src")||"");
      if(/fallback-stream|backup/i.test(src)){
        a.pause();
        a.removeAttribute("src");
        a.setAttribute("src","/stream?t="+Date.now());
        document.documentElement.setAttribute("data-phase10-stream-target","main");
      } else if(!src || /about:blank/i.test(src)) {
        a.setAttribute("src","/stream?t="+Date.now());
      } else {
        a.load();
      }
      var p=a.play(); if(p&&p.catch) p.catch(function(err){document.documentElement.setAttribute("data-central-audio-error",String(err&&err.message||err).slice(0,120));});
    }catch(e){document.documentElement.setAttribute("data-central-audio-error",String(e&&e.message||e).slice(0,120));}
  }
  // PC_IPHONE_ANDROID_AUDIO_HEALING_ORCHESTRA_PATCH_1_V1_20260611
  // Zweck: Ein gemeinsamer Audio-Healing-Decision-Core fuer PC, iPhone und Android.
  // Sensoren melden nur. Diese Orchester-Funktion entscheidet zentral und gestuft.
  window.S666_AUDIO_HEALING_ORCHESTRA = window.S666_AUDIO_HEALING_ORCHESTRA || {
    active:true,
    version:"PC_IPHONE_ANDROID_AUDIO_HEALING_ORCHESTRA_PATCH_1_V1_20260611",
    recoveryChief:"audio-healing-orchestra",
    transportChief:"player-core-or-mff",
    legacyRecoveryMuted:true,
    stage:0,
    maxStage:5,
    lastEvent:"",
    lastDecision:"",
    lastGuard:"",
    lastRecoveryAt:0,
    failSafe:0
  };

  function s666AudioOrchestra(){
    window.S666_AUDIO_HEALING_ORCHESTRA = window.S666_AUDIO_HEALING_ORCHESTRA || {};
    return window.S666_AUDIO_HEALING_ORCHESTRA;
  }

  function s666AudioOrchestraSet(key,val){
    try{
      var o=s666AudioOrchestra();
      o[key]=val;
      document.documentElement.setAttribute("data-audio-orchestra-"+key.replace(/[A-Z]/g,function(m){return "-"+m.toLowerCase();}), String(val));
    }catch(e){}
  }

  function s666AudioOrchestraStatus(reason, decision, guard){
    var o=s666AudioOrchestra();
    var device=centralAudioGuardV2IsMobile() ? ((/android/i.test(navigator.userAgent||"")) ? "android" : "iphone") : "pc";
    o.active=true; o.lastEvent=String(reason||""); o.lastDecision=String(decision||""); o.lastGuard=String(guard||""); o.device=device;
    try{
      document.documentElement.setAttribute("data-audio-orchestra","active");
      document.documentElement.setAttribute("data-audio-orchestra-version",o.version||"PC_IPHONE_ANDROID_AUDIO_HEALING_ORCHESTRA_PATCH_1_V1_20260611");
      document.documentElement.setAttribute("data-audio-orchestra-device",device);
      document.documentElement.setAttribute("data-audio-orchestra-last-event",String(reason||""));
      document.documentElement.setAttribute("data-audio-orchestra-last-decision",String(decision||""));
      document.documentElement.setAttribute("data-audio-orchestra-last-guard",String(guard||""));
      document.documentElement.setAttribute("data-audio-authority-chief","audio-healing-orchestra");
    }catch(e){}
  }

  function s666AudioOrchestraManualStopRecent(){
    if(centralAudioGuardV2ManualStopRecent()) return true;
    try{ if(typeof isUserStopRecent==="function" && isUserStopRecent()) return true; }catch(e){}
    return false;
  }

  function s666AudioOrchestraIsHardReason(reason, audio, ready, network){
    var r=String(reason||"");
    var src=audio ? String(audio.currentSrc||audio.getAttribute("src")||"") : "";
    return /error|abort|emptied|no-source|network-no-source|decode|media-error/i.test(r) ||
      network===3 || !audio || !src;
  }

  function s666AudioOrchestraDecide(reason){
    var o=s666AudioOrchestra();
    var a=centralAudioGuardV2Audio();
    var r=String(reason||"recovery");
    var now=Date.now();
    var profile=centralAudioGuardV2Profile();
    var ready=a?Number(a.readyState||0):0;
    var network=a?Number(a.networkState||0):0;
    var paused=!!(a && a.paused);
    var hidden=!!document.hidden;
    var wanted=centralAudioGuardV2Wanted();
    var hard=s666AudioOrchestraIsHardReason(r,a,ready,network);
    var currentTimeOnly=/time-stall/i.test(r) && a && !paused && ready>=2 && network!==3;

    s666AudioOrchestraStatus(r,"inspect","decision-core");
    document.documentElement.setAttribute("data-audio-orchestra-ready",String(ready));
    document.documentElement.setAttribute("data-audio-orchestra-network",String(network));
    document.documentElement.setAttribute("data-audio-orchestra-paused",paused?"1":"0");
    document.documentElement.setAttribute("data-audio-orchestra-wanted",wanted?"1":"0");

    if(!wanted){
      o.stage=0; o.failSafe=0;
      s666AudioOrchestraStatus(r,"observe-no-wanted","user-intent-guard");
      return;
    }

    if(s666AudioOrchestraManualStopRecent()){
      o.stage=0; o.failSafe=0;
      s666AudioOrchestraStatus(r,"blocked-manual-stop-recent","user-intent-guard");
      return;
    }

    if(currentTimeOnly){
      o.stage=0;
      s666AudioOrchestraStatus(r,"observe-currenttime-only","live-stream-currenttime-guard");
      return;
    }

    // PC-Return-Guard / iOS-Focus-Guard: Fokus- und Sichtbarkeitsereignisse starten nur soft.
    if(/visibility|pageshow|focus|online|audio-focus/i.test(r) && !paused && ready>=2 && !hard){
      o.stage=0;
      s666AudioOrchestraStatus(r,"observe-focus-return-audio-ok","pc-ios-focus-guard");
      return;
    }

    if(now-Number(o.lastRecoveryAt||0) < profile.cooldownMs){
      s666AudioOrchestraStatus(r,"cooldown-block","no-endless-recovery-guard");
      return;
    }

    var nextStage = Math.max(1, Number(o.stage||0) + 1);
    if(/visibility|pageshow|focus|audio-focus|paused-wanted/i.test(r)) nextStage = Math.min(nextStage,2);
    if(hard) nextStage = Math.max(nextStage,3);
    if(ready < 2 && !paused) nextStage = Math.max(nextStage,2);
    if(nextStage > 5) nextStage = 5;

    o.stage=nextStage;
    o.lastRecoveryAt=now;
    centralAudioGuardV2.lastRecoverAt=now;
    document.documentElement.setAttribute("data-audio-orchestra-stage",String(nextStage));
    document.documentElement.setAttribute("data-central-audio-recovery-level",String(nextStage));
    document.documentElement.setAttribute("data-central-audio-recovery-request",r);

    if(nextStage===1){
      s666AudioOrchestraStatus(r,"stage-1-soft-play","single-healer-guard");
      return centralAudioGuardV2Play(r+"-orchestra-soft-play");
    }
    if(nextStage===2){
      s666AudioOrchestraStatus(r,"stage-2-context-play","single-healer-guard");
      return centralAudioGuardV2ContextPlay(r+"-orchestra-context-play");
    }
    if(nextStage===3){
      s666AudioOrchestraStatus(r,"stage-3-load-play","single-healer-guard");
      return centralAudioGuardV2LoadPlay(r+"-orchestra-loadplay");
    }
    if(nextStage===4){
      if(/visibility|pageshow|focus|audio-focus/i.test(r)){
        s666AudioOrchestraStatus(r,"stage-4-blocked-focus-no-rebind","ios-pc-return-guard");
        return centralAudioGuardV2ContextPlay(r+"-orchestra-focus-context-play");
      }
      s666AudioOrchestraStatus(r,"stage-4-controlled-rebind","single-healer-guard");
      return centralAudioGuardV2RebindMain(r+"-orchestra-main-rebind");
    }

    o.failSafe=1;
    document.documentElement.setAttribute("data-audio-orchestra-failsafe","1");
    document.documentElement.setAttribute("data-central-audio-recovery-action","fail-safe-wait");
    s666AudioOrchestraStatus(r,"stage-5-failsafe-wait","no-endless-recovery-guard");
  }

  function centralAudioGuardV2Recover(reason){
    return s666AudioOrchestraDecide(reason);
  }
  function centralAudioGuardV2Tick(){
    var a=centralAudioGuardV2Audio(); if(!a) return;
    var now=Date.now(), ct=Number(a.currentTime||0), moved=Math.abs(ct-centralAudioGuardV2.lastTime)>0.08;
    if(!a.paused && (moved || Number(a.readyState||0) >= 3)){ centralAudioGuardV2.lastMoveAt=now; centralAudioGuardV2.escalation=0; try{ var oo=s666AudioOrchestra(); oo.stage=0; oo.failSafe=0; document.documentElement.setAttribute("data-audio-orchestra-stage","0"); document.documentElement.setAttribute("data-audio-orchestra-failsafe","0"); }catch(e){} }
    centralAudioGuardV2.lastTime=ct;
    var stalled=now-centralAudioGuardV2.lastMoveAt, ready=Number(a.readyState||0), network=Number(a.networkState||0), profile=centralAudioGuardV2Profile();
    var currentTimeOnlyStall=(!a.paused && stalled > profile.stallToleranceMs && ready >= 2 && network !== 3);
    document.documentElement.setAttribute("data-central-audio-stability-v2","active");
    document.documentElement.setAttribute("data-central-audio-device",centralAudioGuardV2IsMobile()?"mobile":"pc");
    document.documentElement.setAttribute("data-central-audio-ready",String(ready));
    document.documentElement.setAttribute("data-central-audio-network",String(network));
    document.documentElement.setAttribute("data-central-audio-stall-ms",String(Math.max(0,stalled)));
    document.documentElement.setAttribute("data-central-audio-currenttime-only-stall", currentTimeOnlyStall ? "1" : "0");
    if(!centralAudioGuardV2Wanted() || centralAudioGuardV2ManualStopRecent()) return;
    if(a.paused && stalled > profile.pausedToleranceMs) return centralAudioGuardV2Recover("paused-wanted");
    if(!a.paused && stalled > profile.stallToleranceMs && (ready < 2 || network === 3)) return centralAudioGuardV2Recover("time-stall-confirmed");
    if(currentTimeOnlyStall){
      document.documentElement.setAttribute("data-central-audio-observe-only","currenttime-only-stall");
      return;
    }
    if(ready < 2 && stalled > profile.readyLowToleranceMs) return centralAudioGuardV2Recover("ready-low");
  }
  function startCentralAudioStabilityGuardV2(){
    if(centralAudioGuardV2.started) return;
    centralAudioGuardV2.started=true;
    var a=centralAudioGuardV2Audio();
    if(a){
      ["play","playing","canplay","canplaythrough"].forEach(function(ev){a.addEventListener(ev,function(){centralAudioGuardV2MarkWanted();centralAudioGuardV2.lastMoveAt=Date.now(); try{ var o=s666AudioOrchestra(); o.stage=0; o.failSafe=0; document.documentElement.setAttribute("data-audio-orchestra-stage","0"); document.documentElement.setAttribute("data-audio-orchestra-failsafe","0"); }catch(e){} },true);});
      ["waiting","stalled","suspend","emptied","abort","error"].forEach(function(ev){a.addEventListener(ev,function(){var hard=/emptied|abort|error/.test(ev);var d=hard?(centralAudioGuardV2IsMobile()?8000:12000):(centralAudioGuardV2IsMobile()?22000:32000);setTimeout(function(){if(!hard){var aa=centralAudioGuardV2Audio();if(aa&&Number(aa.networkState||0)===2&&Number(aa.readyState||0)>=2&&!aa.paused)return;}centralAudioGuardV2Recover(ev);},d);},true);});
    }
    qsa("button,.control-btn").forEach(function(btn){
      var txt=String(btn.textContent||btn.getAttribute("aria-label")||"").toLowerCase();
      if(/play/.test(txt)) btn.addEventListener("click",centralAudioGuardV2MarkWanted,true);
      if(/stop/.test(txt)) btn.addEventListener("click",centralAudioGuardV2MarkStop,true);
    });
    ["visibilitychange","pageshow","focus","online"].forEach(function(ev){window.addEventListener(ev,function(){var d=centralAudioGuardV2IsMobile()?500:800;setTimeout(function(){centralAudioGuardV2Recover(ev);},d);},true);});
    setInterval(centralAudioGuardV2Tick,1500);
    setTimeout(centralAudioGuardV2Tick,1600);
    document.documentElement.setAttribute("data-central-audio-stability-v2","installed");
  }
  function startIphoneAudioStabilityGuardV2(){ startCentralAudioStabilityGuardV2(); }

  function boot(){
    mountHudLogo();
    hardfixInstallManualBackupFlag();
    hardfixMoveLedsBehindDj();
    hardfixTickerNoEmptyGap();
    hardfixMessageBox();
    hardfixForceMainOnlyPc();
    uiFinetuneV1();
    iphonePcParityV1();
    forcedUiApplyV1();
    startSideMeterReactV1();
    startIphoneAudioStabilityGuardV2();
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
      hardfixInstallManualBackupFlag();
      hardfixMoveLedsBehindDj();
      hardfixTickerNoEmptyGap();
      hardfixMessageBox();
      hardfixForceMainOnlyPc();
    }, 2500);
    document.documentElement.setAttribute("data-phase10-stability", VERSION);
  }

  window.S666Phase10 = { toggleMobileStream:toggleMobileStream, recoverAudio:recoverAudio, openSoundControl:openSoundControl, openAdmin:openAdmin, version:VERSION };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
