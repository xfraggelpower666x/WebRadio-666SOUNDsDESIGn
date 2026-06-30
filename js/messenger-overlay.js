/*
   * FILE: js/messenger-overlay.js
   * ZWECK: Zentrales Messenger-Overlay fuer Desktop + iPhone
   * - Ein MSG-Button ueberall → oeffnet dasselbe Overlay
   * - Textarea (gross, komfortabel auf iPhone + Desktop)
   * - 30 Emojis in 3 Themen-Reihen (Musik / Party / Special)
   * - Zeichen-Zaehler (max 240)
   * - Verbindet mit bestehendem /api/player-alert System
   * - Kein Eingriff in Audio-Logik, worker.js, player-core.js
   */
  (function () {
    'use strict';

    var API_URL     = '/api/player-alert/send';
    var MAX_CHARS   = 240;
    var OVERLAY_ID  = 's666MsgOverlay';

    // ── Emoji-Sets (3 Reihen) ─────────────────────────────────────────────────
    var EMOJIS = [
      // Reihe 1 — Musik & Sound
      '🎵','🎶','🎧','🎤','🎸','🎹','🥁','🎺','🔥','⚡',
      // Reihe 2 — Party & Stimmung
      '❤️','💜','💙','🖤','🤘','😎','👽','💀','🎉','🥂',
      // Reihe 3 — Radio & Special
      '🚀','💫','✨','🌙','⭐','👊','💥','666','∞','★'
    ];

    // ── HTML des Overlays ─────────────────────────────────────────────────────
    function buildOverlayHtml() {
      var emojiRows = [0, 1, 2].map(function (row) {
        var btns = EMOJIS.slice(row * 10, row * 10 + 10).map(function (e) {
          return '<button type="button" class="s666msg-emoji" data-emoji="' + e + '">' + e + '</button>';
        }).join('');
        return '<div class="s666msg-emoji-row">' + btns + '</div>';
      }).join('');

      return [
        '<div id="s666MsgOverlay" class="s666msg-overlay" role="dialog" aria-modal="true" aria-label="Broadcast Messenger" hidden>',
          '<div class="s666msg-backdrop" id="s666MsgBackdrop"></div>',
          '<div class="s666msg-panel">',
            '<header class="s666msg-header">',
              '<span class="s666msg-title">📡 BROADCAST MESSAGE</span>',
              '<button type="button" class="s666msg-close" id="s666MsgClose" aria-label="Schliessen">✕</button>',
            '</header>',
            '<div class="s666msg-body">',
              '<textarea id="s666MsgText"',
                ' class="s666msg-textarea"',
                ' maxlength="' + MAX_CHARS + '"',
                ' rows="5"',
                ' placeholder="Nachricht an alle Hörer schreiben..." ',
                ' autocorrect="on" autocapitalize="sentences" spellcheck="true">',
              '</textarea>',
              '<div class="s666msg-meta">',
                '<span id="s666MsgCount" class="s666msg-count">0 / ' + MAX_CHARS + '</span>',
                '<span id="s666MsgStatus" class="s666msg-status"></span>',
              '</div>',
              '<div class="s666msg-emojis">',
                emojiRows,
              '</div>',
            '</div>',
            '<footer class="s666msg-footer">',
              '<button type="button" class="s666msg-btn-secondary" id="s666MsgClear">Leeren</button>',
              '<button type="button" class="s666msg-btn-send" id="s666MsgSend">📡 SENDEN</button>',
            '</footer>',
          '</div>',
        '</div>'
      ].join('');
    }

    // ── CSS ───────────────────────────────────────────────────────────────────
    function injectCss() {
      if (document.getElementById('s666MsgCss')) return;
      var s = document.createElement('style');
      s.id  = 's666MsgCss';
      s.textContent = [
        /* Overlay backdrop */
        '.s666msg-overlay{position:fixed;inset:0;z-index:99980;display:flex;align-items:center;justify-content:center;padding:16px;}',
        '.s666msg-overlay[hidden]{display:none!important;}',
        '.s666msg-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',

        /* Panel */
        '.s666msg-panel{',
          'position:relative;z-index:1;',
          'width:min(500px,95vw);max-height:90dvh;',
          'background:radial-gradient(circle at 10% 5%,rgba(255,61,187,.18),transparent 40%),',
            'radial-gradient(circle at 90% 15%,rgba(22,255,243,.14),transparent 40%),',
            'rgba(3,6,18,.97);',
          'border:1px solid rgba(22,255,243,.45);',
          'border-radius:20px;',
          'box-shadow:0 0 30px rgba(22,255,243,.22),0 0 36px rgba(255,61,187,.14),0 0 0 1px rgba(22,255,243,.08);',
          'display:flex;flex-direction:column;overflow:hidden;',
        '}',

        /* Header */
        '.s666msg-header{',
          'display:flex;align-items:center;justify-content:space-between;',
          'padding:14px 16px 12px;',
          'border-bottom:1px solid rgba(22,255,243,.18);',
          'background:rgba(22,255,243,.04);',
        '}',
        '.s666msg-title{',
          'font-family:"Courier New",Courier,monospace;',
          'font-size:13px;font-weight:900;letter-spacing:.12em;',
          'color:#16fff3;text-shadow:0 0 10px rgba(22,255,243,.6);',
        '}',
        '.s666msg-close{',
          'width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,61,187,.5);',
          'background:rgba(255,61,187,.08);color:#ff3dbb;',
          'font-size:14px;font-weight:900;cursor:pointer;line-height:1;',
          'display:flex;align-items:center;justify-content:center;',
          'transition:all .15s;flex-shrink:0;',
        '}',
        '.s666msg-close:hover{background:rgba(255,61,187,.22);border-color:#ff3dbb;}',

        /* Body */
        '.s666msg-body{padding:14px 16px 10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;}',

        /* Textarea */
        '.s666msg-textarea{',
          'width:100%;box-sizing:border-box;',
          'background:rgba(7,11,28,.92);',
          'border:1px solid rgba(22,255,243,.38);',
          'border-radius:12px;',
          'color:#eaffff;',
          'font-family:system-ui,-apple-system,sans-serif;',
          'font-size:15px;line-height:1.55;',
          'padding:12px 14px;',
          'resize:vertical;min-height:90px;',
          'outline:none;',
          'transition:border-color .2s,box-shadow .2s;',
          '-webkit-appearance:none;',
        '}',
        '.s666msg-textarea:focus{',
          'border-color:rgba(22,255,243,.75);',
          'box-shadow:0 0 14px rgba(22,255,243,.18);',
        '}',
        '.s666msg-textarea::placeholder{color:rgba(200,220,255,.35);}',

        /* Meta (counter + status) */
        '.s666msg-meta{display:flex;align-items:center;justify-content:space-between;min-height:18px;}',
        '.s666msg-count{font-family:"Courier New",monospace;font-size:11px;color:rgba(22,255,243,.5);letter-spacing:.05em;}',
        '.s666msg-count.near-limit{color:#ff3dbb;}',
        '.s666msg-status{font-size:11px;font-weight:700;font-family:"Courier New",monospace;letter-spacing:.06em;}',
        '.s666msg-status.ok{color:#16fff3;}',
        '.s666msg-status.err{color:#ff3d68;}',
        '.s666msg-status.sending{color:#ffaa26;animation:s666MsgPulse .8s ease-in-out infinite;}',
        '@keyframes s666MsgPulse{0%,100%{opacity:1}50%{opacity:.4}}',

        /* Emoji rows */
        '.s666msg-emojis{display:flex;flex-direction:column;gap:5px;}',
        '.s666msg-emoji-row{display:flex;gap:4px;flex-wrap:wrap;}',
        '.s666msg-emoji{',
          'font-size:18px;line-height:1;',
          'padding:6px;border-radius:8px;',
          'border:1px solid rgba(22,255,243,.18);',
          'background:rgba(22,255,243,.04);',
          'cursor:pointer;transition:all .12s;',
          'user-select:none;-webkit-user-select:none;',
          '-webkit-tap-highlight-color:transparent;',
        '}',
        '.s666msg-emoji:hover,.s666msg-emoji:active{background:rgba(22,255,243,.16);border-color:rgba(22,255,243,.5);transform:scale(1.18);}',

        /* Footer */
        '.s666msg-footer{',
          'display:flex;gap:10px;padding:12px 16px 14px;',
          'border-top:1px solid rgba(22,255,243,.12);',
          'background:rgba(22,255,243,.02);',
        '}',
        '.s666msg-btn-secondary,.s666msg-btn-send{',
          'border-radius:999px;font-family:"Courier New",monospace;',
          'font-weight:900;font-size:12px;letter-spacing:.08em;',
          'cursor:pointer;padding:9px 18px;transition:all .15s;',
          'border:1px solid rgba(22,255,243,.4);',
        '}',
        '.s666msg-btn-secondary{',
          'background:rgba(22,255,243,.04);color:rgba(22,255,243,.6);flex:0 0 auto;',
        '}',
        '.s666msg-btn-secondary:hover{background:rgba(22,255,243,.1);color:#16fff3;}',
        '.s666msg-btn-send{',
          'background:linear-gradient(135deg,rgba(22,255,243,.18),rgba(255,61,187,.14));',
          'color:#16fff3;flex:1;font-size:13px;',
          'box-shadow:0 0 14px rgba(22,255,243,.18);',
          'border-color:rgba(22,255,243,.55);',
        '}',
        '.s666msg-btn-send:hover{',
          'background:linear-gradient(135deg,rgba(22,255,243,.28),rgba(255,61,187,.22));',
          'box-shadow:0 0 20px rgba(22,255,243,.3);',
        '}',
        '.s666msg-btn-send:disabled{opacity:.4;cursor:default;}',

        /* MSG trigger button (used on desktop in player + iPhone mobile row) */
        '.s666msg-trigger{',
          'display:inline-flex;align-items:center;gap:5px;',
          'padding:5px 12px;border-radius:999px;',
          'border:1px solid rgba(22,255,243,.5);',
          'background:rgba(7,11,28,.85);',
          'color:#16fff3;font-family:"Courier New",monospace;',
          'font-size:11px;font-weight:900;letter-spacing:.08em;',
          'cursor:pointer;transition:all .15s;',
          'user-select:none;-webkit-tap-highlight-color:transparent;',
        '}',
        '.s666msg-trigger:hover{background:rgba(22,255,243,.12);border-color:#16fff3;}',

        /* Mobile safe area */
        '@media(max-width:760px){',
          '.s666msg-panel{width:100%;max-height:88dvh;border-radius:20px 20px 0 0;}',
          '.s666msg-overlay{align-items:flex-end;padding:0;}',
          '.s666msg-textarea{font-size:16px!important;}',
          '.s666msg-emoji{font-size:22px;padding:8px;}',
          '.s666msg-btn-send,.s666msg-btn-secondary{padding:12px 18px;font-size:13px;}',
        '}',
      ].join('');
      document.head.appendChild(s);
    }

    // ── Overlay DOM ───────────────────────────────────────────────────────────
    function ensureOverlay() {
      if (document.getElementById(OVERLAY_ID)) return;
      var wrapper = document.createElement('div');
      wrapper.innerHTML = buildOverlayHtml();
      document.body.appendChild(wrapper.firstElementChild);
      bindOverlayEvents();
    }

    // ── Events ────────────────────────────────────────────────────────────────
    function bindOverlayEvents() {
      var overlay  = document.getElementById(OVERLAY_ID);
      var textarea = document.getElementById('s666MsgText');
      var counter  = document.getElementById('s666MsgCount');
      var status   = document.getElementById('s666MsgStatus');
      var sendBtn  = document.getElementById('s666MsgSend');
      var clearBtn = document.getElementById('s666MsgClear');
      var closeBtn = document.getElementById('s666MsgClose');
      var backdrop = document.getElementById('s666MsgBackdrop');

      if (!overlay || !textarea) return;

      // Character counter
      textarea.addEventListener('input', function () {
        var len = textarea.value.length;
        counter.textContent = len + ' / ' + MAX_CHARS;
        counter.classList.toggle('near-limit', len > MAX_CHARS * 0.85);
      });

      // Emoji buttons
      overlay.addEventListener('click', function (e) {
        var btn = e.target.closest('.s666msg-emoji');
        if (!btn) return;
        var emoji = btn.getAttribute('data-emoji');
        var pos   = textarea.selectionStart;
        var val   = textarea.value;
        textarea.value = val.slice(0, pos) + emoji + val.slice(pos);
        textarea.selectionStart = textarea.selectionEnd = pos + emoji.length;
        textarea.focus();
        textarea.dispatchEvent(new Event('input'));
      });

      // Close
      function closeOverlay() {
        overlay.hidden = true;
        document.body.style.overflow = '';
      }
      closeBtn && closeBtn.addEventListener('click', closeOverlay);
      backdrop && backdrop.addEventListener('click', closeOverlay);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) closeOverlay();
      });

      // Clear
      clearBtn && clearBtn.addEventListener('click', function () {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
        status.textContent = '';
        status.className   = 's666msg-status';
      });

      // Send
      sendBtn && sendBtn.addEventListener('click', function () { sendMessage(); });
      textarea.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendMessage();
      });
    }

    function sendMessage() {
      var overlay  = document.getElementById(OVERLAY_ID);
      var textarea = document.getElementById('s666MsgText');
      var status   = document.getElementById('s666MsgStatus');
      var sendBtn  = document.getElementById('s666MsgSend');
      if (!textarea) return;

      var msg = textarea.value.trim();
      if (!msg) { textarea.focus(); return; }

      sendBtn.disabled = true;
      status.textContent = '⏳ SENDE...';
      status.className   = 's666msg-status sending';

      // Try existing playerAlertPcSend logic first (re-use existing backend)
      var existingSend = document.getElementById('playerAlertPcSend');
      var existingText = document.getElementById('playerAlertPcText');
      if (existingSend && existingText) {
        existingText.value = msg;
        existingSend.click();
        setTimeout(function () {
          sendBtn.disabled   = false;
          status.textContent = '✓ GESENDET';
          status.className   = 's666msg-status ok';
          textarea.value     = '';
          textarea.dispatchEvent(new Event('input'));
          setTimeout(function () { status.textContent = ''; status.className = 's666msg-status'; }, 3000);
        }, 800);
        return;
      }

      // Direct API fallback
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg, source: 'messenger-overlay' }),
        cache: 'no-store'
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        sendBtn.disabled   = false;
        if (d.ok || d.success) {
          status.textContent = '✓ GESENDET';
          status.className   = 's666msg-status ok';
          textarea.value     = '';
          textarea.dispatchEvent(new Event('input'));
        } else {
          status.textContent = '✗ ' + (d.message || 'Fehler');
          status.className   = 's666msg-status err';
        }
        setTimeout(function () { status.textContent = ''; status.className = 's666msg-status'; }, 4000);
      })
      .catch(function (err) {
        sendBtn.disabled   = false;
        status.textContent = '✗ Verbindungsfehler';
        status.className   = 's666msg-status err';
        setTimeout(function () { status.textContent = ''; status.className = 's666msg-status'; }, 4000);
      });
    }

    // ── Open / Close API ──────────────────────────────────────────────────────
    function openMessenger(prefill) {
      ensureOverlay();
      var overlay  = document.getElementById(OVERLAY_ID);
      var textarea = document.getElementById('s666MsgText');
      if (!overlay) return;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      if (prefill && textarea) {
        textarea.value = prefill;
        textarea.dispatchEvent(new Event('input'));
      }
      setTimeout(function () { if (textarea) textarea.focus(); }, 120);
    }

    function closeMessenger() {
      var overlay = document.getElementById(OVERLAY_ID);
      if (overlay) overlay.hidden = true;
      document.body.style.overflow = '';
    }

    function cleanupLegacyMessengerMenus() {
      [
        '#playerAlertPcBox',
        '#mffAlertOpen',
        '#mffAlertEditorBackdrop',
        '#s666PlayerAlertComposer',
        '#s666PlayerAlertMobileSlot'
      ].forEach(function (sel) {
        Array.prototype.slice.call(document.querySelectorAll(sel)).forEach(function (el) {
          try { el.remove(); }
          catch (_) { if (el.style) el.style.display = 'none'; }
        });
      });
    }

    // One authoritative MESSAGE trigger for desktop and mobile.
    function mountMsgTriggers() {
      cleanupLegacyMessengerMenus();
      var mobileTarget = window.innerWidth <= 760 ? document.getElementById('s666MobileExtraRow') : null;
      var target = mobileTarget || document.getElementById('s666MessageActionSlot') ||
        document.getElementById('s666MobileExtraRow');
      if (!target) return;

      var btn = document.getElementById('s666MessageControlButton');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 's666MessageControlButton';
        btn.type = 'button';
        btn.className = 's666msg-trigger';
        btn.textContent = 'MESSAGE';
        btn.setAttribute('title', 'Broadcast-Nachricht senden');
        btn.setAttribute('aria-label', 'Broadcast-Nachricht senden');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openMessenger();
        });
      }
      if (btn.parentNode !== target) target.appendChild(btn);
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    function init() {
      injectCss();
      cleanupLegacyMessengerMenus();
      // Mount trigger buttons — retry until DOM is ready
      var attempts = 0;
      var t = setInterval(function () {
        mountMsgTriggers();
        if (document.getElementById('s666MessageControlButton') || ++attempts > 20) {
          clearInterval(t);
        }
      }, 500);
      setInterval(function () {
        cleanupLegacyMessengerMenus();
        mountMsgTriggers();
      }, 2500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.S666Messenger = {
      open:  openMessenger,
      close: closeMessenger,
      send:  sendMessage
    };

  })();
