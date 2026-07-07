/*
 * 666SOUNDsDESIGn shared admin authentication client.
 * HARDLOCK v1.2.0: one token store, one same-origin Bearer contract,
 * one interactive login path for Admin, Discord and Auto-DJ Skip.
 */
(function () {
  'use strict';
  if (window.S666AdminAuth) return;

  var TOKEN_KEY = 's666_admin_session_token_v1';
  var CHECK_TTL_MS = 8000;
  var REQUEST_TIMEOUT_MS = 10000;
  var cache = { checkedAt: 0, ok: false, data: null };
  var interactiveLoginPromise = null;

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; }
    catch (_) {
      emit('storage-unavailable', { error: 'session_storage_unavailable' });
      return '';
    }
  }

  function setToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, String(token));
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (_) {
      emit('storage-unavailable', { error: 'session_storage_unavailable' });
    }
    cache = { checkedAt: 0, ok: false, data: null };
  }

  function clear() { setToken(''); }

  function sameOriginUrl(url) {
    var resolved = new URL(String(url || ''), window.location.href);
    if (resolved.origin !== window.location.origin) {
      throw new Error('cross_origin_authorized_fetch_rejected');
    }
    return resolved.pathname + resolved.search + resolved.hash;
  }

  function authHeaders(extra) {
    var headers = new Headers(extra || {});
    var token = getToken();
    if (token) headers.set('authorization', 'Bearer ' + token);
    if (!headers.has('accept')) headers.set('accept', 'application/json');
    return headers;
  }

  function emit(state, detail) {
    try {
      document.dispatchEvent(new CustomEvent('s666:admin-auth-state', {
        detail: Object.assign({ state: state, ok: state === 'authenticated' }, detail || {})
      }));
    } catch (_) {}
  }

  function errorCode(error, fallback) {
    var value = error && error.message ? error.message : String(error || fallback || 'auth_failed');
    return value.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || fallback || 'auth_failed';
  }

  function errorMessage(code) {
    var messages = {
      password_missing: 'Admin-Passwort fehlt.',
      password_rejected: 'Das Admin-Passwort wurde abgelehnt.',
      origin_rejected: 'Die Anmeldequelle wurde abgelehnt.',
      worker_secrets_missing: 'Passwort-Worker ist nicht vollständig konfiguriert.',
      token_signature_invalid: 'Token-Signatur ist ungültig. AUTH_SECRET prüfen.',
      token_expired: 'Admin-Sitzung ist abgelaufen.',
      token_malformed: 'Der Admin-Token ist beschädigt.',
      token_payload_invalid: 'Der Admin-Token enthält ungültige Daten.',
      token_payload_missing: 'Token-Prüfung lieferte keine Nutzdaten.',
      issuer_invalid: 'Der Token stammt nicht vom Passwort-Worker.',
      scope_invalid: 'Der Token besitzt keine Admin-Berechtigung.',
      verification_timeout: 'Auth-Worker antwortet nicht rechtzeitig.',
      verification_unreachable: 'Auth-Worker ist nicht erreichbar.',
      pw_login_timeout: 'Passwort-Worker antwortet nicht rechtzeitig.',
      pw_login_unreachable: 'Passwort-Worker ist nicht erreichbar.',
      auth_token_missing: 'Keine aktive Admin-Sitzung.',
      cross_origin_authorized_fetch_rejected: 'Geschützte Anfrage an fremde Domain blockiert.',
      session_storage_unavailable: 'Die Admin-Sitzung kann in diesem Browser nicht gespeichert werden.'
    };
    return messages[code] || ('Admin-Anmeldung fehlgeschlagen: ' + code);
  }

  function requestJson(url, init, timeoutMs) {
    var safeUrl;
    try { safeUrl = sameOriginUrl(url); }
    catch (error) { return Promise.reject(error); }

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, timeoutMs || REQUEST_TIMEOUT_MS);
    var options = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, init || {});
    options.headers = authHeaders(options.headers);
    if (controller) options.signal = controller.signal;

    return fetch(safeUrl, options).then(function (response) {
      return response.text().then(function (raw) {
        var data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { raw: raw }; }
        return { response: response, data: data };
      });
    }).catch(function (error) {
      if (error && error.name === 'AbortError') throw new Error('request_timeout');
      throw error;
    }).finally(function () { clearTimeout(timer); });
  }

  function login(password) {
    var value = String(password || '');
    if (!value) return Promise.reject(new Error('password_missing'));
    emit('authenticating');

    return requestJson('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: value })
    }, 12000).then(function (result) {
      if (!result.response.ok || result.data.ok !== true || !result.data.token) {
        throw new Error(result.data.error || 'login_rejected');
      }
      setToken(result.data.token);
      cache = { checkedAt: Date.now(), ok: true, data: result.data };
      emit('authenticated', result.data);
      return result.data;
    }).catch(function (error) {
      clear();
      var code = errorCode(error, 'login_failed');
      emit('rejected', { error: code, message: errorMessage(code) });
      throw new Error(code);
    });
  }

  function check(force) {
    var token = getToken();
    if (!token) {
      cache = { checkedAt: Date.now(), ok: false, data: null };
      return Promise.resolve({ ok: false, authOk: false, pwOk: false, error: 'auth_token_missing' });
    }
    if (!force && cache.checkedAt && Date.now() - cache.checkedAt < CHECK_TTL_MS) {
      return Promise.resolve(Object.assign({ ok: cache.ok }, cache.data || {}));
    }

    return requestJson('/api/admin/gate-check?t=' + Date.now(), { method: 'GET' }).then(function (result) {
      var ok = result.response.ok && result.data.ok === true && result.data.authOk === true && result.data.pwOk === true;
      cache = { checkedAt: Date.now(), ok: ok, data: result.data };
      if (!ok && (result.response.status === 401 || result.response.status === 403)) clear();
      emit(ok ? 'authenticated' : 'rejected', result.data);
      return Object.assign({ ok: ok }, result.data || {});
    }).catch(function (error) {
      cache = { checkedAt: Date.now(), ok: false, data: null };
      var code = errorCode(error, 'auth_unreachable');
      emit('unreachable', { error: code, message: errorMessage(code) });
      return { ok: false, authOk: false, pwOk: false, error: code };
    });
  }

  function ensure(options) {
    var opts = options || {};
    if (interactiveLoginPromise) return interactiveLoginPromise;

    interactiveLoginPromise = (opts.forceLogin ? Promise.resolve({ ok: false }) : check(true))
      .then(function (status) {
        if (status && status.ok) return status;
        var promptFn = typeof opts.prompt === 'function'
          ? opts.prompt
          : function () { return window.prompt(opts.message || 'Admin-Passwort eingeben:', ''); };
        var password = promptFn();
        if (password === null) throw new Error('login_cancelled');
        return login(password).then(function () { return check(true); });
      })
      .then(function (status) {
        if (!status || !status.ok) throw new Error(status && status.error || 'gate_check_failed');
        return status;
      })
      .finally(function () { interactiveLoginPromise = null; });

    return interactiveLoginPromise;
  }

  function authorizedFetch(url, init) {
    var safeUrl;
    try { safeUrl = sameOriginUrl(url); }
    catch (error) { return Promise.reject(error); }
    var options = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, init || {});
    options.headers = authHeaders(options.headers);
    return fetch(safeUrl, options).then(function (response) {
      if (response.status === 401 || response.status === 403) clear();
      return response;
    });
  }

  window.S666AdminAuth = {
    version: '1.2.0-hardlock',
    tokenKey: TOKEN_KEY,
    getToken: getToken,
    setToken: setToken,
    clear: clear,
    headers: authHeaders,
    login: login,
    check: check,
    ensure: ensure,
    fetch: authorizedFetch,
    errorCode: errorCode,
    errorMessage: errorMessage
  };
})();
