/*
   * FILE: js/skip-control.js
   * ZWECK: Skip-Button im oeffentlichen Player
   * - Vote-Skip fuer alle Hoerer (POST /api/skip/vote via DJ Panel API)
   * - Admin-Sofort-Skip fuer Dirk (POST /api/admin-skip mit Passwort)
   * - Zeigt aktuellen Stimmenstand live an
   * - Kein Eingriff in worker.js oder player-core.js
   */
  (function () {
    'use strict';

    var API_BASE  = window.S666_DJ_PANEL_API  || '';
    var VOTER_KEY = 's666_voter_id';
    var VOTED_KEY = 's666_voted_song';
    var POLL_MS   = 6000;

    // ─── Voter-ID (persistent per Browser) ────────────────────────────────────
    function getVoterId() {
      var id = localStorage.getItem(VOTER_KEY);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2,9) + '_' + Date.now().toString(36);
        localStorage.setItem(VOTER_KEY, id);
      }
      return id;
    }

    function hasVotedCurrentSong() {
      return sessionStorage.getItem(VOTED_KEY) === 'current';
    }

    function markVotedCurrentSong() {
      sessionStorage.setItem(VOTED_KEY, 'current');
    }

    function clearVotedSong() {
      sessionStorage.removeItem(VOTED_KEY);
    }

    // ─── Skip Vote UI ──────────────────────────────────────────────────────────
    function mountSkipButtons() {
      // Don't mount twice
      if (document.getElementById('s666SkipBar')) return;

      // Find a good anchor — prefer the control toolbar area
      var anchors = [
        '#playBtn', '.control-toolbar', '.icon-btn-main',
        '.player-controls', '#mffControls', '.mff-controls'
      ];
      var anchor = null;
      for (var i = 0; i < anchors.length; i++) {
        anchor = document.querySelector(anchors[i]);
        if (anchor) break;
      }
      if (!anchor) return; // Not ready yet — retry

      var isMobile = window.innerWidth <= 760 ||
        document.documentElement.getAttribute('data-device') === 'mobile';

      var bar = document.createElement('div');
      bar.id = 's666SkipBar';
      bar.className = 's666-skip-bar' + (isMobile ? ' s666-skip-bar--mobile' : '');
      bar.innerHTML = [
        '<button id="s666VoteSkipBtn" class="s666-skip-vote-btn" type="button" title="Naechsten Song waehlen">',
          '<span class="s666-skip-icon">\u23ED</span>',
          '<span id="s666VoteCount" class="s666-skip-count">0/3</span>',
        '</button>',
        '<button id="s666AdminSkipBtn" class="s666-skip-admin-btn" type="button" title="Admin: Sofort skippen">',
          '<span class="s666-skip-icon">\u26A1</span>',
        '</button>'
      ].join('');

      // Insert after the anchor's parent control group
      var parent = anchor.parentNode;
      if (parent) parent.insertBefore(bar, anchor.nextSibling);
      else document.body.appendChild(bar);

      // Inject CSS
      injectSkipCss();

      // Bind events
      document.getElementById('s666VoteSkipBtn').addEventListener('click', function () {
        handleVoteClick();
      });
      document.getElementById('s666AdminSkipBtn').addEventListener('click', function () {
        handleAdminSkip();
      });

      // Start polling vote count
      refreshVoteCount();
      setInterval(refreshVoteCount, POLL_MS);
    }

    // ─── Vote logic ────────────────────────────────────────────────────────────
    function handleVoteClick() {
      if (!API_BASE) { showToast('DJ Panel API nicht konfiguriert.'); return; }
      if (hasVotedCurrentSong()) { showToast('Du hast bereits gevotet!'); return; }

      var btn = document.getElementById('s666VoteSkipBtn');
      if (btn) { btn.disabled = true; btn.classList.add('voted'); }

      fetch(API_BASE + '/skip/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: getVoterId(), songId: 'current' }),
        cache: 'no-store'
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        markVotedCurrentSong();
        updateVoteDisplay(d.votes, d.threshold);
        if (d.shouldSkip) {
          showToast('Genug Votes! Naechster Song...');
          triggerAutoSkip();
        } else {
          showToast('Vote gezaehlt! ' + d.votes + '/' + d.threshold);
        }
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.classList.remove('voted'); }
        showToast('Vote fehlgeschlagen.');
      });
    }

    function refreshVoteCount() {
      if (!API_BASE) return;
      fetch(API_BASE + '/skip/votes', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        updateVoteDisplay(d.votes, d.threshold);
        // New song? Reset voted flag if song changed
        if (d.songId && d.songId !== sessionStorage.getItem(VOTED_KEY + '_id')) {
          clearVotedSong();
          sessionStorage.setItem(VOTED_KEY + '_id', d.songId || 'current');
          var btn = document.getElementById('s666VoteSkipBtn');
          if (btn) { btn.disabled = false; btn.classList.remove('voted'); }
        }
      })
      .catch(function () {});
    }

    function updateVoteDisplay(votes, threshold) {
      var el = document.getElementById('s666VoteCount');
      if (el) el.textContent = (votes || 0) + '/' + (threshold || 3);
      var btn = document.getElementById('s666VoteSkipBtn');
      if (btn) btn.setAttribute('data-votes', String(votes || 0));
    }

    function triggerAutoSkip() {
      if (!API_BASE) return;
      fetch(API_BASE + '/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'auto-vote-threshold', song: 'current' }),
        cache: 'no-store'
      }).catch(function () {});
    }

    // ─── Admin Skip (Passwort-Dialog) ──────────────────────────────────────────
    function handleAdminSkip() {
      if (!API_BASE) { showToast('DJ Panel API nicht konfiguriert.'); return; }
      var pw = window.prompt('Admin-Passwort:');
      if (!pw) return;

      fetch(API_BASE + '/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': pw
        },
        body: JSON.stringify({ source: 'admin-player-button', song: 'current' }),
        cache: 'no-store'
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) { showToast('\u23ED Admin Skip ausgefuehrt!'); }
        else { showToast('Fehler: ' + (d.message || 'Unbekannt')); }
      })
      .catch(function () { showToast('Admin Skip fehlgeschlagen.'); });
    }

    // ─── Toast Notification ────────────────────────────────────────────────────
    function showToast(msg) {
      var t = document.getElementById('s666SkipToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 's666SkipToast';
        t.className = 's666-skip-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('visible');
      clearTimeout(t.__timer);
      t.__timer = setTimeout(function () { t.classList.remove('visible'); }, 2800);
    }

    // ─── Inline CSS ────────────────────────────────────────────────────────────
    function injectSkipCss() {
      if (document.getElementById('s666SkipCss')) return;
      var style = document.createElement('style');
      style.id = 's666SkipCss';
      style.textContent = [
        '.s666-skip-bar{display:flex;align-items:center;gap:6px;margin:4px 0;}',
        '.s666-skip-vote-btn,.s666-skip-admin-btn{',
          'display:inline-flex;align-items:center;gap:4px;',
          'padding:4px 10px;border-radius:999px;border:1px solid rgba(22,255,243,.55);',
          'background:rgba(7,11,28,.85);color:#16fff3;font-size:12px;font-weight:900;',
          'letter-spacing:.07em;cursor:pointer;transition:all .15s;user-select:none;',
          'font-family:monospace;',
        '}',
        '.s666-skip-vote-btn:hover{background:rgba(22,255,243,.15);border-color:#16fff3;}',
        '.s666-skip-vote-btn.voted{border-color:rgba(22,255,243,.25);color:rgba(22,255,243,.4);cursor:default;}',
        '.s666-skip-vote-btn[data-votes="0"] .s666-skip-count{opacity:.5;}',
        '.s666-skip-admin-btn{border-color:rgba(255,61,187,.55);color:#ff3dbb;}',
        '.s666-skip-admin-btn:hover{background:rgba(255,61,187,.15);border-color:#ff3dbb;}',
        '.s666-skip-icon{font-size:14px;line-height:1;}',
        '.s666-skip-toast{',
          'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);',
          'background:rgba(7,11,28,.95);color:#16fff3;border:1px solid rgba(22,255,243,.5);',
          'border-radius:12px;padding:8px 18px;font-size:13px;font-weight:700;',
          'font-family:monospace;letter-spacing:.08em;z-index:99999;',
          'opacity:0;pointer-events:none;transition:all .25s;',
        '}',
        '.s666-skip-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}',
        '@media(max-width:760px){',
          '.s666-skip-bar{justify-content:center;margin:6px 0;}',
          '.s666-skip-vote-btn,.s666-skip-admin-btn{padding:6px 14px;font-size:13px;}',
        '}'
      ].join('');
      document.head.appendChild(style);
    }

    // ─── Boot: retry until player DOM is ready ─────────────────────────────────
    var mountAttempts = 0;
    var mountTimer = setInterval(function () {
      mountSkipButtons();
      if (document.getElementById('s666SkipBar') || ++mountAttempts > 30) {
        clearInterval(mountTimer);
      }
    }, 600);

    // Expose globally for DJ Panel integration
    window.S666SkipControl = {
      setApiBase: function (url) {
        API_BASE = url;
        window.S666_DJ_PANEL_API = url;
        if (window.S666MediaSession) window.S666MediaSession.setDJPanelApi(url);
      },
      refreshVotes: refreshVoteCount
    };

  })();
  