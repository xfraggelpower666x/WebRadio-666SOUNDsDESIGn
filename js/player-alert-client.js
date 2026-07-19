/*
 * 666SOUNDsDESIGn authoritative Player Alert client.
 * Owns send/current/history/polling and guarantees one request per send action.
 */
(function () {
  'use strict';
  if (window.S666PlayerAlertClient) return;

  var VERSION = (window.SMFP_VERSION && window.SMFP_VERSION.label) || 'v2026.07.09-veluna9';
  var MAX_CHARS = 240;
  var REQUEST_TIMEOUT_MS = 15000;
  var POLL_VISIBLE_MS = 10000;
  var POLL_HIDDEN_MS = 30000;
  var SENDER_KEY = 's666_player_alert_sender_id_v1';
  var LEGACY_SENDER_KEY = 'smfpPlayerAlertSenderId';
  var state = { inFlight: false, lastSeen: '', timer: 0, stopped: false };

  // PLAYER_MESSAGE_OVERLAY_INERT_V1 — closed means visually hidden and unable to capture touch.
  function setReceiveOverlayOpen(backdrop, open) {
    if (!backdrop) return;
    var visible = open === true;
    backdrop.classList.toggle('is-open', visible);
    backdrop.hidden = !visible;
    backdrop.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) backdrop.removeAttribute('inert'); else backdrop.setAttribute('inert', '');
    backdrop.style.setProperty('display', visible ? 'flex' : 'none', 'important');
    backdrop.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
    backdrop.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
  }

  function clean(value, max) {
    return String(value == null ? '' : value)
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || MAX_CHARS);
  }

  function senderId() {
    try {
      var existing = localStorage.getItem(SENDER_KEY) || localStorage.getItem(LEGACY_SENDER_KEY);
      if (existing) {
        localStorage.setItem(SENDER_KEY, existing);
        return existing;
      }
      var randomPart = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      var value = 'web-' + randomPart;
      localStorage.setItem(SENDER_KEY, value);
      localStorage.setItem(LEGACY_SENDER_KEY, value);
      return value;
    } catch (_) {
      return 'web-session-' + Math.random().toString(36).slice(2);
    }
  }

  function emit(name, detail) {
    try {
      var event = new CustomEvent(name, { detail: detail || {} });
      window.dispatchEvent(event);
    } catch (_) {}
  }

  function normalizedError(response, data) {
    var body = data && data.detail && typeof data.detail === 'object' ? data.detail : data;
    var retryAfterMs = Number(body && body.retryAfterMs || 0);
    var code = clean(body && (body.error || body.message || body.detail || body.code) || '', 120);
    return {
      ok: false,
      status: response ? response.status : 0,
      error: code || (response ? 'HTTP ' + response.status : 'connection_error'),
      retryAfterMs: retryAfterMs
    };
  }

  function requestJson(url, init, timeoutMs) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, timeoutMs || REQUEST_TIMEOUT_MS);
    var options = Object.assign({ cache: 'no-store', credentials: 'same-origin' }, init || {});
    if (controller) options.signal = controller.signal;
    return fetch(url, options).then(function (response) {
      return response.text().then(function (raw) {
        var data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { raw: raw }; }
        return { response: response, data: data };
      });
    }).finally(function () { clearTimeout(timer); });
  }

  function send(message, options) {
    options = options || {};
    var text = clean(message, MAX_CHARS);
    if (!text) return Promise.resolve({ ok: false, error: 'empty_message', status: 400 });
    if (state.inFlight) return Promise.resolve({ ok: false, error: 'send_in_flight', status: 409 });

    state.inFlight = true;
    emit('s666:player-alert-state', { state: 'sending', ok: false });
    var id = senderId();
    var payload = {
      message: text,
      username: clean(options.username || 'Broadcast', 28) || 'Broadcast',
      senderId: id,
      clientId: id,
      source: clean(options.source || 'player-alert-client', 60),
      version: VERSION
    };

    return requestJson('/api/player-alert/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (result) {
      var positive = result.response.ok && result.data && result.data.ok === true;
      if (!positive) {
        var failure = normalizedError(result.response, result.data);
        emit('s666:player-alert-state', Object.assign({ state: 'fail' }, failure));
        return failure;
      }
      var alert = result.data.alert || result.data;
      if (alert && alert.id) state.lastSeen = String(alert.id);
      var success = {
        ok: true,
        status: result.response.status,
        source: result.data.source || alert.source || 'worker',
        data: result.data
      };
      emit('s666:player-alert-state', Object.assign({ state: 'ok' }, success));
      return success;
    }).catch(function (error) {
      var failure = {
        ok: false,
        status: 0,
        error: error && error.name === 'AbortError' ? 'timeout' : 'connection_error'
      };
      emit('s666:player-alert-state', Object.assign({ state: 'fail' }, failure));
      return failure;
    }).finally(function () {
      state.inFlight = false;
    });
  }

  function get(path) {
    return requestJson('/api/player-alert/' + path + '?t=' + Date.now(), {
      method: 'GET', headers: { 'accept': 'application/json' }
    }).then(function (result) {
      if (!result.response.ok || !result.data || result.data.ok === false) {
        return normalizedError(result.response, result.data);
      }
      return Object.assign({ ok: true, status: result.response.status }, result.data);
    }).catch(function (error) {
      return { ok: false, status: 0, error: error && error.name === 'AbortError' ? 'timeout' : 'connection_error' };
    });
  }

  function ensureReceiveOverlay() {
    var backdrop = document.getElementById('playerAlertReceiveBackdrop');
    if (backdrop) {
      if (!backdrop.classList.contains('is-open')) setReceiveOverlayOpen(backdrop, false);
      return backdrop;
    }
    backdrop = document.createElement('div');
    backdrop.id = 'playerAlertReceiveBackdrop';
    backdrop.className = 'player-alert-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = '<div class="player-alert-modal" role="dialog" aria-modal="true" aria-label="Player message"><h3>666SOUNDsDESIGn PLAYER MESSAGE</h3><div id="playerAlertReceiveText" class="player-alert-message"></div><button id="playerAlertReceiveClose" class="player-alert-close" type="button">CLOSE</button></div>';
    document.body.appendChild(backdrop);
    setReceiveOverlayOpen(backdrop, false);
    function close() {
      setReceiveOverlayOpen(backdrop, false);
    }
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close(); }, true);
    var closeButton = backdrop.querySelector('#playerAlertReceiveClose');
    if (closeButton) closeButton.addEventListener('click', close, true);
    return backdrop;
  }

  function showReceived(alert) {
    var backdrop = ensureReceiveOverlay();
    var text = backdrop.querySelector('#playerAlertReceiveText');
    if (text) text.textContent = clean(alert && alert.message || '', MAX_CHARS);
    setReceiveOverlayOpen(backdrop, true);
    emit('s666:player-alert-received', { alert: alert });
  }

  function schedulePoll(delay) {
    clearTimeout(state.timer);
    if (state.stopped) return;
    state.timer = setTimeout(poll, delay);
  }

  function poll() {
    get('current').then(function (data) {
      if (data.ok && data.active && data.id) {
        var id = String(data.id);
        if (id !== state.lastSeen) {
          state.lastSeen = id;
          if (String(data.senderId || data.clientId || '') !== senderId()) showReceived(data);
        }
      }
    }).finally(function () {
      schedulePoll(document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
    });
  }

  function startPolling() {
    if (!state.stopped && state.timer) return;
    state.stopped = false;
    ensureReceiveOverlay();
    schedulePoll(1200);
  }

  function stopPolling() {
    state.stopped = true;
    clearTimeout(state.timer);
    state.timer = 0;
  }

  document.addEventListener('visibilitychange', function () {
    if (!state.stopped) schedulePoll(document.hidden ? POLL_HIDDEN_MS : 400);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startPolling, { once: true });
  else startPolling();

  window.S666PlayerAlertClient = {
    version: '1.2.1-overlay-inert',
    maxChars: MAX_CHARS,
    senderId: senderId,
    send: send,
    current: function () { return get('current'); },
    history: function () { return get('history'); },
    status: function () { return get('status'); },
    startPolling: startPolling,
    stopPolling: stopPolling
  };
})();
