/*
 * 666SOUNDsDESIGn Discord Shooter + Veluna Messenger bridge.
 * Discord webhook URLs stay server-side in Worker secrets. No Discord password gate.
 * Veluna messenger uses the authoritative /api/player-alert/* backend.
 */
(function () {
  'use strict';

  var VERSION = 'V4.5-20260715-VELUNA-MESSENGER-BRIDGE';
  var inFlight = false;
  var watcherTimer = 0;
  var lastTrackKey = '';
  var lastPostedKey = '';
  var MSG_MAX = 240;

  function clean(value, max) {
    return String(value == null ? '' : value)
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 500);
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
    var title = readText(['#trackTitle', '#mffTrackTitle', '#nowPlayingTitle', '#nowPlaying', '[data-now-playing-title]']);
    var artist = readText(['#trackArtist', '#mffTrackArtist', '#nowPlayingArtist', '[data-now-playing-artist]']);
    var dj = readText(['#statusDj', '#mffDj', '#djText', '[data-dj-name]']) || 'LYVRA DJ';
    var listeners = readText(['#statusListeners', '#mffListeners', '#listenersText', '[data-listeners]']);
    var bitrate = readText(['#statusBitrate', '#mffBitrate', '#bitrateText', '[data-bitrate]']);
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
      playerUrl: location.origin + (location.pathname.toLowerCase().indexOf('/veluna') === 0 ? '/veluna' : '/'),
      source: 'webradio-player'
    };
  }

  function trackKey(data) {
    return clean([data.artist, data.title, data.track, data.nowPlaying].filter(Boolean).join('|').toLowerCase(), 800);
  }

  function dispatch(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:discord-state', { detail: detail || {} })); } catch (_) {}
  }

  function dispatchMessenger(detail) {
    try { window.dispatchEvent(new CustomEvent('s666:veluna-messenger-state', { detail: detail || {} })); } catch (_) {}
  }

  async function postJson(path, payload) {
    if (inFlight) throw new Error('discord_request_in_flight');
    inFlight = true;
    dispatch({ phase: 'sending', path: path });
    try {
      var response = await fetch(path, {
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

  function ensureStyle() {
    if (document.getElementById('s666DiscordShooterStyle')) return;
    var style = document.createElement('style');
    style.id = 's666DiscordShooterStyle';
    style.textContent = '.s666-discord-gate--hidden{display:none!important}.s666-discord-gate{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(0,0,0,.86)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important}.s666-discord-gate-box{position:relative!important;width:min(470px,94vw)!important;border:1px solid rgba(255,61,187,.72)!important;border-radius:22px!important;background:linear-gradient(135deg,rgba(255,61,187,.13),rgba(22,255,243,.07)),rgba(4,8,24,.96)!important;box-shadow:0 0 24px rgba(255,61,187,.32),0 0 22px rgba(22,255,243,.18)!important;color:#fff!important;text-align:center!important;padding:22px 18px 18px!important}.s666-discord-gate-title{font-size:15px!important;font-weight:950!important;letter-spacing:.22em!important;text-transform:uppercase!important;color:#ff3dbb!important;text-shadow:0 0 14px rgba(255,61,187,.78)!important}.s666-discord-msg-input{display:block!important;width:min(340px,82vw)!important;min-height:118px!important;margin:12px auto 0!important;padding:12px 13px!important;border-radius:16px!important;border:1px solid rgba(22,255,243,.56)!important;background:rgba(0,0,0,.5)!important;color:#fff!important;font-size:13px!important;font-weight:750!important;line-height:1.35!important;resize:vertical!important}.s666-discord-gate-actions{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;margin-top:15px!important}.s666-discord-gate-x{position:absolute!important;right:10px!important;top:8px!important;width:30px!important;height:30px!important;border-radius:999px!important;border:1px solid rgba(22,255,243,.44)!important;background:rgba(22,255,243,.08)!important;color:#fff!important;font-size:21px!important;line-height:1!important;cursor:pointer!important}.s666-discord-gate-submit,.s666-discord-gate-cancel{min-height:34px!important;border-radius:999px!important;padding:0 14px!important;text-transform:uppercase!important;font-size:11px!important;font-weight:950!important;letter-spacing:.09em!important;cursor:pointer!important}.s666-discord-gate-submit{border:1px solid rgba(255,61,187,.76)!important;background:linear-gradient(90deg,rgba(255,61,187,.32),rgba(22,255,243,.12))!important;color:#fff!important}.s666-discord-gate-cancel{border:1px solid rgba(22,255,243,.42)!important;background:rgba(22,255,243,.065)!important;color:#dff!important}.s666-veluna-msg-btn{border-color:rgba(22,255,243,.48)!important;color:#16fff3!important}.s666msg-count-veluna{display:block;margin:7px 0 0;color:rgba(22,255,243,.72);font-size:11px;font-weight:900;letter-spacing:.06em}';
    document.head.appendChild(style);
  }

  function closeMessageOverlay() {
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) overlay.classList.add('s666-discord-gate--hidden');
  }

  function ensureMessageOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666DiscordMessageOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden s666-discord-gate--message';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Message to Discord:</div>' +
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

  async function openMessageOverlay() {
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
      await postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: message }));
      if (input) input.value = '';
      closeMessageOverlay();
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function messagePost(message) {
    if (typeof message === 'string' && clean(message, 1800)) {
      return postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: clean(message, 1800) }));
    }
    return openMessageOverlay();
  }

  async function manualPost() {
    return postJson('/api/discord/manual', readTrackFromDom());
  }

  async function postTrackIfChanged(force) {
    var data = readTrackFromDom();
    var key = trackKey(data);
    if (!key || (key === lastPostedKey && !force)) return { ok: true, skipped: true, reason: 'unchanged' };
    var result = await postJson('/api/discord/nowplaying', data);
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

  function loadScriptOnce(id, src) {
    return new Promise(function (resolve, reject) {
      if (document.getElementById(id)) return resolve();
      var script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('script_load_failed:' + src)); };
      document.head.appendChild(script);
    });
  }

  function ensureVelunaMessengerOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666VelunaMessengerOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Veluna Messenger">' +
      '<button type="button" class="s666-discord-gate-x" data-veluna-msg-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">VELUNA MESSENGER</div>' +
      '<div class="s666-discord-gate-message">Broadcast message to WebRadio listeners:</div>' +
      '<textarea id="s666VelunaMessengerText" class="s666-discord-msg-input" maxlength="' + MSG_MAX + '" rows="6" placeholder="Nachricht an alle Hörer schreiben..."></textarea>' +
      '<span id="s666VelunaMessengerCount" class="s666msg-count-veluna">0 / ' + MSG_MAX + '</span>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-veluna-msg-close>CANCEL</button><button type="button" id="s666VelunaMessengerSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var textarea = document.getElementById('s666VelunaMessengerText');
    var count = document.getElementById('s666VelunaMessengerCount');
    function close() { overlay.classList.add('s666-discord-gate--hidden'); document.body.style.overflow = ''; }
    function updateCount() { if (count && textarea) count.textContent = String(textarea.value.length) + ' / ' + MSG_MAX; }
    overlay.addEventListener('click', function (event) { if (event.target === overlay || event.target.closest('[data-veluna-msg-close]')) close(); });
    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendVelunaMessenger(); } });
    document.getElementById('s666VelunaMessengerSend').addEventListener('click', sendVelunaMessenger);
    return overlay;
  }

  async function ensurePlayerAlertClient() {
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    await loadScriptOnce('s666PlayerAlertClientVelunaBridge', '/js/player-alert-client.js?v=2026-07-15-veluna-msg');
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    throw new Error('player_alert_client_missing');
  }

  async function sendVelunaMessenger() {
    var input = document.getElementById('s666VelunaMessengerText');
    var button = document.getElementById('s666VelunaMessengerSend');
    var message = clean(input && input.value, MSG_MAX);
    if (!message) return;
    if (button) button.disabled = true;
    dispatchMessenger({ phase: 'sending' });
    try {
      var client = await ensurePlayerAlertClient();
      var result = await client.send(message, { username: 'Veluna Broadcast', source: 'veluna-messenger' });
      if (!result || result.ok !== true) throw new Error(clean(result && (result.error || result.message), 200) || 'messenger_send_failed');
      if (input) input.value = '';
      var overlay = document.getElementById('s666VelunaMessengerOverlay');
      if (overlay) overlay.classList.add('s666-discord-gate--hidden');
      dispatchMessenger({ phase: 'success', data: result });
    } catch (error) {
      dispatchMessenger({ phase: 'error', error: error && error.message ? error.message : String(error) });
    } finally {
      if (button) button.disabled = false;
    }
  }

  function mountVelunaMessengerButton() {
    var toolStrip = document.querySelector('.tool-strip');
    if (!toolStrip || !document.getElementById('discordBtn') || document.getElementById('s666VelunaMessageButton')) return false;
    var button = document.createElement('button');
    button.id = 's666VelunaMessageButton';
    button.type = 'button';
    button.className = 'small-btn s666-veluna-msg-btn';
    button.textContent = 'MSG';
    button.title = 'VELUNA Broadcast Messenger';
    button.setAttribute('aria-label', 'VELUNA Broadcast Messenger');
    button.addEventListener('click', function () {
      var overlay = ensureVelunaMessengerOverlay();
      overlay.classList.remove('s666-discord-gate--hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { var input = document.getElementById('s666VelunaMessengerText'); if (input) input.focus(); }, 60);
    });
    var discordButton = document.getElementById('discordBtn');
    if (discordButton && discordButton.parentNode === toolStrip) toolStrip.insertBefore(button, discordButton.nextSibling);
    else toolStrip.appendChild(button);
    return true;
  }

  function initVelunaMessengerBridge() {
    if (!document.querySelector('.tool-strip')) return;
    mountVelunaMessengerButton();
    ensurePlayerAlertClient().catch(function (error) { dispatchMessenger({ phase: 'error', error: error.message || String(error) }); });
    window.addEventListener('s666:veluna-messenger-state', function (event) {
      var detail = event.detail || {};
      var btn = document.getElementById('s666VelunaMessageButton');
      if (!btn) return;
      btn.classList.remove('is-busy', 'is-ok', 'is-error');
      if (detail.phase === 'sending') btn.classList.add('is-busy');
      else if (detail.phase === 'success') btn.classList.add('is-ok');
      else if (detail.phase === 'error') btn.classList.add('is-error');
    });
  }

  document.addEventListener('visibilitychange', function () { scheduleWatcher(document.hidden ? 30000 : 1500); });
  document.addEventListener('DOMContentLoaded', function () { checkStatus(); scheduleWatcher(4000); initVelunaMessengerBridge(); });
  if (document.readyState !== 'loading') setTimeout(initVelunaMessengerBridge, 0);

  window.S666DiscordPlayerAddonV3 = {
    version: VERSION,
    auditRepair: true,
    velunaMessengerBridge: true,
    mountAll: function () { mountVelunaMessengerButton(); return true; },
    manualPost: manualPost,
    messagePost: messagePost,
    postTrackIfChanged: postTrackIfChanged,
    readTrackFromDom: readTrackFromDom,
    checkStatus: checkStatus,
    setLed: function (mode, text) { dispatch({ phase: mode || 'idle', text: text || '' }); }
  };
})();