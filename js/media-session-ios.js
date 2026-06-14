/*
   * FILE: js/media-session-ios.js
   * ZWECK: iOS Lock-Screen Controls + Auto-Resume nach Anruf/Unterbrechung
   * - navigator.mediaSession: Play/Pause/Skip auf Sperrbildschirm + Control Center
   * - Audio-Unterbrechung (Anruf, Notification): automatischer Neustart
   * - App-Wechsel: Audio bleibt / startet neu beim Zurückkehren
   * - Kein Eingriff in worker.js, player-core.js Audio-Logik
   */
  (function () {
    'use strict';

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function getAudio() {
      return document.getElementById('radio') || document.querySelector('audio');
    }

    function isUserStopped() {
      // Respect manual stop — don't resume if user intentionally stopped
      return (
        document.documentElement.getAttribute('data-phase10-stream-wanted') === '0' ||
        document.documentElement.getAttribute('data-user-stopped') === '1' ||
        (window.S666_AUDIO_AUTHORITY && window.S666_AUDIO_AUTHORITY.userStopped === true)
      );
    }

    function getCurrentSrc() {
      var audio = getAudio();
      if (!audio) return '/stream';
      var src = audio.currentSrc || audio.getAttribute('src') || '/stream';
      // Strip cache-bust params to get clean URL
      return src.replace(/[?&][rt]=[0-9]+/, '').replace(/[?&]r=[0-9]+/, '') || '/stream';
    }

    function safePlay(reason) {
      if (isUserStopped()) return;
      var audio = getAudio();
      if (!audio) return;

      // Resume AudioContext first
      ['__radioAudioContext', '__mffAudioContext'].forEach(function (key) {
        var ctx = window[key];
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(function () {});
        }
      });

      // If audio is already playing, nothing to do
      if (!audio.paused) return;

      var src = getCurrentSrc();
      var cacheBust = src + (src.indexOf('?') > -1 ? '&' : '?') + 'r=' + Date.now();

      try {
        // For interruption recovery: reload src to force reconnect
        audio.setAttribute('src', cacheBust);
        audio.load();
        var p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function (err) {
            // AbortError = another play() is pending, that's OK
            if (err && err.name !== 'AbortError') {
              console.warn('[media-session-ios] play() failed (' + reason + '):', err.message || err);
            }
          });
        }
        document.documentElement.setAttribute('data-media-session-last-resume', reason || 'unknown');
      } catch (e) {
        console.warn('[media-session-ios] safePlay error:', e);
      }
    }

    // ─── MediaSession API (Lock Screen / Control Center) ──────────────────────
    var currentMeta = {
      title: '666SOUNDsDESIGn WebRadio',
      artist: 'RadioBotAI DJ',
      album: '666SOUNDsDESIGn',
      artwork: '/assets/icons/radiobot-ai-dj-icon.png'
    };

    function updateMediaSession(meta) {
      if (!('mediaSession' in navigator)) return;

      if (meta) {
        if (meta.title) currentMeta.title  = meta.title;
        if (meta.artist) currentMeta.artist = meta.artist;
      }

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:   currentMeta.title,
          artist:  currentMeta.artist,
          album:   currentMeta.album,
          artwork: [
            { src: currentMeta.artwork, sizes: '512x512', type: 'image/png' },
            { src: '/assets/icons/radiobot-ai-badge.png', sizes: '256x256', type: 'image/png' }
          ]
        });
      } catch (e) {}
    }

    function setMediaSessionState(state) {
      if (!('mediaSession' in navigator)) return;
      try { navigator.mediaSession.playbackState = state; } catch (e) {}
    }

    function installMediaSessionHandlers() {
      if (!('mediaSession' in navigator)) return;

      // Play
      try {
        navigator.mediaSession.setActionHandler('play', function () {
          document.documentElement.setAttribute('data-phase10-stream-wanted', '1');
          document.documentElement.removeAttribute('data-user-stopped');
          safePlay('mediasession-play');
          setMediaSessionState('playing');
        });
      } catch (e) {}

      // Pause
      try {
        navigator.mediaSession.setActionHandler('pause', function () {
          var audio = getAudio();
          if (audio) audio.pause();
          setMediaSessionState('paused');
          document.documentElement.setAttribute('data-phase10-stream-wanted', '0');
        });
      } catch (e) {}

      // Stop
      try {
        navigator.mediaSession.setActionHandler('stop', function () {
          var audio = getAudio();
          if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
          setMediaSessionState('none');
          document.documentElement.setAttribute('data-phase10-stream-wanted', '0');
          document.documentElement.setAttribute('data-user-stopped', '1');
        });
      } catch (e) {}

      // Next track = Vote Skip (ruft DJ Panel API)
      try {
        navigator.mediaSession.setActionHandler('nexttrack', function () {
          submitSkipVote('mediasession-nexttrack');
        });
      } catch (e) {}

      // Seek: not applicable for live radio — disable
      try { navigator.mediaSession.setActionHandler('seekbackward', null); } catch (e) {}
      try { navigator.mediaSession.setActionHandler('seekforward', null); } catch (e) {}
      try { navigator.mediaSession.setActionHandler('seekto', null); } catch (e) {}
    }

    // ─── Skip Vote integration ────────────────────────────────────────────────
    function submitSkipVote(reason) {
      var apiBase = window.S666_DJ_PANEL_API || '';
      if (!apiBase) return; // Only works when DJ Panel API URL is configured
      var voterId = getOrCreateVoterId();
      fetch(apiBase + '/skip/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId }),
        cache: 'no-store'
      }).catch(function () {});
    }

    function getOrCreateVoterId() {
      var key = 's666_voter_id';
      var id = localStorage.getItem(key);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    }

    // ─── Sync MediaSession with audio element state ───────────────────────────
    function bindAudioEvents() {
      var audio = getAudio();
      if (!audio || audio.__mediaSessionBound) return;
      audio.__mediaSessionBound = true;

      audio.addEventListener('play', function () {
        setMediaSessionState('playing');
        updateMediaSession();
      }, true);

      audio.addEventListener('pause', function () {
        setMediaSessionState('paused');
      }, true);

      audio.addEventListener('playing', function () {
        setMediaSessionState('playing');
      }, true);

      // KEY FIX: iOS fires 'ended' when interrupted by phone call / notification
      // If user didn't manually stop → auto-resume
      audio.addEventListener('ended', function () {
        document.documentElement.setAttribute('data-media-session-ended', Date.now());
        if (isUserStopped()) return;
        // Wait briefly then attempt recovery (iOS needs a tick)
        setTimeout(function () { safePlay('audio-ended-recovery'); }, 800);
      }, true);

      // Also handle 'error' + 'stalled' with recovery
      audio.addEventListener('error', function () {
        if (isUserStopped()) return;
        setTimeout(function () { safePlay('audio-error-recovery'); }, 2500);
      }, true);
    }

    // ─── App switching / visibility ───────────────────────────────────────────
    var lastHiddenAt = 0;

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        lastHiddenAt = Date.now();
        return;
      }
      // Returned to app
      var hiddenMs = Date.now() - lastHiddenAt;
      if (isUserStopped()) return;

      var audio = getAudio();
      if (!audio) return;

      // If hidden for < 2 seconds: probably just a notification — try resume context
      if (hiddenMs < 2000) {
        ['__radioAudioContext', '__mffAudioContext'].forEach(function (key) {
          var ctx = window[key];
          if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
        });
        return;
      }

      // If hidden longer and audio is now paused/ended → restart
      if (audio.paused) {
        setTimeout(function () { safePlay('visibility-return-' + Math.round(hiddenMs/1000) + 's'); }, 400);
      }
    }, true);

    // Page restored from bfcache (back/forward navigation on iOS)
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      if (isUserStopped()) return;
      setTimeout(function () {
        var audio = getAudio();
        if (audio && audio.paused) safePlay('pageshow-persisted');
      }, 300);
    }, { passive: true });

    // ─── Watch now-playing metadata and update lock screen ───────────────────
    function watchNowPlaying() {
      var lastTitle = '';
      setInterval(function () {
        var ticker = document.getElementById('nowPlayingTicker');
        var metaLine = document.getElementById('metaLine');
        var title = (ticker && ticker.textContent.trim()) ||
                    (metaLine && metaLine.textContent.trim()) || '';
        if (title && title !== lastTitle && !title.match(/loading|connecting|starting/i)) {
          lastTitle = title;
          // Try to split "Artist - Title" format
          var parts = title.split(' - ');
          if (parts.length >= 2) {
            updateMediaSession({ title: parts.slice(1).join(' - ').trim(), artist: parts[0].trim() });
          } else {
            updateMediaSession({ title: title, artist: '666SOUNDsDESIGn' });
          }
        }
      }, 3000);
    }

    // ─── Boot ────────────────────────────────────────────────────────────────
    function init() {
      installMediaSessionHandlers();
      updateMediaSession();

      // Bind to audio element — retry until it exists in DOM
      var bindAttempts = 0;
      var bindTimer = setInterval(function () {
        bindAudioEvents();
        if (getAudio() && getAudio().__mediaSessionBound) {
          clearInterval(bindTimer);
        }
        if (++bindAttempts > 20) clearInterval(bindTimer);
      }, 500);

      watchNowPlaying();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // Expose for other scripts
    window.S666MediaSession = {
      update: updateMediaSession,
      safePlay: safePlay,
      setDJPanelApi: function (url) { window.S666_DJ_PANEL_API = url; }
    };

  })();
  