/*
==========================================
DATEI: js/audio-start-core.js
VERSION: v1.2.18
ZWECK:
- Ein zentraler, iPhone-sicherer Audio-Startablauf für 666 PLAYER und VELUNA.
- Native HTMLAudioElement-Wiedergabe wird direkt gestartet.
- WebAudio/DSP wird erst nach erfolgreichem Play durch den jeweiligen Player aktiviert.
- Keine EQ-, Booster-, Limiter- oder Visualizer-Logik in dieser Datei.
- Lädt den zentralen Radio-Bootscreen für alle Player, die diesen bestehenden Core verwenden.
==========================================
*/
(function installS666AudioStartCore(global) {
  'use strict';

  if (global.S666AudioStartCore) return;

  // CENTRAL_RADIO_BOOT_OWNER_v1
  // Bestehenden gemeinsamen Player-Startpunkt verwenden statt Bootscreen-Kopien pro Player.
  (function ensureCentralRadioBootScreen() {
    if (global.S666CentralBootScreen || document.querySelector('script[data-s666-central-boot-loader]')) return;
    const script = document.createElement('script');
    script.src = '/js/central-boot-screen.js?v=20260809-radio-v1';
    script.async = false;
    script.dataset.s666CentralBootLoader = '1';
    (document.head || document.documentElement).appendChild(script);
  })();

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

    function reset(target, reason, beforeReset) {
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
      } else {
        if (audio.getAttribute('src') !== target) audio.src = target;
        try { audio.load(); } catch (_) {}
      }

      if (config && Object.prototype.hasOwnProperty.call(config, 'muted')) {
        audio.muted = Boolean(config.muted);
      }

      let playPromise;
      try {
        // Wichtig: play() ohne vorgeschaltetes await auslösen.
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
