/*
 * 666SOUNDsDESIGn authoritative Auto-DJ skip controller.
 * UI is owned by player-stage-v2; this module owns the protected API request.
 */
(function () {
  'use strict';
  if (window.S666SkipControl) return;

  var inFlight = false;

  function dispatch(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:skip-state', { detail: detail || {} })); } catch (_) {}
  }

  function normalizeError(response, data) {
    if (data && data.retryAfterMs) return 'Skip-Cooldown: ' + Math.max(1, Math.ceil(Number(data.retryAfterMs) / 1000)) + ' s';
    return String((data && (data.error || data.message)) || (response ? 'HTTP ' + response.status : 'skip_failed'));
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
    dispatch({ phase: 'sending' });
    try {
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
    skip: skip,
    isBusy: function () { return inFlight; }
  };
})();
