/*
 * 666SOUNDsDESIGn shared admin authentication client.
 * HARDLOCK v1.2.22: one token store, one same-origin Bearer contract,
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

  function overlayEvent(state, detail) {
    try { window.dispatchEvent(new CustomEvent('s666:admin-auth-overlay', { detail: Object.assign({ state: state }, detail || {}) })); } catch (_) {}
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
      password_rejected: 'Das Player-Admin-Passwort wurde vom Passwort-Worker ausdrücklich abgelehnt. Der Shoutcast-Benutzername wird hier nicht geprüft.',
      login_rejected: 'Der Passwort-Worker hat die Anmeldung abgelehnt. Das ist kein bestätigter Passwortfehler; Worker-Route und Service-Token prüfen.',
      login_failed: 'Die Anmeldung konnte nicht abgeschlossen werden.',
      auth_unreachable: 'Die Auth-Prüfung ist nicht erreichbar.',
      origin_rejected: 'Die Anmeldequelle wurde abgelehnt.',
      worker_secrets_missing: 'Passwort- oder Auth-Worker ist nicht vollständig konfiguriert.',
      service_token_missing: 'Service-Token fehlt im Worker.',
      service_auth_rejected: 'Service-Authentifizierung wurde abgelehnt.',
      audience_invalid: 'Token-Audience stimmt nicht mit dem WebRadio überein.',
      login_rate_limited: 'Zu viele Loginversuche. Bitte später erneut versuchen.',
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
      pw_login_protocol_error: 'Die Passwort-Worker-Route lieferte keine gültige Login-Antwort. Wahrscheinlich falsche Route, alter Deploy-Stand oder HTML/Proxy-Fehler.',
      auth_token_missing: 'Keine aktive Admin-Sitzung.',
      cross_origin_authorized_fetch_rejected: 'Geschützte Anfrage an fremde Domain blockiert.',
      session_storage_unavailable: 'Die Admin-Sitzung kann in diesem Browser nicht gespeichert werden.',
      login_cancelled: 'Admin-Anmeldung wurde abgebrochen.',
      gate_check_failed: 'Passwort- und Auth-Worker konnten die Sitzung nicht gemeinsam bestätigen.',
      request_timeout: 'Die geschützte Player-Anfrage hat das Zeitlimit überschritten.'
    };
    return messages[code] || ('Admin-Anmeldung fehlgeschlagen: ' + code);
  }


  // v1.2.5: password-manager friendly modal. Replaces window.prompt for iPhone autofill,
  // without pausing/restarting the player audio element.
  function ensureLoginOverlay() {
    var overlay = document.getElementById('s666AdminAuthOverlay');
    if (overlay) return overlay;
    var style = document.getElementById('s666AdminAuthOverlayStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 's666AdminAuthOverlayStyle';
      style.textContent = '' +
        '#s666AdminAuthOverlay{position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}' +
        '#s666AdminAuthOverlay.is-open{display:flex}' +
        '#s666AdminAuthOverlay .s666-auth-box{width:min(92vw,420px);border:1px solid rgba(22,255,243,.42);border-radius:18px;background:linear-gradient(180deg,rgba(9,15,25,.98),rgba(2,5,12,.99));box-shadow:0 0 28px rgba(22,255,243,.24),0 0 22px rgba(255,61,187,.18);padding:16px;color:#eef7ff;font:700 13px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
        '#s666AdminAuthOverlay .s666-auth-title{color:#16fff3;font-size:16px;font-weight:900;letter-spacing:.08em;text-shadow:0 0 12px rgba(22,255,243,.55);margin-bottom:8px}' +
        '#s666AdminAuthOverlay .s666-auth-message{color:#9db0be;margin-bottom:12px}' +
        '#s666AdminAuthOverlay input{width:100%;border:1px solid rgba(22,255,243,.34);border-radius:13px;background:rgba(255,255,255,.055);color:#fff;padding:13px 12px;font:900 16px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;outline:none}' +
        '#s666AdminAuthOverlay input:focus{border-color:#ff3dbb;box-shadow:0 0 0 2px rgba(255,61,187,.18),0 0 18px rgba(22,255,243,.18)}' +
        '#s666AdminAuthOverlay .s666-auth-actions{display:grid;grid-template-columns:1fr 1.2fr;gap:8px;margin-top:12px}' +
        '#s666AdminAuthOverlay button{appearance:none;border:1px solid rgba(22,255,243,.30);border-radius:12px;background:rgba(255,255,255,.055);color:#eef7ff;padding:11px 10px;font:900 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer}' +
        '#s666AdminAuthOverlay button.s666-auth-submit{border-color:rgba(255,61,187,.45);box-shadow:0 0 14px rgba(255,61,187,.18)}' +
        '#s666AdminAuthOverlay .s666-auth-state{min-height:16px;margin-top:10px;color:#16fff3;font-size:11px;letter-spacing:.04em}';
      document.head.appendChild(style);
    }
    overlay = document.createElement('div');
    overlay.id = 's666AdminAuthOverlay';
    overlay.innerHTML = '<form class="s666-auth-box" id="s666AdminAuthForm" autocomplete="on">' +
      '<div class="s666-auth-title">PLAYER ADMIN AUTH</div>' +
      '<div class="s666-auth-message" id="s666AdminAuthMessage">Player-Admin-Passwort eingeben. Shoutcast-Benutzername und Stream-Passwort bleiben im Worker.</div>' +
      '<input id="s666AdminAuthPassword" name="password" type="password" autocomplete="current-password" inputmode="text" enterkeyhint="go" placeholder="Admin-Passwort" />' +
      '<div class="s666-auth-actions"><button type="button" id="s666AdminAuthCancel">CANCEL</button><button type="submit" class="s666-auth-submit" id="s666AdminAuthSubmit">LOGIN & CONTINUE</button></div>' +
      '<div class="s666-auth-state" id="s666AdminAuthState">Bereit</div>' +
      '</form>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function promptPasswordWithOverlay(message) {
    return new Promise(function (resolve, reject) {
      var overlay = ensureLoginOverlay();
      var form = document.getElementById('s666AdminAuthForm');
      var input = document.getElementById('s666AdminAuthPassword');
      var msg = document.getElementById('s666AdminAuthMessage');
      var state = document.getElementById('s666AdminAuthState');
      var cancel = document.getElementById('s666AdminAuthCancel');
      var done = false;
      function cleanup() {
        form.removeEventListener('submit', onSubmit);
        cancel.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
      }
      function finish(fn, value) {
        if (done) return;
        done = true;
        cleanup();
        overlay.classList.remove('is-open');
        overlayEvent('close', { message: msg.textContent || '' });
        setTimeout(function () { try { input.value = ''; } catch (_) {} }, 120);
        fn(value);
      }
      function onSubmit(ev) {
        ev.preventDefault();
        var value = String(input.value || '');
        if (!value) { state.textContent = 'Passwort fehlt.'; input.focus(); return; }
        state.textContent = 'Authentifiziere …';
        finish(resolve, value);
      }
      function onCancel() { finish(reject, new Error('login_cancelled')); }
      function onOverlay(ev) { if (ev.target === overlay) onCancel(); }
      function onKey(ev) { if (ev.key === 'Escape') onCancel(); }
      msg.textContent = message || 'Player-Admin-Passwort eingeben (nicht Shoutcast-Login).';
      state.textContent = 'Bereit';
      input.value = '';
      form.addEventListener('submit', onSubmit);
      cancel.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
      overlay.classList.add('is-open');
      overlayEvent('open', { message: msg.textContent || '' });
      setTimeout(function () { try { input.focus(); input.select(); } catch (_) {} }, 80);
    });
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
        if (typeof opts.prompt === 'function') {
          var password = opts.prompt();
          if (password === null) throw new Error('login_cancelled');
          return login(password).then(function () { return check(true); });
        }
        return promptPasswordWithOverlay(opts.message || 'Admin-Passwort eingeben:')
          .then(function (password) { return login(password); })
          .then(function () { return check(true); });
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
    version: '1.2.22-autoskip-auth-chain',
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
