/*
==========================================
DATEI: js/audio-start-core.js
VERSION: v1.2.24
ZWECK:
- Ein zentraler, iPhone-sicherer Audio-Startablauf für 666 PLAYER und VELUNA.
- Native HTMLAudioElement-Wiedergabe wird direkt gestartet.
- WebAudio/DSP wird erst nach erfolgreichem Play durch den jeweiligen Player aktiviert.
- Keine EQ-, Booster-, Limiter- oder Visualizer-Logik in dieser Datei.
- v1.2.18: keine doppelten load()-Zyklen bei reset:false; Foreground-/Suspend-Recovery bleibt bei gleicher Stream-URL soft.
- v1.2.18: Main lädt den bestehenden Central-Boot-Owner bereits im frühen Head-Pfad vor.
- v1.2.19: frühe Recovery-Authority verhindert, dass der alte Phase10-PC-Backup-Guard oder AudioFocus-Fallback vor dem kanonischen Recovery-Owner einen zweiten pause/src/load-Pfad startet.
- v1.2.20: Browser-Sensoren (focus/pageshow/visibility/suspend/stalled/interrupted) dürfen keinen harten Transport-Reset mehr auslösen; sie delegieren an den kanonischen Recovery-Owner. Ein überholter Startrequest darf einen bereits neueren Start nicht mehr pausieren.
- v1.2.21: alte Phase10-CSS-Ausblendung von STR/SRC/MTR wird im Main-Header neutralisiert; bestehende Status-Owner und H/B-Aktionen bleiben unverändert.
- v1.2.22: stale/cancelled Startrequests dürfen das gemeinsame Audioelement niemals pausieren; echter Stop/Pause bleibt ausschließlich beim jeweiligen Transport-Owner.
- v1.2.23: Main-Cyberboot erhält einen frühen Pre-Paint-Lock. Desktop-Frame und Mobile-MFF werden erst nach Entfernung des einmal gesehenen Central-Boot-Owners sichtbar; Failsafe verhindert einen hängenbleibenden schwarzen Screen.
- v1.2.24: der Main-Cyberboot-Owner startet erst nach vorhandenem document.body. Während Preflight ist der komplette normale Body verborgen; nur der Central Boot darf sichtbar sein. Fehlt dessen Mount nach 1.5 s, wird der Player fail-open vollständig freigegeben statt als halber Zwischenzustand stehenzubleiben.
==========================================
*/
(function installS666AudioStartCore(global) {
  'use strict';

  if (global.S666AudioStartCore) return;

  function seedCanonicalRecoveryAuthority() {
    try {
      const CANONICAL_OWNER = 'all-player-audio-recovery-v1';
      const LEGACY_COMPAT_OWNER = 'central-audio-guard-v2';
      global.S666_AUDIO_AUTHORITY = Object.assign({}, global.S666_AUDIO_AUTHORITY || {}, {
        transport: 'player-owned',
        recovery: LEGACY_COMPAT_OWNER,
        canonicalRecovery: CANONICAL_OWNER,
        legacyRecoveryMuted: true
      });
      global.__phase10PcMainBackupGuardInstalled = true;
      global.__phase10PcDirectfixAutoResetDemoted = true;
      const healingOrchestra = global.S666_AUDIO_HEALING_ORCHESTRA = global.S666_AUDIO_HEALING_ORCHESTRA || {};
      healingOrchestra.owner = CANONICAL_OWNER;
      healingOrchestra.active = true;
      healingOrchestra.lastRecoveryAt = Infinity;
      document.documentElement?.setAttribute('data-audio-early-recovery-authority', CANONICAL_OWNER);
      document.documentElement?.setAttribute('data-phase10-pc-backup-auto-guard', 'demoted');
    } catch (_) {}
  }
  seedCanonicalRecoveryAuthority();

  function restoreCanonicalTopPanelStatusChips() {
    const apply = () => {
      for (const id of ['statusStream','statusSource','statusMeter']) {
        try {
          const chip = document.getElementById(id);
          if (chip) chip.style.setProperty('display', 'inline-flex', 'important');
        } catch (_) {}
      }
      try { document.documentElement?.setAttribute('data-top-status-visibility', 'canonical'); } catch (_) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
  }
  restoreCanonicalTopPanelStatusChips();

  function installEarlyMainCentralBoot() {
    try {
      const path = String(global.location?.pathname || '/').toLowerCase();
      if (path !== '/' && path !== '/index.html') return;
      const head = document.head || document.documentElement;
      if (!head) return;

      const html = document.documentElement;
      let bootSeen = Boolean(document.getElementById('s666CentralBoot'));
      let released = false;
      let failSafeTimer = 0;
      let bootMountTimer = 0;
      let observer = null;

      const releasePreflight = (reason) => {
        if (released) return;
        released = true;
        try { global.clearTimeout(failSafeTimer); } catch (_) {}
        try { global.clearTimeout(bootMountTimer); } catch (_) {}
        try { observer?.disconnect(); } catch (_) {}
        try {
          html.classList.remove('s666-main-boot-preflight');
          html.setAttribute('data-main-boot-preflight', String(reason || 'released'));
        } catch (_) {}
      };

      if (!document.getElementById('s666MainBootPreflightStyle')) {
        const style = document.createElement('style');
        style.id = 's666MainBootPreflightStyle';
        style.textContent = 'html.s666-main-boot-preflight body{background:#020006!important}html.s666-main-boot-preflight body>*{visibility:hidden!important}html.s666-main-boot-preflight body>#s666CentralBoot{visibility:visible!important}html.s666-main-boot-preflight #s666CentralBoot,html.s666-main-boot-preflight #s666CentralBoot *{visibility:visible!important}';
        head.appendChild(style);
      }
      html.classList.add('s666-main-boot-preflight');
      html.setAttribute('data-main-boot-preflight', 'armed');

      const inspectBootLifecycle = () => {
        if (released) return;
        const boot = document.getElementById('s666CentralBoot');
        if (boot) {
          bootSeen = true;
          try { global.clearTimeout(bootMountTimer); } catch (_) {}
          html.setAttribute('data-main-boot-preflight', 'boot-visible');
          return;
        }
        if (bootSeen) releasePreflight('boot-handoff-complete');
      };

      try {
        observer = new MutationObserver(() => global.setTimeout(inspectBootLifecycle, 0));
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } catch (_) {}
      failSafeTimer = global.setTimeout(() => releasePreflight('failsafe-release'), 9000);

      const cssBase = '/css/central-boot-screen.css';
      if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => String(link.getAttribute('href') || '').includes(cssBase))) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssBase + '?v=20260903-main-boot-body-mount-v2';
        link.dataset.s666MainEarlyBoot = 'css';
        head.appendChild(link);
      }

      const startBootOwner = () => {
        if (released) return;
        html.setAttribute('data-main-boot-preflight', 'starting-boot-owner');
        bootMountTimer = global.setTimeout(() => {
          if (!bootSeen && !document.getElementById('s666CentralBoot')) releasePreflight('boot-mount-timeout');
        }, 1500);

        if (global.S666CentralBootScreen) {
          try { global.S666CentralBootScreen.bootOnce?.(); } catch (_) { releasePreflight('boot-owner-error'); }
          inspectBootLifecycle();
          return;
        }
        const jsBase = '/js/central-boot-screen.js';
        const existing = Array.from(document.scripts).find(script => String(script.src || '').includes(jsBase));
        if (existing) {
          if (global.S666CentralBootScreen) {
            try { global.S666CentralBootScreen.bootOnce?.(); } catch (_) { releasePreflight('boot-owner-error'); }
            inspectBootLifecycle();
            return;
          }
          if (existing.dataset.s666MainBootBodyBound !== '1') {
            existing.dataset.s666MainBootBodyBound = '1';
            existing.addEventListener('load', () => {
              try { global.S666CentralBootScreen?.bootOnce?.(); } catch (_) { releasePreflight('boot-owner-error'); }
              inspectBootLifecycle();
            }, { once: true });
            existing.addEventListener('error', () => releasePreflight('boot-script-error'), { once: true });
          }
          return;
        }
        const script = document.createElement('script');
        script.src = jsBase + '?v=20260903-main-boot-body-mount-v2';
        script.async = false;
        script.defer = false;
        script.dataset.s666MainEarlyBoot = 'js';
        script.addEventListener('load', () => {
          try { global.S666CentralBootScreen?.bootOnce?.(); } catch (_) { releasePreflight('boot-owner-error'); }
          inspectBootLifecycle();
        }, { once: true });
        script.addEventListener('error', () => releasePreflight('boot-script-error'), { once: true });
        head.appendChild(script);
      };

      if (document.readyState === 'loading' || !document.body) {
        document.addEventListener('DOMContentLoaded', startBootOwner, { once: true });
      } else {
        startBootOwner();
      }
    } catch (_) {
      try { document.documentElement?.classList.remove('s666-main-boot-preflight'); } catch (_) {}
    }
  }
  installEarlyMainCentralBoot();

  function withTimeout(promise, timeoutMs, label) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = global.setTimeout(() => reject(new Error(label || 'audio_play_timeout')), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => global.clearTimeout(timer));
  }

  function create(options) {
    const audio = options && options.audio;
    if (!audio || typeof audio.play !== 'function') {
      throw new Error('audio_start_core_requires_audio_element');
    }

    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 9000);
    const softResumeReasons = new Set(['focus','pageshow','visibility','visible','suspend','stalled','interrupted','system-interruption']);
    let requestToken = 0;

    function currentToken() {
      return requestToken;
    }

    function cancel() {
      requestToken += 1;
      return requestToken;
    }

    function isCurrent(token) {
      return token === requestToken;
    }

    function sameTarget(target) {
      const attr = String(audio.getAttribute('src') || '').trim();
      const current = String(audio.currentSrc || '').trim();
      if (attr === target) return true;
      if (!current) return false;
      try {
        return new URL(current, global.location?.href).href === new URL(target, global.location?.href).href;
      } catch (_) {
        return current === target;
      }
    }

    function handoffAutomaticRecovery(why) {
      try {
        const owner = global.S666AllPlayerAudioRecovery;
        if (owner && owner.owner === 'all-player-audio-recovery-v1' && typeof owner.legacyHandoff === 'function') {
          owner.legacyHandoff(why || 'audio-start-core-sensor');
          return true;
        }
      } catch (_) {}
      return false;
    }

    function reset(target, reason, beforeReset) {
      const why = String(reason || 'play').toLowerCase();
      if (softResumeReasons.has(why)) {
        handoffAutomaticRecovery(why);
        try {
          audio.dataset.audioStartReason = why;
          audio.dataset.audioStartState = sameTarget(target) ? 'resume-prepared' : 'sensor-handoff';
        } catch (_) {}
        return;
      }

      if (typeof beforeReset === 'function') {
        try { beforeReset(reason); } catch (_) {}
      }
      try { audio.pause(); } catch (_) {}
      try { audio.removeAttribute('src'); } catch (_) {}
      try { audio.load(); } catch (_) {}
      try { audio.src = target; } catch (_) {}
      try { audio.load(); } catch (_) {}
      try {
        audio.dataset.audioStartReason = String(reason || 'play');
        audio.dataset.audioStartState = 'prepared';
      } catch (_) {}
    }

    async function start(config) {
      const target = String(config && config.target || '').trim();
      if (!target) throw new Error('audio_start_target_missing');

      const token = ++requestToken;
      const reason = config && config.reason || 'play';
      const shouldReset = !config || config.reset !== false;

      if (shouldReset) {
        reset(target, reason, config && config.beforeReset);
      } else if (!sameTarget(target)) {
        audio.src = target;
        try { audio.load(); } catch (_) {}
      }

      if (config && Object.prototype.hasOwnProperty.call(config, 'muted')) {
        audio.muted = Boolean(config.muted);
      }

      let playPromise;
      try {
        playPromise = audio.play();
        audio.dataset.audioStartState = 'play-requested';
      } catch (error) {
        audio.dataset.audioStartState = 'play-threw';
        throw error;
      }

      await withTimeout(Promise.resolve(playPromise), timeoutMs, 'audio_play_timeout');

      if (!isCurrent(token)) {
        audio.dataset.audioStartState = 'stale-superseded';
        throw new Error('stale_play_request');
      }
      if (config && typeof config.isStopped === 'function' && config.isStopped()) {
        audio.dataset.audioStartState = 'stale-stopped';
        throw new Error('stale_play_request');
      }

      audio.dataset.audioStartState = 'playing';
      return { token, target, reason };
    }

    return Object.freeze({ start, cancel, isCurrent, currentToken, reset });
  }

  global.S666AudioStartCore = Object.freeze({ create });
})(window);
