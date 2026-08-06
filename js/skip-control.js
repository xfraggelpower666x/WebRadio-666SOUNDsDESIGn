/*
 * 666SOUNDsDESIGn authoritative Auto-DJ skip controller.
 * All players delegate interactive auth and the protected API request to this module.
 */
(function () {
  'use strict';
  if (window.S666SkipControl) return;

  var inFlight = false;

  function dispatch(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:skip-state', { detail: detail || {} })); } catch (_) {}
  }

  function normalizeError(response, data) {
    if (data && (data.retryAfterMs || data.remainingMs)) return 'Skip-Cooldown: ' + Math.max(1, Math.ceil(Number(data.retryAfterMs || data.remainingMs) / 1000)) + ' s';
    var code = String((data && (data.error || data.message)) || (response ? 'HTTP ' + response.status : 'skip_failed'));
    var messages = {
      myidj_admin_token_missing: 'MyIDJ-Worker-Token fehlt im Haupt-Worker. Das Player-Passwort ist nicht die Ursache.',
      myidj_admin_token_rejected: 'MyIDJ-Worker-Token wurde abgelehnt. ADMIN_TOKEN und MYIDJ_WORKER_ADMIN_TOKEN müssen übereinstimmen.',
      skip_target_not_configured: 'Der MyIDJ-Worker hat kein gültiges Shoutcast-Skip-Ziel konfiguriert.',
      myidj_skip_unreachable: 'Der zentrale MyIDJ-Skip-Worker ist nicht erreichbar.',
      myidj_skip_timeout: 'Der zentrale MyIDJ-Skip-Worker antwortet nicht rechtzeitig.',
      myidj_worker_exception: 'Der zentrale MyIDJ-Skip-Worker meldet einen internen Fehler.'
    };
    return messages[code] || code;
  }

  async function ensureInteractiveAuth(options) {
    options = options || {};
    if (!window.S666AdminAuth || typeof window.S666AdminAuth.ensure !== 'function') {
      throw new Error('admin_auth_client_missing');
    }
    return window.S666AdminAuth.ensure({
      message: options.prompt || 'Player-Admin-Passwort für Auto-DJ Skip eingeben (nicht Shoutcast-Login):'
    });
  }

  async function check(force) {
    if (!window.S666AdminAuth) return { ok: false, error: 'admin_auth_client_missing' };
    return window.S666AdminAuth.check(Boolean(force));
  }

  async function postViaAdminAuth(path, payload) {
    var response = await window.S666AdminAuth.fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(payload || {})
    });
    var data = await response.json().catch(function () { return {}; });
    return { response: response, data: data };
  }

  async function skip(options) {
    options = options || {};
    if (inFlight) return { ok: false, error: 'skip_in_flight' };
    if (!window.S666AdminAuth) return { ok: false, error: 'admin_auth_client_missing' };

    inFlight = true;
    dispatch({ phase: 'auth' });
    try {
      if (options.ensureAuth !== false) await ensureInteractiveAuth(options);
      dispatch({ phase: 'sending' });
      var payload = { source: options.source || 'player-stage-v2' };
      var result = await postViaAdminAuth('/api/admin/skip', payload);
      var response = result.response;
      var data = result.data;

      if ((!response.ok || data.ok !== true) && (data.error === 'skip_not_configured' || data.error === 'skip_upstream_unreachable' || data.error === 'skip_timeout')) {
        result = await postViaAdminAuth('/api/radio/skip', Object.assign({}, payload, { fallback: 'myidj-compat' }));
        response = result.response;
        data = result.data;
      }

      if (!response.ok || data.ok !== true) {
        var error = normalizeError(response, data);
        dispatch({ phase: 'error', error: error, status: response.status });
        return { ok: false, error: error, status: response.status, data: data };
      }
      dispatch({ phase: 'success', data: data });
      return { ok: true, data: data };
    } catch (error) {
      var message = error && error.message ? error.message : 'skip_unreachable';
      dispatch({ phase: 'error', error: message });
      return { ok: false, error: message };
    } finally {
      inFlight = false;
    }
  }

  window.S666SkipControl = {
    check: check,
    ensure: ensureInteractiveAuth,
    skip: skip,
    isBusy: function () { return inFlight; }
  };
})();

/*
 * S666 Discord Direct Settings Race Guard v2.
 * Separate from skip behavior; loaded before the Discord addon on every supported player.
 * Direct NOW PLAYING destinations stay locked until the response body settles.
 * Same-tab and cross-tab setting changes trigger bounded delivery to the current AUTO target.
 * Webhook values stay lexical and are never logged, dispatched or exported.
 */
(function installS666DiscordDirectSettingsRaceGuard(global) {
  'use strict';

  if (global.S666DiscordDirectSettingsRaceGuard) return;
  if (typeof global.fetch !== 'function') return;

  var STORAGE_KEY = 's666_discord_direct_v1';
  var RETRY_WINDOW_MS = 18000;
  var RETRY_DELAY_MS = 250;
  var BODY_FALLBACK_MS = 18000;
  var CONTROL_SELECTOR = [
    '#s666DiscordTargetSelect',
    '#s666DiscordAutoTarget',
    '[data-direct-label]',
    '[data-direct-webhook]',
    '[data-discord-settings-save]',
    '[data-discord-settings-clear]',
    '[data-discord-settings-toggle]'
  ].join(',');
  var originalFetch = global.fetch.bind(global);
  var storagePrototype = global.Storage && global.Storage.prototype;
  var originalSetItem = storagePrototype && storagePrototype.setItem;
  var directRequestCount = 0;
  var settingsChangedDuringDelivery = false;
  var controlObserver = null;
  var retryTimer = 0;

  function normalizeWebhook(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    try {
      var url = new URL(raw, global.location && global.location.href || undefined);
      var host = String(url.hostname || '').toLowerCase();
      if (url.protocol !== 'https:' || !/(^|\.)discord(?:app)?\.com$/.test(host)) return '';
      if (!/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) return '';
      return url.origin + url.pathname.replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function isNowPlayingPayload(init) {
    try {
      var body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
      return Boolean(body && Array.isArray(body.embeds) && body.embeds.some(function (embed) {
        return embed && String(embed.title || '').trim().toUpperCase() === 'NOW PLAYING';
      }));
    } catch (_) {
      return false;
    }
  }

  function requestWebhook(input, init) {
    if (!isNowPlayingPayload(init)) return '';
    try {
      var raw = typeof input === 'string' || input instanceof URL
        ? String(input)
        : String(input && input.url || '');
      return normalizeWebhook(raw);
    } catch (_) {
      return '';
    }
  }

  function currentAutoWebhook() {
    try {
      var parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.categories)) return '';
      var autoTarget = String(parsed.autoTarget || 'main');
      var category = parsed.categories.find(function (item) {
        return item && String(item.id || '') === autoTarget;
      });
      return normalizeWebhook(category && category.webhook || '');
    } catch (_) {
      return '';
    }
  }

  function markControls(disabled) {
    if (!global.document || typeof global.document.querySelectorAll !== 'function') return;
    global.document.querySelectorAll(CONTROL_SELECTOR).forEach(function (control) {
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
    controlObserver = new global.MutationObserver(function () {
      if (directRequestCount > 0) markControls(true);
    });
    var root = global.document.documentElement || global.document;
    controlObserver.observe(root, { childList: true, subtree: true });
  }

  function stopControlGuard() {
    if (controlObserver) controlObserver.disconnect();
    controlObserver = null;
    markControls(false);
  }

  function retryCurrentAutomaticTarget(deadline) {
    if (Date.now() > deadline) return;
    var api = global.S666DiscordPlayerAddonV3;
    if (!api || typeof api.postTrackIfChanged !== 'function') {
      retryTimer = global.setTimeout(function () { retryCurrentAutomaticTarget(deadline); }, RETRY_DELAY_MS);
      return;
    }
    Promise.resolve(api.postTrackIfChanged(true, 'settings-race-retry')).then(function (result) {
      if (result && result.busy && Date.now() <= deadline) {
        retryTimer = global.setTimeout(function () { retryCurrentAutomaticTarget(deadline); }, RETRY_DELAY_MS);
      }
    }).catch(function () {});
  }

  function scheduleCurrentAutomaticRetry() {
    global.clearTimeout(retryTimer);
    var deadline = Date.now() + RETRY_WINDOW_MS;
    retryTimer = global.setTimeout(function () { retryCurrentAutomaticTarget(deadline); }, 40);
  }

  function settleDirectRequest(deliveredWebhook, accepted) {
    directRequestCount = Math.max(0, directRequestCount - 1);
    if (directRequestCount === 0) stopControlGuard();
    global.setTimeout(function () {
      var currentWebhook = currentAutoWebhook();
      var mustRetry = Boolean(
        accepted &&
        settingsChangedDuringDelivery &&
        currentWebhook &&
        deliveredWebhook &&
        currentWebhook !== deliveredWebhook
      );
      if (directRequestCount === 0) settingsChangedDuringDelivery = false;
      if (mustRetry) scheduleCurrentAutomaticRetry();
    }, 0);
  }

  function wrapResponseBody(response, deliveredWebhook) {
    var settled = false;
    var fallbackTimer = global.setTimeout(function () {
      finish(Boolean(response && response.ok));
    }, BODY_FALLBACK_MS);

    function finish(accepted) {
      if (settled) return;
      settled = true;
      global.clearTimeout(fallbackTimer);
      settleDirectRequest(deliveredWebhook, accepted);
    }

    var bodyMethods = ['json', 'text', 'arrayBuffer', 'blob', 'formData'];
    return new Proxy(response, {
      get: function (target, property) {
        if (bodyMethods.indexOf(String(property)) >= 0 && typeof target[property] === 'function') {
          return function () {
            var bodyPromise;
            try {
              bodyPromise = target[property].apply(target, arguments);
            } catch (error) {
              finish(false);
              throw error;
            }
            return Promise.resolve(bodyPromise).then(function (value) {
              finish(Boolean(target.ok));
              return value;
            }, function (error) {
              finish(Boolean(target.ok));
              throw error;
            });
          };
        }
        var value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  }

  global.fetch = function s666DiscordRaceGuardedFetch(input, init) {
    var deliveredWebhook = requestWebhook(input, init);
    if (!deliveredWebhook) return originalFetch(input, init);
    directRequestCount += 1;
    startControlGuard();
    var request;
    try {
      request = originalFetch(input, init);
    } catch (error) {
      settleDirectRequest(deliveredWebhook, false);
      throw error;
    }
    return Promise.resolve(request).then(function (response) {
      return wrapResponseBody(response, deliveredWebhook);
    }, function (error) {
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

  global.addEventListener('storage', function (event) {
    if (directRequestCount > 0 && event && event.key === STORAGE_KEY) settingsChangedDuringDelivery = true;
  });

  global.S666DiscordDirectSettingsRaceGuard = Object.freeze({
    version: '2.0.0',
    active: function () { return directRequestCount > 0; }
  });
})(window);
