/*
==========================================
DATEI: js/audio-start-core.js
VERSION: v1.2.19
ZWECK:
- Ein zentraler, iPhone-sicherer Audio-Startablauf für 666 PLAYER und VELUNA.
- Native HTMLAudioElement-Wiedergabe wird direkt gestartet.
- WebAudio/DSP wird erst nach erfolgreichem Play durch den jeweiligen Player aktiviert.
- Keine EQ-, Booster-, Limiter- oder Visualizer-Logik in dieser Datei.
- v1.2.18: keine doppelten load()-Zyklen bei reset:false; Foreground-/Suspend-Recovery bleibt bei gleicher Stream-URL soft.
- v1.2.18: Main lädt den bestehenden Central-Boot-Owner bereits im frühen Head-Pfad vor.
- v1.2.19: frühe Recovery-Authority verhindert, dass der alte Phase10-PC-Backup-Guard oder AudioFocus-Fallback vor dem kanonischen Recovery-Owner einen zweiten pause/src/load-Pfad startet.
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
      document.documentElement?.setAttribute('data-audio-early-recovery-authority', CANONICAL_OWNER);
      document.documentElement?.setAttribute('data-phase10-pc-backup-auto-guard', 'demoted');
    } catch (_) {}
  }
  seedCanonicalRecoveryAuthority();

  function installEarlyMainCentralBoot() {
    try {
      const path = String(global.location?.pathname || '/').toLowerCase();
      if (path !== '/' && path !== '/index.html') return;
      const head = document.head || document.documentElement;
      if (!head) return;

      const cssBase = '/css/central-boot-screen.css';
      if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => String(link.getAttribute('href') || '').includes(cssBase))) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssBase + '?v=20260825-main-early-boot-v1';
        link.dataset.s666MainEarlyBoot = 'css';
        head.appendChild(link);
      }

      if (global.S666CentralBootScreen) {
        global.S666CentralBootScreen.bootOnce?.();
        return;
      }
      const jsBase = '/js/central-boot-screen.js';
      if (Array.from(document.scripts).some(script => String(script.src || '').includes(jsBase))) return;
      const script = document.createElement('script');
      script.src = jsBase + '?v=20260825-main-early-boot-v1';
      script.async = false;
      script.defer = false;
      script.dataset.s666MainEarlyBoot = 'js';
      head.appendChild(script);
    } catch (_) {}
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

    function reset(target, reason, beforeReset) {
      const why = String(reason || 'play').toLowerCase();
      if (softResumeReasons.has(why) && sameTarget(target)) {
        try {
          audio.dataset.audioStartReason = why;
          audio.dataset.audioStartState = 'resume-prepared';
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

      if (!isCurrent(token) || (config && typeof config.isStopped === 'function' && config.isStopped())) {
        try { audio.pause(); } catch (_) {}
        audio.dataset.audioStartState = 'stale';
        throw new Error('stale_play_request');
      }

      audio.dataset.audioStartState = 'playing';
      return { token, target, reason };
    }

    return Object.freeze({ start, cancel, isCurrent, currentToken, reset });
  }

  global.S666AudioStartCore = Object.freeze({ create });
})(window);
