
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
  var VERSION = "phase10-stability-iphone-panel-hud-20260901-canonical-recovery-v1";
  var lastAudibleAt = Date.now();

  // AUDIO_CORE_AUTHORITY_LOCK_V1_20260610
  // Zweck: Nur ein Recovery-Chef darf automatische Audio-Recovery auslösen.
  // Keine neue Audio-Engine. Keine neue UI. Keine Stream-URL-Änderung.
  window.S666_AUDIO_AUTHORITY = window.S666_AUDIO_AUTHORITY || {
    transport: "player-core-or-mff",
    recovery: "central-audio-guard-v2",
    legacyRecoveryMuted: true
  };

  function s666CanonicalRecoveryOwner(){
    try{
      var owner = window.S666AllPlayerAudioRecovery;
      return owner && owner.owner === "all-player-audio-recovery-v1" && typeof owner.legacyHandoff === "function" ? owner : null;
    }catch(_){ return null; }
  }

  function s666LegacyRecoveryHandoff(source, reason){
    var owner = s666CanonicalRecoveryOwner();
    if(!owner) return false;
    var handoffReason = reason || source || "legacy-recovery-signal";
    try{ owner.legacyHandoff(handoffReason); }catch(_){}
    try{
      document.documentElement.setAttribute("data-phase10-recovery-owner","all-player-audio-recovery-v1");
      document.documentElement.setAttribute("data-phase10-recovery-handoff", String(handoffReason));
      document.documentElement.setAttribute("data-phase10-recovery-source", String(source || "phase10"));
    }catch(_){}
    return true;
  }

  function s666CentralAudioAuthorityActive(){
    if(s666CanonicalRecoveryOwner()) return true;
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

    if(s666LegacyRecoveryHandoff("phase10-audio-focus", reason || "audio-focus-handoff")) return true;

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
    qsa("#s666ParityMobileHub").forEach(function(el){ try{ el.remove(); }catch(e){} });

    var row = document.createElement("div");
    row.id = "s666MobileExtraRow";
    row.className = "s666-mobile-extra-row";
    row.innerHTML = [
      '<button type="button" data-phase10-mobile="player">PLAYER</button>',
      '<button type="button" data-phase10-mobile="stream">STREAM</button>',
      '<button type="button" data-phase10-mobile="admin">ADMIN</button>',
      '<button type="button" data-phase10-mobile="status">STATUS</button>'
    ].join("");

    var anchor = qs(".mff-controls", app) || qs(".mff-boost-row-panel", app) || qs(".mff-now", app);
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling);
    else app.appendChild(row);

    qsa('[data-mff="down"],[data-mff="boost"],[data-mff="up"],.mff-boost-row-panel', app).forEach(function(el){ el.remove(); });

    row.addEventListener("click", function(ev){
      var sound = ev.target.closest && ev.target.closest("#s666SoundControlButton");
      if(sound){ ev.preventDefault(); ev.stopPropagation(); openSoundControl(); return; }
      var message = ev.target.closest && ev.target.closest("#s666MessageControlButton");
      if(message && window.S666Messenger){ ev.preventDefault(); ev.stopPropagation(); window.S666Messenger.open(); return; }
      var btn = ev.target.closest && ev.target.closest("[data-phase10-mobile]");
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      runMobileAction(btn.getAttribute("data-phase10-mobile"), btn);
    }, true);
  }

  function runMobileAction(action, btn){
    qsa("#s666MobileExtraRow button").forEach(function(b){ b.removeAttribute("data-state"); });
    if(btn) btn.setAttribute("data-state", "active");

    if(action === "player") return returnToPlayer();
    if(action === "stream") return toggleMobileStream();
    if(action === "sound") return openSoundControl();
    if(action === "admin") return openAdmin();
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


  function returnToPlayer(){
    var app = qs("#mffApp");
    if(app) app.removeAttribute("data-s666-mobile-view");
    var panel = qs("#s666MobileStatusPanel");
    if(panel) panel.hidden = true;
    qsa("#s666MobileExtraRow button,#s666ParityMobileHub button").forEach(function(b){ b.removeAttribute("data-state"); b.removeAttribute("data-active"); });
    try{ window.scrollTo(0,0); }catch(e){}
  }

  function ensureMobileStatusPanel(){
    var app = qs("#mffApp");
    if(!app) return null;
    var panel = qs("#s666MobileStatusPanel", app);
    if(panel) return panel;
    panel = document.createElement("section");
    panel.id = "s666MobileStatusPanel";
    panel.hidden = true;
    panel.innerHTML = '<div class="s666-mobile-status-title"><span>PLAYER STATUS</span><button type="button" class="s666-mobile-status-back">← PLAYER</button></div><div class="s666-mobile-status-grid"><div class="s666-mobile-status-item" data-status-key="stream"><span>STREAM</span><i></i><b>CHECK</b></div><div class="s666-mobile-status-item" data-status-key="source"><span>SOURCE</span><i></i><b>MAIN</b></div><div class="s666-mobile-status-item" data-status-key="metadata"><span>METADATA</span><i></i><b>CHECK</b></div><div class="s666-mobile-status-item" data-status-key="worker"><span>WORKER</span><i></i><b>CHECK</b></div><div class="s666-mobile-status-item" data-status-key="audio"><span>AUDIO</span><i></i><b>CHECK</b></div><div class="s666-mobile-status-item" data-status-key="message"><span>MESSAGE</span><i></i><b>CHECK</b></div></div>';
    var anchor = qs("#s666MobileExtraRow", app) || qs(".mff-controls", app) || qs(".mff-now", app);
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else app.appendChild(panel);
    var back = qs(".s666-mobile-status-back", panel);
    if(back) back.addEventListener("click", returnToPlayer, true);
    return panel;
  }

  function setMobileStatus(panel, key, ok, text){
    var item = qs('[data-status-key="'+key+'"]', panel);
    if(!item) return;
    item.classList.remove("is-ok","is-warn");
    item.classList.add(ok ? "is-ok" : "is-warn");
    var value = qs("b", item); if(value) value.textContent = text;
  }

  async function openStatus(){
    var app = qs("#mffApp");
    var panel = ensureMobileStatusPanel();
    if(!app || !panel) return;
    app.setAttribute("data-s666-mobile-view","status");
    panel.hidden = false;
    var audio = getAudio();
    var src = String((audio && (audio.currentSrc || audio.getAttribute("src"))) || "");
    setMobileStatus(panel,"stream",!!(audio && !audio.paused),audio && !audio.paused ? "PLAY" : "READY");
    setMobileStatus(panel,"source",true,/fallback|backup/i.test(src) ? "BACK" : "MAIN");
    setMobileStatus(panel,"audio",!!audio,audio ? (audio.paused ? "READY" : "ACTIVE") : "ERROR");
    try{
      var health = await fetch("/health?t="+Date.now(),{cache:"no-store"});
      setMobileStatus(panel,"worker",health.ok,health.ok ? "ONLINE" : "ERROR");
    }catch(e){ setMobileStatus(panel,"worker",false,"ERROR"); }
    try{
      var meta = await fetch("/api/nowplaying?t="+Date.now(),{cache:"no-store"});
      setMobileStatus(panel,"metadata",meta.ok,meta.ok ? "ACTIVE" : "ERROR");
    }catch(e){ setMobileStatus(panel,"metadata",false,"ERROR"); }
    try{
      var msg = await fetch("/api/player-alert/status?t="+Date.now(),{cache:"no-store"});
      setMobileStatus(panel,"message",msg.ok,msg.ok ? "READY" : "ERROR");
    }catch(e){ setMobileStatus(panel,"message",false,"ERROR"); }
  }

  var mobileBottomMeterState = { started:false, smooth:0 };

  function mobileBottomMeterTick(){
    var box = qs("#s666MobileBottomSafe");
    var fill = box && qs(".s666-mobile-meterfill", box);
    if(!fill) return;
    var audio = getAudio();
    var bus = window.__MeterBus;
    var fresh = !!(bus && bus.source === "real" && typeof bus.level === "number" && Date.now() - Number(bus.ts || 0) < 700);
    var level = fresh && audio && !audio.paused ? Math.max(0, Math.min(1, Number(bus.level) || 0)) : 0;
    mobileBottomMeterState.smooth = mobileBottomMeterState.smooth*.72 + level*.28;
    if(level === 0 && mobileBottomMeterState.smooth < .01) mobileBottomMeterState.smooth = 0;
    fill.style.setProperty("width", "100%", "important");
    fill.style.setProperty("transform", "scaleX(" + mobileBottomMeterState.smooth.toFixed(4) + ")", "important");
    fill.style.setProperty("opacity", fresh ? "1" : ".32", "important");
    document.documentElement.setAttribute("data-mobile-bottom-meter-source", fresh ? "meterbus-real" : "real-unavailable");
  }

  function startMobileBottomMeter(){
    if(mobileBottomMeterState.started) return;
    mobileBottomMeterState.started = true;
    mobileBottomMeterTick();
    setInterval(mobileBottomMeterTick, 120);
  }

  function mountBottomSafe(){
    var app = qs("#mffApp");
    if(!app) return;
    var box = qs("#s666MobileBottomSafe");
    if(!box){
      box = document.createElement("div");
      box.id = "s666MobileBottomSafe";
      box.className = "s666-mobile-bottom-safe";
      box.innerHTML = '<div class="s666-mobile-copyline">666SOUNDsDESIGn WebRadio</div><div class="s666-mobile-meterline"><i class="s666-mobile-meterfill"></i></div>';
      document.body.appendChild(box);
    }
    box.style.setProperty("bottom", "max(var(--s666-safe-bottom), 6px)", "important");
    var fill = qs(".s666-mobile-meterfill", box);
    if(fill){
      fill.style.setProperty("width", "100%", "important");
      fill.style.setProperty("transform", "scaleX(0)", "important");
    }
    startMobileBottomMeter();
  }

  function bindEqTriggers(){
    // SOUND is opened only by the primary action button.
  }

  async function recoverAudio(reason){
    if(s666CentralAudioAuthorityActive() && typeof centralAudioGuardV2Recover === "function"){
      return centralAudioGuardV2Recover(reason || "manual-recovery-handoff");
    }
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
    pauseToleranceMs: 10000,
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
    var wasMarkedInstalled = !!window.__phase10PcMainBackupGuardInstalled;
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

    if(s666CanonicalRecoveryOwner()){
      document.documentElement.setAttribute("data-phase10-stream-guard","canonical-owner-sensor-only");
      return;
    }
    if(wasMarkedInstalled) return;

    setInterval(function(){
      if(!phase10IsDesktopPlayer()) return;
      var audio = getAudio();
      if(!audio) return;
      var src = String(audio.currentSrc || audio.getAttribute("src") || "");
      var isBackup = /fallback-stream|backup/i.test(src) || document.documentElement.getAttribute("data-phase10-stream-target") === "backup";
      if(isBackup && !phase10ManualStreamSwitchRecent()){
        if(s666LegacyRecoveryHandoff("phase10-pc-backup-guard","backup-detected")){
          document.documentElement.setAttribute("data-phase10-stream-guard","canonical-owner-handoff");
          return;
        }
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
    var legacyCard = qs("#phase10StatusLedCard");
    if(legacyCard) legacyCard.remove();

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
    var card = qs("#phase10StatusLedCard");
    if(card) card.remove();
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
      if(s666LegacyRecoveryHandoff("phase10-pc-directfix","backup-detected")){
        document.documentElement.setAttribute("data-phase10-pc-auto-fallback","canonical-owner-handoff");
        return;
      }
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
  function parityOpenStatus(){
    if(typeof openStatus === "function") return openStatus();
    try{ window.open("/api/discord/debug?t=" + Date.now(), "_blank"); } catch(e){ location.href="/api/discord/debug?t="+Date.now(); }
  }
  function parityMountMobileHub(){
    if(!parityIsMobile()) return;
    var app = qs("#mffApp") || qs(".player-shell") || document.body;
    if(qs("#s666MobileExtraRow") || qs("#s666ParityMobileHub")) return;
    var hub = document.createElement("div");
    hub.id = "s666ParityMobileHub";
    hub.className = "s666-parity-mobile-hub";
    hub.innerHTML = '<button type="button" data-parity-action="player">PLAYER</button><button type="button" data-parity-action="stream">STREAM</button><button type="button" data-parity-action="admin">ADMIN</button><button type="button" data-parity-action="status">STATUS</button>';
    var anchor = qs("#s666MobileExtraRow") || qs(".mobile-boost") || qs(".hero-label-row") || qs(".now-playing");
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(hub, anchor.nextSibling);
    else app.insertBefore(hub, app.firstChild);
    hub.addEventListener("click", function(ev){
      var btn = ev.target.closest && ev.target.closest("[data-parity-action]");
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation();
      parityRunMobileAction(btn.getAttribute("data-parity-action"), btn);
    }, true);
  }
  function parityRunMobileAction(action, btn){
    qsa("#s666ParityMobileHub button").forEach(function(b){ b.removeAttribute("data-active"); });
    if(btn) btn.setAttribute("data-active","1");
    if(action === "player") return returnToPlayer();
    if(action === "stream"){ if(typeof toggleMobileStream === "function") return toggleMobileStream(); return; }
    if(action === "sound") return parityOpenSound();
    if(action === "admin") return parityOpenAdmin();
    if(action === "status") return openStatus();
  }
  function parityBindMobileEqTriggers(){
    // SOUND is opened only by the primary action button.
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
    var rms = 0;
    var bus = window.__MeterBus;
    var busFresh = !!(bus && typeof bus.level === "number" && Date.now() - Number(bus.ts || 0) < 700);
    if(busFresh){
      rms = Math.max(0, Math.min(1, Number(bus.level) || 0));
    }else{
      [window.__mffLastRms,window.__mffRms,window.__smfpRms,window.__radioRms,window.__mffAudioLevel,window.__smfpAudioLevel,window.__lastAudioLevel].forEach(function(v){
        var n = Number(v);
        if(isFinite(n) && n > 0) rms = Math.max(rms, n > 1 ? n / 100 : n);
      });
    }
    var signalAvailable = !!(rms && rms >= .015);
    if(!signalAvailable){
      rms = 0;
      document.documentElement.setAttribute("data-side-meter-signal","real-unavailable");
    }else{
      document.documentElement.setAttribute("data-side-meter-signal", busFresh ? "meterbus-real" : "legacy-real-level");
    }
    var level = Math.max(0, Math.min(1, rms));
    sideMeterReactV1State.smooth = sideMeterReactV1State.smooth*.64 + level*.36;
    sideMeterReactV1State.peak = Math.max(sideMeterReactV1State.smooth, sideMeterReactV1State.peak*.88);
    return { level:sideMeterReactV1State.smooth, peak:sideMeterReactV1State.peak, running:!!(audio && !audio.paused && signalAvailable) };
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
    var heights = [
      Math.max(.20, Math.min(1.00, .38 + peak*.62)),
      Math.max(.16, Math.min(.86, .26 + base*.54)),
      Math.max(.12, Math.min(.70, .18 + base*.42))
    ];
    bars.forEach(function(bar,i){
      var h = Math.round(heights[i]*100);
      bar.style.height = h + "%";
      bar.style.minHeight = Math.max(14,h) + "%";
      bar.style.transform = "scaleY(1)";
      bar.style.opacity = String(Math.max(.48, Math.min(1, .52 + heights[i]*.55)));
      bar.style.filter = "saturate(1.10) brightness(" + (0.95 + heights[i]*.20).toFixed(2) + ")";
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


  // Legacy iPhone recovery guard removed by HARDLOCK v1.2.0.
  // CentralAudioStabilityGuardV2 is the single automatic recovery authority.

  // CENTRAL_AUDIO_STABILITY_GUARD_V2_20260530
  var centralAudioGuardV2 = {
    started:false, wanted:false, manualStopAt:0, lastTime:0, lastMoveAt:Date.now(), lastRecoverAt:0, step:0, escalation:0,
    pcProfile:{ pausedToleranceMs:12000, stallToleranceMs:36000, readyLowToleranceMs:22000, cooldownMs:18000 },
    mobileProfile:{ pausedToleranceMs:6500, stallToleranceMs:26000, readyLowToleranceMs:14000, cooldownMs:12000 }
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
    if(s666LegacyRecoveryHandoff("phase10-central-guard", reason || "phase10-recovery")) return;
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
    // v1.2.16: transport buttons are bound only in player-core.js; no capture listeners here.
    ["visibilitychange","pageshow","focus","online"].forEach(function(ev){window.addEventListener(ev,function(){var d=centralAudioGuardV2IsMobile()?1200:2800;setTimeout(function(){centralAudioGuardV2Recover(ev);},d);},true);});
    // v1.2.16: no document-wide click/touch resume. The real PLAY action owns iOS unlock.
    setInterval(centralAudioGuardV2Tick,2500);
    setTimeout(centralAudioGuardV2Tick,1600);
    document.documentElement.setAttribute("data-central-audio-stability-v2","installed");
  }
  function startIphoneAudioStabilityGuardV2(){ startCentralAudioStabilityGuardV2(); }

  // no-op Stubs: diese hardfix-Funktionen wurden aufgerufen aber nie definiert -> boot() warf ReferenceError und die gesamte Stabilitaets-Schicht (Recovery-Orchester, Gesten-Resume, EQ-Trigger) startete nie
    function hardfixInstallManualBackupFlag(){}
    function hardfixMoveLedsBehindDj(){}
    function hardfixTickerNoEmptyGap(){}
    function hardfixMessageBox(){}
    function hardfixForceMainOnlyPc(){}

    var phase10StreamSwitchLastTouchAt=0;
    function bindMobileStreamLedSwitch(){
      var app=qs("#mffApp");
      if(!app) return;
      var entries=[
        {led:"main",target:"main",canonical:"mainBtn"},
        {led:"backup",target:"backup",canonical:"fallbackBtn"}
      ];
      entries.forEach(function(entry){
        var btn=qs('#mffPanelLedPanel [data-led="'+entry.led+'"]',app);
        if(!btn) return;
        btn.classList.add("mff-stream-btn");
        btn.setAttribute("data-stream-target",entry.target);
        if(btn.__phase10StreamSwitchBound) return;
        btn.__phase10StreamSwitchBound=true;
        var handler=function(ev){
          if(ev.type==="touchend") phase10StreamSwitchLastTouchAt=Date.now();
          else if(ev.type==="click" && Date.now()-phase10StreamSwitchLastTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
          ev.preventDefault();
          ev.stopPropagation();
          var canonical=document.getElementById(entry.canonical);
          if(canonical) tap(canonical,"mobile-"+entry.target+"-stream");
          document.documentElement.setAttribute("data-manual-stream-target",entry.target);
          qsa('#mffPanelLedPanel [data-stream-target]',app).forEach(function(other){
            var active=other.getAttribute("data-stream-target")===entry.target;
            other.classList.toggle("is-active",active);
            other.setAttribute("aria-pressed",active?"true":"false");
          });
        };
        btn.addEventListener("click",handler,{capture:true});
        btn.addEventListener("touchend",handler,{capture:true,passive:false});
      });
      var current=document.documentElement.getAttribute("data-manual-stream-target")||"main";
      qsa('#mffPanelLedPanel [data-stream-target]',app).forEach(function(btn){
        var active=btn.getAttribute("data-stream-target")===current;
        btn.classList.toggle("is-active",active);
        btn.setAttribute("aria-pressed",active?"true":"false");
      });
    }

    function phase10IsMobileAudioDevice(){ return /iphone|ipad|ipod|android/i.test(navigator.userAgent||"") || (window.innerWidth||9999) <= 860; }
    function boot(){
      mountHudLogo();
    hardfixInstallManualBackupFlag();
    hardfixMoveLedsBehindDj();
    hardfixTickerNoEmptyGap();
    hardfixMessageBox();
    hardfixForceMainOnlyPc();
    document.documentElement.setAttribute("data-phase10-legacy-ui-owner","demoted");
    iphonePcParityV1();
    startIphoneAudioStabilityGuardV2();
    directfixRestoreStatusLeds();
    installPcMainBackupGuard();
    directfixPcNoAutoFallback();
    mountMobilePanelRow();
    bindMobileStreamLedSwitch();
    bindEqTriggers();
    installAudioFocusGuard();
    normalizeBoostStatusTooltip();
    // Stable maintenance only: do not relocate or delete layout nodes after first render.
    setInterval(function(){
      mountMobilePanelRow();
      bindMobileStreamLedSwitch();
      bindEqTriggers();
        installAudioFocusGuard();
      normalizeBoostStatusTooltip();
      hardfixInstallManualBackupFlag();
    }, 5000);
    document.documentElement.setAttribute("data-phase10-stability", VERSION);
  }

  window.S666Phase10 = { toggleMobileStream:toggleMobileStream, recoverAudio:recoverAudio, openSoundControl:openSoundControl, openAdmin:openAdmin, version:VERSION };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
