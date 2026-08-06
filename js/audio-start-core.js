/*
==========================================
DATEI: js/audio-start-core.js
VERSION: v1.2.17
ZWECK:
- Ein zentraler, iPhone-sicherer Audio-Startablauf für 666 PLAYER und VELUNA.
- Native HTMLAudioElement-Wiedergabe wird direkt gestartet.
- WebAudio/DSP wird erst nach erfolgreichem Play durch den jeweiligen Player aktiviert.
- Keine EQ-, Booster-, Limiter- oder Visualizer-Logik in dieser Datei.
==========================================
*/
(function installS666AudioStartCore(global) {
  'use strict';

  if (global.S666AudioStartCore) return;

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

/*
==========================================
S666 Discord Direct Settings Race Guard v1
- Separate from audio start logic.
- Locks local Discord destination controls during a direct webhook request.
- Detects same-tab and cross-tab settings changes while delivery is in flight.
- Forces one current-track retry when the delivered webhook no longer matches
  the then-current AUTO NOW PLAYING webhook.
- Webhook values remain lexical and are never logged, dispatched or exported.
==========================================
*/
(function installS666DiscordDirectSettingsRaceGuard(global) {
  'use strict';

  if (global.S666DiscordDirectSettingsRaceGuard) return;
  if (typeof global.fetch !== 'function') return;

  const STORAGE_KEY = 's666_discord_direct_v1';
  const CONTROL_SELECTOR = [
    '#s666DiscordTargetSelect',
    '#s666DiscordAutoTarget',
    '[data-direct-label]',
    '[data-direct-webhook]',
    '[data-discord-settings-save]',
    '[data-discord-settings-clear]',
    '[data-discord-settings-toggle]'
  ].join(',');
  const originalFetch = global.fetch.bind(global);
  const storagePrototype = global.Storage && global.Storage.prototype;
  const originalSetItem = storagePrototype && storagePrototype.setItem;
  let directRequestCount = 0;
  let settingsChangedDuringDelivery = false;
  let controlObserver = null;
  let retryTimer = 0;

  function normalizeWebhook(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, global.location && global.location.href || undefined);
      const host = String(url.hostname || '').toLowerCase();
      if (url.protocol !== 'https:' || !/(^|\.)discord(?:app)?\.com$/.test(host)) return '';
      if (!/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) return '';
      return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
    } catch (_) {
      return '';
    }
  }

  function isNowPlayingPayload(init) {
    try {
      const body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
      return Boolean(body && Array.isArray(body.embeds) && body.embeds.some((embed) =>
        embed && String(embed.title || '').trim().toUpperCase() === 'NOW PLAYING'
      ));
    } catch (_) {
      return false;
    }
  }

  function requestWebhook(input, init) {
    if (!isNowPlayingPayload(init)) return '';
    try {
      const raw = typeof input === 'string' || input instanceof URL
        ? String(input)
        : String(input && input.url || '');
      return normalizeWebhook(raw);
    } catch (_) {
      return '';
    }
  }

  function currentAutoWebhook() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.categories)) return '';
      const autoTarget = String(parsed.autoTarget || 'main');
      const category = parsed.categories.find((item) => item && String(item.id || '') === autoTarget);
      return normalizeWebhook(category && category.webhook || '');
    } catch (_) {
      return '';
    }
  }

  function markControls(disabled) {
    if (!global.document || typeof global.document.querySelectorAll !== 'function') return;
    global.document.querySelectorAll(CONTROL_SELECTOR).forEach((control) => {
      if (!control || !('disabled' in control)) return;
      if (disabled) {
        if (!control.hasAttribute('data-s666-race-guard-disabled')) {
          control.setAttribute('data-s666-race-guard-disabled', control.disabled ? '1' : '0');
        }
        control.disabled = true;
      } else if (control.hasAttribute('data-s666-race-guard-disabled')) {
        control.disabled = control.getAttribute('data-s666-race-guard-disabled') === '1';
        control.removeAttribute('data-s666-race-guard-disabled');
      }
    });
  }

  function startControlGuard() {
    markControls(true);
    if (controlObserver || typeof global.MutationObserver !== 'function' || !global.document) return;
    controlObserver = new global.MutationObserver(() => {
      if (directRequestCount > 0) markControls(true);
    });
    const root = global.document.documentElement || global.document;
    controlObserver.observe(root, { childList: true, subtree: true });
  }

  function stopControlGuard() {
    if (controlObserver) controlObserver.disconnect();
    controlObserver = null;
    markControls(false);
  }

  function retryCurrentAutomaticTarget(attempt) {
    const api = global.S666DiscordPlayerAddonV3;
    if (!api || typeof api.postTrackIfChanged !== 'function') return;
    Promise.resolve(api.postTrackIfChanged(true, 'settings-race-retry')).then((result) => {
      if (result && result.busy && attempt < 4) {
        retryTimer = global.setTimeout(() => retryCurrentAutomaticTarget(attempt + 1), 180);
      }
    }).catch(() => {});
  }

  function settleDirectRequest(deliveredWebhook, accepted) {
    directRequestCount = Math.max(0, directRequestCount - 1);
    if (directRequestCount === 0) stopControlGuard();
    global.setTimeout(() => {
      const currentWebhook = currentAutoWebhook();
      const mustRetry = Boolean(
        accepted &&
        settingsChangedDuringDelivery &&
        currentWebhook &&
        deliveredWebhook &&
        currentWebhook !== deliveredWebhook
      );
      if (directRequestCount === 0) settingsChangedDuringDelivery = false;
      if (!mustRetry) return;
      global.clearTimeout(retryTimer);
      retryTimer = global.setTimeout(() => retryCurrentAutomaticTarget(0), 40);
    }, 0);
  }

  global.fetch = function s666DiscordRaceGuardedFetch(input, init) {
    const deliveredWebhook = requestWebhook(input, init);
    if (!deliveredWebhook) return originalFetch(input, init);
    directRequestCount += 1;
    startControlGuard();
    let request;
    try {
      request = originalFetch(input, init);
    } catch (error) {
      settleDirectRequest(deliveredWebhook, false);
      throw error;
    }
    return Promise.resolve(request).then((response) => {
      settleDirectRequest(deliveredWebhook, Boolean(response && response.ok));
      return response;
    }, (error) => {
      settleDirectRequest(deliveredWebhook, false);
      throw error;
    });
  };

  if (originalSetItem) {
    storagePrototype.setItem = function s666DiscordRaceGuardedSetItem(key, value) {
      if (directRequestCount > 0 && String(key) === STORAGE_KEY) settingsChangedDuringDelivery = true;
      return originalSetItem.call(this, key, value);
    };
  }

  global.addEventListener('storage', (event) => {
    if (directRequestCount > 0 && event && event.key === STORAGE_KEY) settingsChangedDuringDelivery = true;
  });

  global.S666DiscordDirectSettingsRaceGuard = Object.freeze({
    version: '1.0.0',
    active: () => directRequestCount > 0
  });
})(window);
