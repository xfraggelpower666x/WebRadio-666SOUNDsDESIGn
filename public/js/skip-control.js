/*
 * 666SOUNDsDESIGn authoritative Auto-DJ skip controller.
 * All players delegate interactive Player Admin auth and the protected same-origin API request to this module.
 * The dedicated AutoDJ Worker secret is server-side only.
 */
(function () {
  'use strict';
  if (window.S666SkipControl) return;

  var inFlight = false;
  var skipNoticeTimer = 0;

  function dispatch(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:skip-state', { detail: detail || {} })); } catch (_) {}
  }

  function cleanTrack(value) {
    return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 320);
  }

  function skipNoticeText(data) {
    var previous = cleanTrack(data && data.previousTrack);
    var current = cleanTrack(data && data.currentTrack);
    if (!previous && !current) return '';
    if (previous && current) return 'SKIPPED · PREVIOUS: ' + previous + '  ◆  NOW: ' + current;
    if (current) return 'SKIPPED TO: ' + current;
    return 'SKIPPED · PREVIOUS: ' + previous;
  }

  function setTemporaryText(element, text) {
    if (!element || !text) return;
    if (!element.dataset.s666SkipOriginal) element.dataset.s666SkipOriginal = element.textContent || '';
    element.textContent = text;
    element.dataset.s666SkipNotice = '1';
  }

  function restoreTemporaryText(element, text) {
    if (!element || element.dataset.s666SkipNotice !== '1') return;
    if ((element.textContent || '') === text) element.textContent = element.dataset.s666SkipOriginal || '';
    delete element.dataset.s666SkipOriginal;
    delete element.dataset.s666SkipNotice;
  }

  function showSkipTickerNotice(data) {
    var text = skipNoticeText(data);
    if (!text) return;
    clearTimeout(skipNoticeTimer);

    var targets = [];
    function add(element) { if (element && targets.indexOf(element) < 0) targets.push(element); }

    add(document.getElementById('nowPlayingTicker'));
    add(document.querySelector('#mffApp .mff-title h1 span'));
    add(document.querySelector('#mffApp .mff-title h1'));
    add(document.getElementById('nowPlaying'));
    add(document.getElementById('nowPlayingClone'));

    targets.forEach(function (element) { setTemporaryText(element, text); });

    var tickerTrack = document.getElementById('tickerTrack');
    if (tickerTrack) {
      tickerTrack.classList.remove('is-static');
      tickerTrack.classList.add('is-running');
    }

    try { window.dispatchEvent(new Event('resize')); } catch (_) {}

    skipNoticeTimer = setTimeout(function () {
      targets.forEach(function (element) { restoreTemporaryText(element, text); });
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
      skipNoticeTimer = 0;
    }, 9000);
  }

  function normalizeError(response, data) {
    if (data && (data.retryAfterMs || data.remainingMs)) {
      return 'Skip-Cooldown: ' + Math.max(1, Math.ceil(Number(data.retryAfterMs || data.remainingMs) / 1000)) + ' s';
    }
    var code = String((data && (data.error || data.message)) || (response ? 'HTTP ' + response.status : 'skip_failed'));
    var messages = {
      autodj_skip_access_token_missing: 'AutoDJ-Skip-Worker-Token fehlt im Haupt-Worker.',
      autodj_skip_access_token_rejected: 'AutoDJ-Skip-Worker-Token wurde abgelehnt.',
      autodj_skip_url_missing: 'AutoDJ-Skip-Worker-URL fehlt im Haupt-Worker.',
      autodj_skip_unreachable: 'Der dedizierte AutoDJ-Skip-Worker ist nicht erreichbar.',
      autodj_skip_timeout: 'Der dedizierte AutoDJ-Skip-Worker antwortet nicht rechtzeitig.',
      autodj_sonicpanel_login_failed: 'Der dedizierte Worker konnte SonicPanel nicht anmelden.',
      autodj_skip_not_verified: 'SonicPanel hat den Skip nicht eindeutig bestätigt.',
      auth_token_missing: 'Keine aktive Player-Admin-Sitzung.',
      origin_rejected: 'Die Player-Anfrage wurde wegen ungültiger Herkunft abgelehnt.'
    };
    return messages[code] || code;
  }

  async function ensureInteractiveAuth(options) {
    options = options || {};
    if (!window.S666AdminAuth || typeof window.S666AdminAuth.ensure !== 'function') {
      throw new Error('admin_auth_client_missing');
    }
    return window.S666AdminAuth.ensure({
      message: options.prompt || 'Player-Admin-Passwort für Auto-DJ Skip eingeben (nicht SonicPanel/Shoutcast-Login):'
    });
  }

  async function check(force) {
    if (!window.S666AdminAuth) return { ok: false, error: 'admin_auth_client_missing' };
    return window.S666AdminAuth.check(Boolean(force));
  }

  async function postViaAdminAuth(payload) {
    var response = await window.S666AdminAuth.fetch('/api/admin/skip', {
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

      var result = await postViaAdminAuth({ source: options.source || 'player-stage-v2' });
      var response = result.response;
      var data = result.data;

      if (!response.ok || data.ok !== true) {
        var error = normalizeError(response, data);
        dispatch({ phase: 'error', error: error, status: response.status });
        return { ok: false, error: error, status: response.status, data: data };
      }

      showSkipTickerNotice(data);
      dispatch({ phase: 'success', data: data, previousTrack: data.previousTrack || '', currentTrack: data.currentTrack || '' });
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
    version: '2.1.0-all-player-skip-ticker',
    check: check,
    ensure: ensureInteractiveAuth,
    skip: skip,
    showSkipTickerNotice: showSkipTickerNotice,
    isBusy: function () { return inFlight; }
  };
})();
