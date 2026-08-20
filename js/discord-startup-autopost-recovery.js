/*
 * 666SOUNDsDESIGn — Discord startup Now Playing recovery guard.
 * Repairs only the boot race where the authoritative Discord addon initializes before
 * a stable audio-playing + metadata state exists. It never posts directly to Discord;
 * it delegates to S666DiscordPlayerAddonV3.postTrackIfChanged so the existing Worker
 * route and global Durable Object dedupe gate remain authoritative.
 */
(function () {
  'use strict';
  if (window.__S666_DISCORD_STARTUP_RECOVERY__) return;
  window.__S666_DISCORD_STARTUP_RECOVERY__ = true;

  var VERSION = '1.0.0-20260821';
  var RETRY_MS = 1200;
  var START_DELAY_MS = 2600;
  var MAX_WAIT_MS = 24000;
  var startedAt = Date.now();
  var timer = 0;
  var done = false;
  var running = false;

  function dispatch(phase, detail) {
    try {
      window.dispatchEvent(new CustomEvent('s666:discord-startup-recovery', {
        detail: Object.assign({ phase: phase, version: VERSION }, detail || {})
      }));
    } catch (_) {}
  }

  function stop(reason) {
    done = true;
    clearTimeout(timer);
    timer = 0;
    dispatch('done', { reason: reason || 'complete' });
  }

  function schedule(delay) {
    if (done) return;
    clearTimeout(timer);
    timer = setTimeout(attempt, typeof delay === 'number' ? delay : RETRY_MS);
  }

  function audioIsPlaying() {
    return Array.prototype.slice.call(document.querySelectorAll('audio')).some(function (audio) {
      return audio && !audio.paused && !audio.ended && Number(audio.readyState || 0) >= 2;
    });
  }

  function usefulTrack(api) {
    if (!api || typeof api.readTrackFromDom !== 'function') return false;
    var data = api.readTrackFromDom() || {};
    var text = String(data.track || data.nowPlaying || data.title || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return !/^(loading metadata|metadata loading|metadata unavailable|loading|unknown|live stream)$/i.test(text);
  }

  function normalStartupCompleted(detail) {
    var phase = String(detail && detail.phase || '');
    if (phase === 'startup-autopost-success' || phase === 'startup-autopost-warning') return true;
    if (phase !== 'startup-autopost-skipped') return false;
    var reason = String((detail && detail.reason) || (detail && detail.data && detail.data.reason) || '');
    return reason === 'already-posted-by-watcher' || reason === 'global_duplicate_track';
  }

  window.addEventListener('s666:discord-state', function (event) {
    var detail = event.detail || {};
    if (normalStartupCompleted(detail)) stop('authoritative-startup-complete');
  });

  function attempt() {
    timer = 0;
    if (done || running) return;
    if (Date.now() - startedAt >= MAX_WAIT_MS) {
      stop('startup-window-exhausted');
      return;
    }
    if (!audioIsPlaying()) {
      schedule(RETRY_MS);
      return;
    }

    var api = window.S666DiscordPlayerAddonV3;
    if (!api || typeof api.postTrackIfChanged !== 'function' || typeof api.transportMode !== 'function') {
      schedule(RETRY_MS);
      return;
    }
    if (api.transportMode() !== 'worker') {
      stop('non-worker-transport');
      return;
    }
    if (!usefulTrack(api)) {
      schedule(RETRY_MS);
      return;
    }

    running = true;
    dispatch('attempt', { reason: 'missed-startup-playing-race' });
    Promise.resolve(api.postTrackIfChanged(true, 'startup-recovery-missed-playing-race'))
      .then(function (result) {
        running = false;
        if (done) return;
        if (result && result.busy) {
          schedule(RETRY_MS);
          return;
        }
        if (result && result.skipped === true) {
          var reason = String(result.reason || '');
          if (reason === 'global_duplicate_track' || result.deduped === true || result.duplicate === true) {
            stop('global-dedupe-confirmed');
            return;
          }
          if (reason === 'no_track_key' || reason === 'audio_not_playing' || reason === 'request_in_flight') {
            schedule(RETRY_MS);
            return;
          }
        }
        stop('recovery-post-complete');
      })
      .catch(function (error) {
        running = false;
        dispatch('retry', { error: error && error.message ? error.message : String(error) });
        schedule(RETRY_MS);
      });
  }

  function armFromPlaying(event) {
    if (done) return;
    if (event && event.target && String(event.target.tagName || '').toLowerCase() !== 'audio') return;
    schedule(START_DELAY_MS);
  }

  document.addEventListener('playing', armFromPlaying, true);
  if (audioIsPlaying()) schedule(START_DELAY_MS);
  else schedule(RETRY_MS);

  window.S666DiscordStartupRecovery = Object.freeze({
    version: VERSION,
    active: function () { return !done; }
  });
})();
