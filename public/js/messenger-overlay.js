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
      '.s666msg-overlay{position:fixed;inset:0;z-index:99980;display:flex;align-items:center;justify-content:center;padding:16px}',
      '.s666msg-overlay[hidden]{display:none!important}',
      '.s666msg-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.s666msg-panel{position:relative;z-index:1;width:min(500px,95vw);max-height:90dvh;background:radial-gradient(circle at 10% 5%,rgba(255,61,187,.18),transparent 40%),radial-gradient(circle at 90% 15%,rgba(22,255,243,.14),transparent 40%),rgba(3,6,18,.97);border:1px solid rgba(22,255,243,.45);border-radius:20px;box-shadow:0 0 30px rgba(22,255,243,.22),0 0 36px rgba(255,61,187,.14);display:flex;flex-direction:column;overflow:hidden}',
      '.s666msg-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid rgba(22,255,243,.18);background:rgba(22,255,243,.04)}',
      '.s666msg-title{font:900 13px/1 "Courier New",monospace;letter-spacing:.12em;color:#16fff3;text-shadow:0 0 10px rgba(22,255,243,.6)}',
      '.s666msg-close{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,61,187,.5);background:rgba(255,61,187,.08);color:#ff3dbb;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.s666msg-body{padding:14px 16px 10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto}',
      '.s666msg-textarea{width:100%;box-sizing:border-box;background:rgba(7,11,28,.92);border:1px solid rgba(22,255,243,.38);border-radius:12px;color:#eaffff;font:15px/1.55 system-ui,-apple-system,sans-serif;padding:12px 14px;resize:vertical;min-height:90px;outline:none;-webkit-appearance:none}',
      '.s666msg-textarea:focus{border-color:rgba(22,255,243,.75);box-shadow:0 0 14px rgba(22,255,243,.18)}',
      '.s666msg-meta{display:flex;align-items:center;justify-content:space-between;min-height:18px;gap:10px}',
      '.s666msg-count{font:11px/1 "Courier New",monospace;color:rgba(22,255,243,.5)}',
      '.s666msg-count.near-limit{color:#ff3dbb}',
      '.s666msg-status{font:700 11px/1.2 "Courier New",monospace;letter-spacing:.04em;text-align:right}',
      '.s666msg-status.ok{color:#16fff3}.s666msg-status.err{color:#ff3d68}.s666msg-status.sending{color:#ffaa26;animation:s666MsgPulse .8s ease-in-out infinite}',
      '@keyframes s666MsgPulse{0%,100%{opacity:1}50%{opacity:.4}}',
      '.s666msg-emojis{display:flex;flex-direction:column;gap:5px}.s666msg-emoji-row{display:flex;gap:4px;flex-wrap:wrap}',
      '.s666msg-emoji{font-size:18px;line-height:1;padding:7px;border-radius:8px;border:1px solid rgba(22,255,243,.18);background:rgba(22,255,243,.04);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
      '.s666msg-footer{display:flex;gap:10px;padding:12px 16px 14px;border-top:1px solid rgba(22,255,243,.12);background:rgba(22,255,243,.02)}',
      '.s666msg-btn-secondary,.s666msg-btn-send{min-height:42px;border-radius:999px;font:900 12px/1 "Courier New",monospace;letter-spacing:.08em;cursor:pointer;padding:9px 18px;border:1px solid rgba(22,255,243,.4)}',
      '.s666msg-btn-secondary{background:rgba(22,255,243,.04);color:rgba(22,255,243,.7)}',
      '.s666msg-btn-send{background:linear-gradient(135deg,rgba(22,255,243,.18),rgba(255,61,187,.14));color:#16fff3;flex:1;box-shadow:0 0 14px rgba(22,255,243,.18)}',
      '.s666msg-btn-send:disabled{opacity:.45;cursor:default}',
      '.s666msg-trigger{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:5px 12px;border-radius:8px;border:1px solid rgba(22,255,243,.5);background:rgba(7,11,28,.85);color:#16fff3;font:900 10px/1 "Courier New",monospace;letter-spacing:.04em;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}',
      '@media(max-width:760px){.s666msg-panel{width:100%;max-height:88dvh;border-radius:20px 20px 0 0}.s666msg-overlay{align-items:flex-end;padding:0}.s666msg-textarea{font-size:16px!important}.s666msg-emoji{font-size:21px;padding:8px}.s666msg-btn-send,.s666msg-btn-secondary{min-height:44px;font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setStatus(text, kind, clearAfter) {
    var status = document.getElementById('s666MsgStatus');
    if (!status) return;
    clearTimeout(statusTimer);
    status.textContent = text || '';
    status.className = 's666msg-status' + (kind ? ' ' + kind : '');
    if (clearAfter) statusTimer = setTimeout(function () { setStatus('', ''); }, clearAfter);
  }

  function updateCount(textarea) {
    var counter = document.getElementById('s666MsgCount');
    if (!counter || !textarea) return;
    var length = textarea.value.length;
    counter.textContent = length + ' / ' + MAX_CHARS;
    counter.classList.toggle('near-limit', length > MAX_CHARS * .85);
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
    var message = textarea.value.trim();
    if (!message) {
      setStatus('✗ Nachricht fehlt', 'err', 3000);
      textarea.focus();
      return Promise.resolve(false);
    }
    if (button) button.disabled = true;
    setStatus('⏳ SENDE...', 'sending');
    return client.send(message, { username: 'Broadcast', source: 'messenger-overlay' }).then(function (result) {
      if (result.ok) {
        textarea.value = '';
        updateCount(textarea);
        setStatus('✓ GESENDET', 'ok', 3500);
        return true;
      }
      var label = result.retryAfterMs
        ? 'Bitte ' + Math.max(1, Math.ceil(result.retryAfterMs / 1000)) + ' s warten'
        : (result.error || 'Fehler');
      setStatus('✗ ' + label, 'err', 5000);
      return false;
    }).finally(function () {
      if (button) button.disabled = false;
    });
  }

  function bindOverlayEvents() {
    var overlay = document.getElementById(OVERLAY_ID);
    var textarea = document.getElementById('s666MsgText');
    if (!overlay || !textarea || overlay.dataset.bound === '1') return;
    overlay.dataset.bound = '1';
    textarea.addEventListener('input', function () { updateCount(textarea); });
    overlay.addEventListener('click', function (event) {
      var emojiButton = event.target.closest && event.target.closest('.s666msg-emoji');
      if (!emojiButton) return;
      var emoji = emojiButton.getAttribute('data-emoji') || '';
      if (textarea.value.length + emoji.length > MAX_CHARS) return;
      var start = textarea.selectionStart || textarea.value.length;
      textarea.value = textarea.value.slice(0, start) + emoji + textarea.value.slice(start);
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      updateCount(textarea);
      textarea.focus();
    });
    document.getElementById('s666MsgClose').addEventListener('click', closeMessenger);
    document.getElementById('s666MsgBackdrop').addEventListener('click', closeMessenger);
    document.getElementById('s666MsgClear').addEventListener('click', function () {
      textarea.value = '';
      updateCount(textarea);
      setStatus('', '');
      textarea.focus();
    });
    document.getElementById('s666MsgSend').addEventListener('click', sendMessage);
    textarea.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  function ensureOverlay() {
    if (!document.getElementById(OVERLAY_ID)) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = buildOverlayHtml();
      document.body.appendChild(wrapper.firstElementChild);
    }
    bindOverlayEvents();
  }

  function openMessenger(prefill) {
    ensureOverlay();
    var overlay = document.getElementById(OVERLAY_ID);
    var textarea = document.getElementById('s666MsgText');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    if (typeof prefill === 'string') {
      textarea.value = prefill.slice(0, MAX_CHARS);
      updateCount(textarea);
    }
    setTimeout(function () { textarea.focus(); }, 80);
  }

  function desiredTarget() {
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
      button.textContent = 'MESSAGE';
      button.title = 'Broadcast-Nachricht senden';
      button.setAttribute('aria-label', 'Broadcast-Nachricht senden');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openMessenger();
      });
    }
    if (button.parentNode !== target) target.appendChild(button);
    return true;
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mountTrigger, 60);
  }

  function init() {
    injectCss();
    ensureOverlay();
    mountTrigger();
    [250, 800, 1800, 4000].forEach(function (delay) { setTimeout(mountTrigger, delay); });
    if (!observer && typeof MutationObserver === 'function') {
      observer = new MutationObserver(scheduleMount);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('resize', scheduleMount, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.S666Messenger = { open: openMessenger, close: closeMessenger, send: sendMessage, mount: mountTrigger };
})();
