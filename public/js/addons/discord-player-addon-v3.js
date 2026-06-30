/*
 * 666SOUNDsDESIGn Discord Player Add-on V4 audit repair.
 * One shared admin Bearer; no second Discord password/code gate; no duplicate panels.
 */
(function () {
  'use strict';
  if (window.S666DiscordPlayerAddonV3 && window.S666DiscordPlayerAddonV3.auditRepair) return;

  var VERSION = 'V4.0-20260625-SHARED-ADMIN-AUTH';
  var inFlight = false;
  var watcherTimer = 0;
  var lastTrackKey = '';
  var lastPostedKey = '';

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 500);
  }

  function readText(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var el = document.querySelector(selectors[i]);
      var value = el && clean(el.textContent || el.value || '', 500);
      if (value) return value;
    }
    return '';
  }

  function readImage(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var el = document.querySelector(selectors[i]);
      var value = el && clean(el.currentSrc || el.src || el.getAttribute('src') || '', 1000);
      if (value) return value;
    }
    return '';
  }

  function readTrackFromDom() {
    var title = readText(['#trackTitle', '#mffTrackTitle', '#nowPlayingTitle', '[data-now-playing-title]']);
    var artist = readText(['#trackArtist', '#mffTrackArtist', '#nowPlayingArtist', '[data-now-playing-artist]']);
    var dj = readText(['#statusDj', '#mffDj', '[data-dj-name]']) || '666 DJ';
    var listeners = readText(['#statusListeners', '#mffListeners', '[data-listeners]']);
    var bitrate = readText(['#statusBitrate', '#mffBitrate', '[data-bitrate]']);
    var artwork = readImage(['#coverImage', '#mffCoverImage', '#nowPlayingCover', '[data-now-playing-cover] img']);
    var nowPlaying = clean([artist, title].filter(Boolean).join(' - '), 500);
    return {
      title: title,
      artist: artist,
      track: nowPlaying,
      nowPlaying: nowPlaying,
      dj: dj,
      listeners: listeners,
      bitrate: bitrate,
      artwork: artwork,
      playerUrl: location.origin + '/',
      source: 'webradio-player'
    };
  }

  function trackKey(data) {
    return clean([data.artist, data.title, data.track, data.nowPlaying].filter(Boolean).join('|').toLowerCase(), 800);
  }

  function dispatch(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:discord-state', { detail: detail || {} })); } catch (_) {}
  }

  async function authorizedPost(path, payload) {
    if (!window.S666AdminAuth) throw new Error('admin_auth_client_missing');
    if (inFlight) throw new Error('discord_request_in_flight');
    inFlight = true;
    dispatch({ phase: 'sending', path: path });
    try {
      var response = await window.S666AdminAuth.fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(payload || {})
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok !== true) throw new Error(clean(data.error || data.message || ('HTTP ' + response.status), 300));
      dispatch({ phase: 'success', path: path, data: data });
      return data;
    } catch (error) {
      dispatch({ phase: 'error', path: path, error: error && error.message ? error.message : String(error) });
      throw error;
    } finally {
      inFlight = false;
    }
  }

  function ensureMessageOverlay() {
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666DiscordMessageOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden s666-discord-gate--message';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Admin session active. Message to Discord:</div>' +
      '<textarea id="s666DiscordMessageText" class="s666-discord-msg-input" maxlength="1800" rows="7" placeholder="Message"></textarea>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-close>CANCEL</button><button type="button" id="s666DiscordMessageSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-discord-close]')) closeMessageOverlay();
    });
    document.getElementById('s666DiscordMessageSend').addEventListener('click', sendMessageFromOverlay);
    document.getElementById('s666DiscordMessageText').addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessageFromOverlay(); }
    });
    return overlay;
  }

  function closeMessageOverlay() {
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) overlay.classList.add('s666-discord-gate--hidden');
  }

  async function openMessageOverlay() {
    if (!window.S666AdminAuth) throw new Error('admin_auth_client_missing');
    var check = await window.S666AdminAuth.check(true);
    if (!check.ok) throw new Error('admin_session_required');
    var overlay = ensureMessageOverlay();
    overlay.classList.remove('s666-discord-gate--hidden');
    setTimeout(function () { var input = document.getElementById('s666DiscordMessageText'); if (input) input.focus(); }, 40);
    return true;
  }

  async function sendMessageFromOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    var button = document.getElementById('s666DiscordMessageSend');
    var message = clean(input && input.value, 1800);
    if (!message) return;
    if (button) button.disabled = true;
    try {
      await authorizedPost('/api/discord/message', Object.assign(readTrackFromDom(), { message: message }));
      if (input) input.value = '';
      closeMessageOverlay();
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function messagePost(message) {
    if (typeof message === 'string' && clean(message, 1800)) {
      return authorizedPost('/api/discord/message', Object.assign(readTrackFromDom(), { message: clean(message, 1800) }));
    }
    return openMessageOverlay();
  }

  async function manualPost() {
    return authorizedPost('/api/discord/manual', readTrackFromDom());
  }

  async function postTrackIfChanged(force) {
    var data = readTrackFromDom();
    var key = trackKey(data);
    if (!key || key === lastPostedKey && !force) return { ok: true, skipped: true, reason: 'unchanged' };
    var auth = window.S666AdminAuth ? await window.S666AdminAuth.check(false) : { ok: false };
    if (!auth.ok) return { ok: true, skipped: true, reason: 'admin_session_inactive' };
    var result = await authorizedPost('/api/discord/nowplaying', data);
    lastPostedKey = key;
    return result;
  }

  async function checkStatus() {
    try {
      var response = await fetch('/api/discord/status?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
      var data = await response.json().catch(function () { return {}; });
      dispatch({ phase: 'status', ok: response.ok && data.ok === true, data: data });
      return data;
    } catch (error) {
      dispatch({ phase: 'status', ok: false, error: error && error.message ? error.message : String(error) });
      return { ok: false };
    }
  }

  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = setTimeout(async function () {
      var current = trackKey(readTrackFromDom());
      if (current && current !== lastTrackKey) {
        lastTrackKey = current;
        try { await postTrackIfChanged(false); } catch (_) {}
      }
      scheduleWatcher(document.hidden ? 30000 : 8000);
    }, delay);
  }

  document.addEventListener('visibilitychange', function () { scheduleWatcher(document.hidden ? 30000 : 1500); });
  document.addEventListener('DOMContentLoaded', function () { checkStatus(); scheduleWatcher(4000); });

  window.S666DiscordPlayerAddonV3 = {
    version: VERSION,
    auditRepair: true,
    mountAll: function () { return true; },
    manualPost: manualPost,
    messagePost: messagePost,
    postTrackIfChanged: postTrackIfChanged,
    readTrackFromDom: readTrackFromDom,
    checkStatus: checkStatus,
    setLed: function (mode, text) { dispatch({ phase: mode || 'idle', text: text || '' }); }
  };
})();
