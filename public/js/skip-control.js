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
