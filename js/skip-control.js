/* Protected Auto-DJ skip control. Public vote-skip is intentionally disabled. */
(function () {
  'use strict';

  var GATE_REFRESH_MS = 15000;
  var gateState = { ok: false, checkedAt: 0 };

  function mountSkipButton() {
    if (document.getElementById('s666AdminSkipBtn')) return true;
    var toolbar = document.querySelector('.control-toolbar, #mffControls, .mff-controls');
    if (!toolbar) return false;

    var button = document.createElement('button');
    button.id = 's666AdminSkipBtn';
    button.className = 's666-skip-admin-btn';
    button.type = 'button';
    button.hidden = true;
    button.disabled = true;
    button.title = 'Admin: Auto-DJ Song ueberspringen';
    button.setAttribute('aria-label', 'Auto-DJ Song ueberspringen');
    button.innerHTML = '<span aria-hidden="true">&#9197;</span><span>SKIP</span>';
    button.addEventListener('click', handleAdminSkip);
    toolbar.appendChild(button);
    injectSkipCss();
    syncAdminButton(true);
    window.setInterval(syncAdminButton, GATE_REFRESH_MS);
    return true;
  }

  function syncAdminButton(force) {
    var button = document.getElementById('s666AdminSkipBtn');
    if (!button) return Promise.resolve(false);
    var now = Date.now();
    if (!force && gateState.checkedAt && now - gateState.checkedAt < GATE_REFRESH_MS) {
      applyGateState(button);
      return Promise.resolve(gateState.ok);
    }

    return fetch('/api/admin/gate-check?t=' + now, {
      credentials: 'include',
      cache: 'no-store'
    }).then(function (response) {
      if (!response.ok) return { ok: false };
      return response.json().catch(function () { return { ok: false }; });
    }).then(function (data) {
      gateState.ok = data.ok === true && data.authOk === true && data.pwOk === true;
      gateState.checkedAt = Date.now();
      applyGateState(button);
      return gateState.ok;
    }).catch(function () {
      gateState.ok = false;
      gateState.checkedAt = Date.now();
      applyGateState(button);
      return false;
    });
  }

  function applyGateState(button) {
    button.hidden = !gateState.ok;
    button.disabled = !gateState.ok;
  }

  function handleAdminSkip() {
    var button = document.getElementById('s666AdminSkipBtn');
    if (button) button.disabled = true;

    syncAdminButton(true).then(function (allowed) {
      if (!allowed) throw new Error('admin_gate_closed');
      return fetch('/api/admin/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: 'player-admin-button' }),
        cache: 'no-store'
      });
    }).then(function (response) {
      return response.json().catch(function () { return { ok: false }; }).then(function (data) {
        if (!response.ok || data.ok !== true) throw new Error(data.error || 'skip_failed');
        return data;
      });
    }).then(function () {
      showToast('Auto-DJ Skip ausgefuehrt.');
    }).catch(function (error) {
      var code = error && error.message;
      showToast(code === 'cooldown_active' ? 'Skip Cooldown aktiv.' : 'Admin Skip abgelehnt.');
    }).finally(function () {
      syncAdminButton(true);
    });
  }

  function showToast(message) {
    var toast = document.getElementById('s666SkipToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 's666SkipToast';
      toast.className = 's666-skip-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(function () { toast.classList.remove('visible'); }, 2800);
  }

  function injectSkipCss() {
    if (document.getElementById('s666SkipCss')) return;
    var style = document.createElement('style');
    style.id = 's666SkipCss';
    style.textContent = [
      '.s666-skip-admin-btn{width:68px;height:34px;min-width:68px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border-radius:6px;border:1px solid rgba(255,61,187,.62);background:rgba(23,5,27,.92);color:#ff71cc;font:900 10px/1 ui-monospace,monospace;letter-spacing:0;cursor:pointer}',
      '.s666-skip-admin-btn[hidden]{display:none!important}',
      '.s666-skip-admin-btn:disabled{opacity:.45;cursor:default}',
      '.s666-skip-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);z-index:99999;padding:8px 18px;border:1px solid rgba(22,255,243,.5);border-radius:6px;background:rgba(7,11,28,.96);color:#16fff3;font:700 12px/1.2 ui-monospace,monospace;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}',
      '.s666-skip-toast.visible{opacity:1;transform:translateX(-50%) translateY(0)}'
    ].join('');
    document.head.appendChild(style);
  }

  function init() {
    if (mountSkipButton()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      if (mountSkipButton() || ++attempts > 30) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.S666SkipControl = { refreshGate: function () { return syncAdminButton(true); } };
})();
