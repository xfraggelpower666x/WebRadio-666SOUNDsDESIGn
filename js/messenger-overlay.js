/*
 * 666SOUNDsDESIGn authoritative Messenger overlay for desktop + iPhone.
 * Uses S666PlayerAlertClient exclusively; no legacy button forwarding.
 */
(function () {
  'use strict';
  if (window.__S666_MESSENGER_OVERLAY_V110__) return;
  window.__S666_MESSENGER_OVERLAY_V110__ = true;

  var MAX_CHARS = 240;
  var OVERLAY_ID = 's666MsgOverlay';
  var statusTimer = 0;
  var mountTimer = 0;
  var observer = null;
  var observerRoot = null;
  var sendSequence = 0;
  var activeSendId = 0;
  var statusSequence = 0;
  var statusState = { text: '', kind: '' };
  var draftState = '';
  var draftRevision = 0;
  var focusTimer = 0;
  var EMOJIS = [
    '🎵','🎶','🎧','🎤','🎸','🎹','🥁','🎺','🔥','⚡',
    '❤️','💜','💙','🖤','🤘','😎','👽','💀','🎉','🥂',
    '🚀','💫','✨','🌙','⭐','👊','💥','666','∞','★'
  ];

  function buildOverlayHtml() {
    var rows = [0, 1, 2].map(function (row) {
      return '<div class="s666msg-emoji-row">' + EMOJIS.slice(row * 10, row * 10 + 10).map(function (emoji) {
        return '<button type="button" class="s666msg-emoji" data-emoji="' + emoji + '">' + emoji + '</button>';
      }).join('') + '</div>';
    }).join('');
    return '<div id="' + OVERLAY_ID + '" class="s666msg-overlay" role="dialog" aria-modal="true" aria-label="Broadcast Messenger" hidden>' +
      '<div class="s666msg-backdrop" id="s666MsgBackdrop"></div>' +
      '<div class="s666msg-panel">' +
        '<header class="s666msg-header"><span class="s666msg-title">📡 BROADCAST MESSAGE</span><button type="button" class="s666msg-close" id="s666MsgClose" aria-label="Schliessen">✕</button></header>' +
        '<div class="s666msg-body">' +
          '<textarea id="s666MsgText" class="s666msg-textarea" maxlength="' + MAX_CHARS + '" rows="5" placeholder="Nachricht an alle Hörer schreiben..." autocorrect="on" autocapitalize="sentences" spellcheck="true"></textarea>' +
          '<div class="s666msg-meta"><span id="s666MsgCount" class="s666msg-count">0 / ' + MAX_CHARS + '</span><span id="s666MsgStatus" class="s666msg-status" role="status" aria-live="polite"></span></div>' +
          '<div class="s666msg-emojis">' + rows + '</div>' +
        '</div>' +
        '<footer class="s666msg-footer"><button type="button" class="s666msg-btn-secondary" id="s666MsgClear">Leeren</button><button type="button" class="s666msg-btn-send" id="s666MsgSend">📡 SENDEN</button></footer>' +
      '</div></div>';
  }

  function injectCss() {
    if (document.getElementById('s666MsgCss')) return;
    var style = document.createElement('style');
    style.id = 's666MsgCss';
    style.textContent = [
      '.s666msg-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px}',
      '.s666msg-overlay[hidden]{display:none!important}',
      '.s666msg-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.s666msg-panel{position:relative;z-index:1;width:min(500px,95vw);max-height:90dvh;background:radial-gradient(circle at 10% 5%,rgba(180,92,255,.18),transparent 40%),radial-gradient(circle at 90% 15%,rgba(22,139,255,.14),transparent 40%),rgba(3,6,18,.97);border:1px solid rgba(22,139,255,.45);border-radius:20px;box-shadow:0 0 30px rgba(22,139,255,.22),0 0 36px rgba(180,92,255,.14);display:flex;flex-direction:column;overflow:hidden}',
      '.s666msg-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid rgba(22,139,255,.18);background:rgba(22,139,255,.04)}',
      '.s666msg-title{font:900 13px/1 "Courier New",monospace;letter-spacing:.12em;color:#168bff;text-shadow:0 0 10px rgba(22,139,255,.6)}',
      '.s666msg-close{width:32px;height:32px;border-radius:50%;border:1px solid rgba(180,92,255,.5);background:rgba(180,92,255,.08);color:#b45cff;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.s666msg-body{padding:14px 16px 10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto}',
      '.s666msg-textarea{width:100%;box-sizing:border-box;background:rgba(7,11,28,.92);border:1px solid rgba(22,139,255,.38);border-radius:12px;color:#eaffff;font:15px/1.55 system-ui,-apple-system,sans-serif;padding:12px 14px;resize:vertical;min-height:90px;outline:none;-webkit-appearance:none}',
      '.s666msg-textarea:focus{border-color:rgba(22,139,255,.75);box-shadow:0 0 14px rgba(22,139,255,.18)}',
      '.s666msg-meta{display:flex;align-items:center;justify-content:space-between;min-height:18px;gap:10px}',
      '.s666msg-count{font:11px/1 "Courier New",monospace;color:rgba(22,139,255,.5)}',
      '.s666msg-count.near-limit{color:#b45cff}',
      '.s666msg-status{font:700 11px/1.2 "Courier New",monospace;letter-spacing:.04em;text-align:right}',
      '.s666msg-status.ok{color:#168bff}.s666msg-status.err{color:#ff3d68}.s666msg-status.sending{color:#ffaa26;animation:s666MsgPulse .8s ease-in-out infinite}',
      '@keyframes s666MsgPulse{0%,100%{opacity:1}50%{opacity:.4}}',
      '.s666msg-emojis{display:flex;flex-direction:column;gap:5px}.s666msg-emoji-row{display:flex;gap:4px;flex-wrap:wrap}',
      '.s666msg-emoji{font-size:18px;line-height:1;padding:7px;border-radius:8px;border:1px solid rgba(22,139,255,.18);background:rgba(22,139,255,.04);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
      '.s666msg-footer{display:flex;gap:10px;padding:12px 16px 14px;border-top:1px solid rgba(22,139,255,.12);background:rgba(22,139,255,.02)}',
      '.s666msg-btn-secondary,.s666msg-btn-send{min-height:42px;border-radius:999px;font:900 12px/1 "Courier New",monospace;letter-spacing:.08em;cursor:pointer;padding:9px 18px;border:1px solid rgba(22,139,255,.4)}',
      '.s666msg-btn-secondary{background:rgba(22,139,255,.04);color:rgba(22,139,255,.7)}',
      '.s666msg-btn-send{background:linear-gradient(135deg,rgba(22,139,255,.18),rgba(180,92,255,.14));color:#168bff;flex:1;box-shadow:0 0 14px rgba(22,139,255,.18)}',
      '.s666msg-btn-send:disabled{opacity:.45;cursor:default}',
      '.s666msg-trigger{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:5px 12px;border-radius:8px;border:1px solid rgba(22,139,255,.5);background:rgba(7,11,28,.85);color:#168bff;font:900 10px/1 "Courier New",monospace;letter-spacing:.04em;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}',
      'body[data-veluna-page="veluna"] #actionBar #s666MessageControlButton{min-height:20px;padding:2px 7px;margin-left:auto;flex:0 0 auto;border-radius:8px;font-size:9px;line-height:1}',
      '@media(max-width:760px){.s666msg-panel{width:100%;max-height:88dvh;border-radius:20px 20px 0 0}.s666msg-overlay{align-items:flex-end;padding:0}.s666msg-textarea{font-size:16px!important}.s666msg-emoji{font-size:21px;padding:8px}.s666msg-btn-send,.s666msg-btn-secondary{min-height:44px;font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderStatus() {
    var status = document.getElementById('s666MsgStatus');
    if (!status) return;
    status.textContent = statusState.text;
    status.className = 's666msg-status' + (statusState.kind ? ' ' + statusState.kind : '');
  }

  function setStatus(text, kind, clearAfter) {
    clearTimeout(statusTimer);
    statusTimer = 0;
    var owner = ++statusSequence;
    statusState = { text: text || '', kind: kind || '' };
    renderStatus();
    if (clearAfter) statusTimer = setTimeout(function () {
      if (statusSequence !== owner) return;
      statusTimer = 0;
      statusState = { text: '', kind: '' };
      renderStatus();
    }, clearAfter);
  }

  function updateCount(textarea) {
    var counter = document.getElementById('s666MsgCount');
    if (!counter || !textarea) return;
    var length = textarea.value.length;
    counter.textContent = length + ' / ' + MAX_CHARS;
    counter.classList.toggle('near-limit', length > MAX_CHARS * .85);
  }

  function syncDraft(textarea) {
    if (!textarea) return;
    if (String(textarea.value || '') !== draftState) textarea.value = draftState;
    updateCount(textarea);
  }

  function syncMessengerRuntime() {
    var textarea = document.getElementById('s666MsgText');
    var button = document.getElementById('s666MsgSend');
    syncDraft(textarea);
    renderStatus();
    if (button) button.disabled = Boolean(activeSendId);
  }

  function closeMessenger() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function sendMessage() {
    var textarea = document.getElementById('s666MsgText');
    var button = document.getElementById('s666MsgSend');
    var client = window.S666PlayerAlertClient;
    if (!textarea || !client || typeof client.send !== 'function') {
      setStatus('✗ Messenger nicht bereit', 'err', 4000);
      return Promise.resolve(false);
    }
    var inputSnapshot = String(textarea.value || '');
    var inputRevision = draftRevision;
    draftState = inputSnapshot;
    var message = inputSnapshot.trim();
    if (!message) {
      setStatus('✗ Nachricht fehlt', 'err', 3000);
      textarea.focus();
      return Promise.resolve(false);
    }
    if (activeSendId) return Promise.resolve(false);
    var sendId = ++sendSequence;
    activeSendId = sendId;
    if (button) button.disabled = true;
    setStatus('⏳ SENDE...', 'sending');
    return Promise.resolve().then(function () {
      return client.send(message, { username: 'Broadcast', source: 'messenger-overlay' });
    }).then(function (result) {
      if (activeSendId !== sendId) return false;
      if (result && result.ok) {
        var currentTextarea = document.getElementById('s666MsgText');
        if (draftRevision === inputRevision && draftState === inputSnapshot) {
          draftState = '';
          draftRevision += 1;
          if (currentTextarea && currentTextarea.value === inputSnapshot) currentTextarea.value = '';
        }
        updateCount(currentTextarea);
        setStatus('✓ GESENDET', 'ok', 3500);
        return true;
      }
      var label = result && result.retryAfterMs
        ? 'Bitte ' + Math.max(1, Math.ceil(result.retryAfterMs / 1000)) + ' s warten'
        : (result && result.error || 'Fehler');
      setStatus('✗ ' + label, 'err', 5000);
      return false;
    }).catch(function (error) {
      if (activeSendId !== sendId) return false;
      setStatus('✗ ' + (error && error.message ? error.message : 'Verbindungsfehler'), 'err', 5000);
      return false;
    }).finally(function () {
      if (activeSendId === sendId) activeSendId = 0;
      var currentButton = document.getElementById('s666MsgSend');
      if (currentButton) currentButton.disabled = Boolean(activeSendId);
    });
  }

  function bindOverlayEvents() {
    var overlay = document.getElementById(OVERLAY_ID);
    var textarea = document.getElementById('s666MsgText');
    if (!overlay || !textarea) return false;
    if (overlay.__s666MessengerOverlayBound !== true) {
      overlay.__s666MessengerOverlayBound = true;
      overlay.addEventListener('input', function (event) {
        if (!event.target || event.target.id !== 's666MsgText') return;
        draftState = String(event.target.value || '');
        draftRevision += 1;
        updateCount(event.target);
      });
      overlay.addEventListener('click', function (event) {
        var target = event.target;
        if (!target) return;
        if (target === overlay || target.id === 's666MsgBackdrop' || (target.closest && target.closest('#s666MsgClose'))) {
          closeMessenger();
          return;
        }
        var emojiButton = target.closest && target.closest('.s666msg-emoji');
        if (emojiButton) {
          var currentTextarea = document.getElementById('s666MsgText');
          if (!currentTextarea) return;
          var emoji = emojiButton.getAttribute('data-emoji') || '';
          if (currentTextarea.value.length + emoji.length > MAX_CHARS) return;
          var start = typeof currentTextarea.selectionStart === 'number' ? currentTextarea.selectionStart : currentTextarea.value.length;
          currentTextarea.value = currentTextarea.value.slice(0, start) + emoji + currentTextarea.value.slice(start);
          currentTextarea.selectionStart = currentTextarea.selectionEnd = start + emoji.length;
          draftState = String(currentTextarea.value || '');
          draftRevision += 1;
          updateCount(currentTextarea);
          currentTextarea.focus();
          return;
        }
        if (target.closest && target.closest('#s666MsgClear')) {
          var clearTextarea = document.getElementById('s666MsgText');
          draftState = '';
          draftRevision += 1;
          if (clearTextarea) clearTextarea.value = '';
          updateCount(clearTextarea);
          setStatus('', '');
          if (clearTextarea) clearTextarea.focus();
          return;
        }
        if (target.closest && target.closest('#s666MsgSend')) sendMessage();
      });
      overlay.addEventListener('keydown', function (event) {
        if (!event.target || event.target.id !== 's666MsgText') return;
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          sendMessage();
        }
      });
    }
    syncMessengerRuntime();
    return true;
  }

  function ensureOverlay() {
    if (!document.body) return false;
    if (!document.getElementById(OVERLAY_ID)) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = buildOverlayHtml();
      document.body.appendChild(wrapper.firstElementChild);
    }
    return bindOverlayEvents();
  }

  function openMessenger(prefill) {
    if (!ensureOverlay()) return false;
    var overlay = document.getElementById(OVERLAY_ID);
    var textarea = document.getElementById('s666MsgText');
    if (!overlay || !textarea) return false;
    overlay.hidden = false;
    if (document.body) document.body.style.overflow = 'hidden';
    if (typeof prefill === 'string') {
      draftState = prefill.slice(0, MAX_CHARS);
      draftRevision += 1;
    }
    syncDraft(textarea);
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      focusTimer = 0;
      var currentOverlay = document.getElementById(OVERLAY_ID);
      var currentTextarea = document.getElementById('s666MsgText');
      if (currentOverlay && !currentOverlay.hidden && currentTextarea && currentOverlay.contains(currentTextarea)) currentTextarea.focus();
    }, 80);
    return true;
  }

  function desiredTarget() {
    var velunaActionBar = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? document.getElementById('actionBar') : null;
    if (velunaActionBar) return velunaActionBar;
    if (window.innerWidth <= 760) {
      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot');
    }
    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot');
  }

  function mountTrigger() {
    var target = desiredTarget();
    if (!target) return false;
    var button = document.getElementById('s666MessageControlButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 's666MessageControlButton';
      button.type = 'button';
      button.className = 's666msg-trigger';
      button.textContent = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? 'MSG' : 'MESSAGE';
      button.title = 'Broadcast-Nachricht senden';
      button.setAttribute('aria-label', 'Broadcast-Nachricht senden');
    }
    if (button.__s666MessengerTriggerBound !== true) {
      button.__s666MessengerTriggerBound = true;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openMessenger();
      });
    }
    if (button.parentNode !== target) target.appendChild(button);
    return true;
  }

  function reconcileMessengerRuntime() {
    ensureOverlay();
    mountTrigger();
    syncMessengerRuntime();
  }

  function scheduleMount() {
    if (mountTimer) return;
    mountTimer = setTimeout(function () {
      mountTimer = 0;
      reconcileMessengerRuntime();
    }, 60);
  }

  function startObserver() {
    if (observer || typeof MutationObserver !== 'function') return;
    var root = document && typeof document.nodeType === 'number' ? document : document.body;
    if (!root) return;
    observer = new MutationObserver(scheduleMount);
    observerRoot = root;
    try {
      observer.observe(root, { childList: true, subtree: true });
    } catch (_) {
      observer.disconnect();
      observer = null;
      observerRoot = null;
    }
  }

  function stopObserver() {
    clearTimeout(mountTimer);
    mountTimer = 0;
    if (observer) observer.disconnect();
    observer = null;
    observerRoot = null;
  }

  function init() {
    injectCss();
    reconcileMessengerRuntime();
    [250, 800, 1800, 4000].forEach(function (delay) { setTimeout(reconcileMessengerRuntime, delay); });
    startObserver();
    window.addEventListener('resize', scheduleMount, { passive: true });
    window.addEventListener('pagehide', stopObserver);
    window.addEventListener('pageshow', function () { reconcileMessengerRuntime(); startObserver(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.S666Messenger = { open: openMessenger, close: closeMessenger, send: sendMessage, mount: mountTrigger };
})();
