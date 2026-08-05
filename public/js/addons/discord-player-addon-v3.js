/*
 * 666SOUNDsDESIGn Discord Shooter + Veluna Messenger + shared visual bridge.
 * Discord webhook URLs stay server-side in Worker secrets. No Discord password gate.
 * Veluna messenger uses the authoritative /api/player-alert/* backend.
 * Repair v4.14: restore one startup Now Playing post and stop reporting skipped/dedupe as sent.
 */
(function () {
  'use strict';
  if (window.S666DiscordPlayerAddonV3 && window.S666DiscordPlayerAddonV3.version) return;

  var VERSION = 'V4.14-20260725-DISCORD-START-AUTOPOST-REPAIR';
  var inFlight = false;
  var watcherTimer = 0;
  var visualTimer = 0;
  var startupTimer = 0;
  var lastTrackKey = '';
  var lastPostedKey = '';
  var startupAutoPostDone = false;
  var startupAutoPostStartedAt = 0;
  var MSG_MAX = 240;
  var STARTUP_RETRY_MS = 1500;
  var STARTUP_MAX_WAIT_MS = 24000;

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
    var title = readText(['#trackTitle', '#mffTrackTitle', '#nowPlayingTitle', '#nowPlaying', '#nowPlayingTicker', '[data-now-playing-title]']);
    var artist = readText(['#trackArtist', '#mffTrackArtist', '#nowPlayingArtist', '[data-now-playing-artist]']);
    var dj = readText(['#statusDj', '#mffDj', '#djText', '[data-dj-name]']) || 'LYVRA DJ';
    var listeners = readText(['#statusListeners', '#mffListeners', '#listenersText', '[data-listeners]']);
    var bitrate = readText(['#statusBitrate', '#mffBitrate', '#bitrateText', '[data-bitrate]']);
    var artwork = readImage(['#coverImage', '#nowCover', '#mffCoverImage', '#nowPlayingCover', '[data-now-playing-cover] img']);
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
      source: location.pathname.toLowerCase().indexOf('/veluna') === 0 ? 'veluna-player' : 'webradio-player'
    };
  }

  function trackKey(data) {
    return clean([data.artist, data.title, data.track, data.nowPlaying].filter(Boolean).join('|').toLowerCase(), 800);
  }

  function dispatch(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (_) {}
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(Object(obj || {}), key);
  }

  function deliveryArray(data) {
    if (!data || typeof data !== 'object') return [];
    var candidates = [data.results, data.deliveries, data.deliveryResults, data.webhooks, data.targets, data.discordResults];
    if (data.discord && typeof data.discord === 'object') {
      candidates.push(data.discord.results, data.discord.deliveries, data.discord.webhooks, data.discord.targets);
    }
    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }
    return [];
  }

  function deliveryOk(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if (entry.ok === true || entry.success === true || entry.sent === true || entry.delivered === true) return true;
    var status = Number(entry.status || entry.statusCode || entry.httpStatus || 0);
    return status === 200 || status === 204;
  }

  function deliveryStatus(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return clean(entry.status || entry.statusCode || entry.httpStatus || entry.error || entry.message || '', 80);
  }

  function deliverySummary(data, fallback) {
    var summary = {
      sent: false,
      skipped: false,
      warning: false,
      mode: 'unknown',
      text: fallback || 'Discord-Antwort empfangen'
    };
    if (!data || typeof data !== 'object') return summary;

    if (data.skipped === true || data.deduped === true || data.duplicate === true || data.unchanged === true || data.reason === 'unchanged') {
      summary.skipped = true;
      summary.mode = clean(data.reason || data.error || data.message || 'unchanged', 80);
      summary.text = '⚠ Nicht neu gesendet: ' + summary.mode;
      return summary;
    }

    var deliveries = deliveryArray(data);
    if (deliveries.length) {
      var okCount = 0;
      var failed = [];
      for (var i = 0; i < deliveries.length; i += 1) {
        if (deliveryOk(deliveries[i])) okCount += 1;
        else failed.push(String(i + 1) + ':' + (deliveryStatus(deliveries[i]) || 'failed'));
      }
      summary.sent = okCount > 0;
      summary.warning = data.partial === true || data.led === 'warning' || okCount !== deliveries.length;
      summary.mode = summary.warning ? 'partial' : (okCount + '/' + deliveries.length);
      if (summary.warning && okCount === deliveries.length) {
        var privateError = clean(data.privateTrack && (data.privateTrack.error || data.privateTrack.message) || '', 120);
        summary.text = '⚠ Discord Teil-Erfolg: Hauptziele ' + okCount + '/' + deliveries.length + (privateError ? ' · Private: ' + privateError : ' · mindestens ein weiteres Ziel fehlgeschlagen');
      } else {
        summary.text = okCount === deliveries.length
          ? '✓ Discord angenommen: ' + okCount + '/' + deliveries.length
          : (okCount > 0 ? '⚠ Discord Teil-Erfolg: ' + okCount + '/' + deliveries.length + ' · ' + failed.join(', ') : '✗ Discord nicht angenommen: ' + failed.join(', '));
      }
      return summary;
    }

    if (hasOwn(data, 'accepted') || hasOwn(data, 'sent') || hasOwn(data, 'delivered')) {
      summary.sent = data.accepted === true || data.sent === true || data.delivered === true;
      summary.mode = summary.sent ? 'accepted' : 'not_accepted';
      summary.text = summary.sent ? '✓ Discord angenommen' : '⚠ Discord nicht bestätigt';
      return summary;
    }

    if (data.ok === true) {
      summary.sent = true;
      summary.warning = data.partial === true || data.led === 'warning';
      summary.mode = summary.warning ? 'partial' : 'ok';
      summary.text = summary.warning ? '⚠ Discord Teil-Erfolg' : (fallback || '✓ Discord angenommen');
    }
    return summary;
  }

  async function postJson(path, payload) {
    if (inFlight) throw new Error('discord_request_in_flight');
    inFlight = true;
    dispatch('s666:discord-state', { phase: 'sending', path: path });
    try {
      var response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(payload || {})
      });
      var data = await response.json().catch(function () { return {}; });
      data.__httpStatus = response.status;
      if (!response.ok || data.ok !== true) throw new Error(clean(data.error || data.message || ('HTTP ' + response.status), 300));
      var summary = deliverySummary(data);
      dispatch('s666:discord-state', { phase: summary.warning ? 'warning' : 'success', path: path, data: data, summary: summary });
      return data;
    } catch (error) {
      dispatch('s666:discord-state', { phase: 'error', path: path, error: error && error.message ? error.message : String(error) });
      throw error;
    } finally {
      inFlight = false;
    }
  }

  function ensureStyle() {
    if (document.getElementById('s666DiscordShooterStyle')) return;
    var style = document.createElement('style');
    style.id = 's666DiscordShooterStyle';
    style.textContent = [
      '.s666-discord-gate.s666-discord-gate--hidden{display:none!important}',
      '.s666-discord-gate{position:fixed!important;inset:0!important;z-index:2147483646!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(0,0,0,.86)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important}',
      '.s666-discord-gate-box{position:relative!important;width:min(470px,94vw)!important;border:1px solid rgba(255,61,187,.72)!important;border-radius:22px!important;background:linear-gradient(135deg,rgba(255,61,187,.13),rgba(22,255,243,.07)),rgba(4,8,24,.96)!important;box-shadow:0 0 24px rgba(255,61,187,.32),0 0 22px rgba(22,255,243,.18)!important;color:#fff!important;text-align:center!important;padding:22px 18px 18px!important}',
      '.s666-discord-gate-title{font-size:15px!important;font-weight:950!important;letter-spacing:.22em!important;text-transform:uppercase!important;color:#ff3dbb!important;text-shadow:0 0 14px rgba(255,61,187,.78)!important}',
      '.s666-discord-gate-message{margin-top:8px!important;color:#dff!important;font-size:12px!important;font-weight:800!important}',
      '.s666-discord-msg-input{display:block!important;width:min(340px,82vw)!important;min-height:118px!important;margin:12px auto 0!important;padding:12px 13px!important;border-radius:16px!important;border:1px solid rgba(22,255,243,.56)!important;background:rgba(0,0,0,.5)!important;color:#fff!important;font-size:13px!important;font-weight:750!important;line-height:1.35!important;resize:vertical!important}',
      '.s666-discord-gate-actions{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;margin-top:15px!important;flex-wrap:wrap!important}',
      '.s666-discord-gate-x{position:absolute!important;right:10px!important;top:8px!important;width:30px!important;height:30px!important;border-radius:999px!important;border:1px solid rgba(22,255,243,.44)!important;background:rgba(22,255,243,.08)!important;color:#fff!important;font-size:21px!important;line-height:1!important;cursor:pointer!important}',
      '.s666-discord-gate-submit,.s666-discord-gate-cancel{min-height:34px!important;border-radius:999px!important;padding:0 14px!important;text-transform:uppercase!important;font-size:11px!important;font-weight:950!important;letter-spacing:.09em!important;cursor:pointer!important}',
      '.s666-discord-gate-submit{border:1px solid rgba(255,61,187,.76)!important;background:linear-gradient(90deg,rgba(255,61,187,.32),rgba(22,255,243,.12))!important;color:#fff!important}',
      '.s666-discord-gate-cancel{border:1px solid rgba(22,255,243,.42)!important;background:rgba(22,255,243,.065)!important;color:#dff!important}',
      '.s666-veluna-msg-btn{border-color:rgba(22,255,243,.48)!important;color:#16fff3!important}',
      '.s666msg-count-veluna{display:block;margin:7px 0 0;color:rgba(22,255,243,.72);font-size:11px;font-weight:900;letter-spacing:.06em}',
      '.s666-discord-status{min-height:18px;margin-top:9px;font-size:11px;font-weight:900;letter-spacing:.05em}',
      '.s666-discord-status.is-sending{color:#ffc857}.s666-discord-status.is-ok{color:#7edcff}.s666-discord-status.is-error{color:#ff5570}.s666-discord-status.is-warn{color:#ffc857}',
      '#discordBtn.is-warn{border-color:rgba(255,200,87,.82)!important;color:#ffc857!important;box-shadow:0 0 14px rgba(255,200,87,.3)!important}',
      '.s666-discord-emojis{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px}.s666-discord-emoji{min-width:32px;min-height:30px;border-radius:8px!important;padding:4px 6px!important;font-size:18px!important}.s666-discord-nowplaying{border-color:rgba(126,220,255,.68)!important;color:#7edcff!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function setSharedColorState(kind, value) {
    var k = clean(kind || 'state', 80).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    var v = clean(value || 'idle', 80).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    try {
      document.documentElement.setAttribute('data-s666-' + k, v);
      document.body.setAttribute('data-s666-' + k, v);
      document.documentElement.setAttribute('data-veluna-color-logic', 'shared');
      document.body.setAttribute('data-veluna-color-logic', 'shared');
    } catch (_) {}
  }

  function syncSharedColorState() {
    var state = clean(document.body.getAttribute('data-player-state') || document.documentElement.getAttribute('data-player-state') || document.body.getAttribute('data-transport-state') || document.documentElement.getAttribute('data-transport-state') || 'idle', 80).toLowerCase();
    if (state.indexOf('play') !== -1) setSharedColorState('transport', 'playing');
    else if (state.indexOf('pause') !== -1) setSharedColorState('transport', 'paused');
    else if (state.indexOf('stop') !== -1) setSharedColorState('transport', 'stopped');
    var backupActive = (document.getElementById('fallbackBtn') && document.getElementById('fallbackBtn').classList.contains('is-active')) || (document.getElementById('backupBtn') && document.getElementById('backupBtn').classList.contains('is-active'));
    setSharedColorState('source', backupActive ? 'backup' : 'main');
  }

  var DISCORD_EMOJIS = ['🎵','🎶','🎧','🎤','🔥','⚡','💜','💙','🤘','😎','👽','💀','🎉','🚀','✨','⭐','666'];

  function setDiscordOverlayStatus(text, mode) {
    var status = document.getElementById('s666DiscordMessageStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = 's666-discord-status' + (mode ? ' is-' + mode : '');
  }

  function insertAtCursor(input, value, max) {
    if (!input || !value) return;
    var start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    var end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
    var next = input.value.slice(0, start) + value + input.value.slice(end);
    input.value = next.slice(0, max || 1800);
    var pos = Math.min(input.value.length, start + value.length);
    try { input.setSelectionRange(pos, pos); input.focus(); } catch (_) {}
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
    var emojiHtml = '<div class="s666-discord-emojis">' + DISCORD_EMOJIS.map(function (emoji) { return '<button type="button" class="s666-discord-emoji" data-discord-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Message to Discord:</div>' +
      '<textarea id="s666DiscordMessageText" class="s666-discord-msg-input" maxlength="1800" rows="7" placeholder="Message"></textarea>' +
      emojiHtml +
      '<div id="s666DiscordMessageStatus" class="s666-discord-status" role="status" aria-live="polite">Bereit</div>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-close>CLOSE</button><button type="button" id="s666DiscordNowPlayingSend" class="s666-discord-gate-submit s666-discord-nowplaying">NOW PLAYING</button><button type="button" id="s666DiscordMessageSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-discord-close]')) { closeMessageOverlay(); return; }
      var emojiButton = event.target.closest && event.target.closest('[data-discord-emoji]');
      if (emojiButton) insertAtCursor(document.getElementById('s666DiscordMessageText'), emojiButton.getAttribute('data-discord-emoji') || '', 1800);
    });
    document.getElementById('s666DiscordMessageSend').addEventListener('click', sendMessageFromOverlay);
    document.getElementById('s666DiscordNowPlayingSend').addEventListener('click', sendNowPlayingFromOverlay);
    document.getElementById('s666DiscordMessageText').addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessageFromOverlay(); } });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !overlay.classList.contains('s666-discord-gate--hidden')) closeMessageOverlay(); });
    return overlay;
  }

  async function openMessageOverlay() {
    var overlay = ensureMessageOverlay();
    overlay.classList.remove('s666-discord-gate--hidden');
    setDiscordOverlayStatus('Bereit', '');
    setTimeout(function () { var input = document.getElementById('s666DiscordMessageText'); if (input) input.focus(); }, 40);
    return true;
  }

  async function sendMessageFromOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    var button = document.getElementById('s666DiscordMessageSend');
    var message = clean(input && input.value, 1800);
    if (!message) { setDiscordOverlayStatus('Nachricht fehlt', 'error'); return; }
    if (button) button.disabled = true;
    setDiscordOverlayStatus('Wird gesendet …', 'sending');
    try {
      var result = await postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: message, manual: true }));
      var summary = deliverySummary(result, '✓ Discord-Nachricht angenommen');
      if (summary.skipped || !summary.sent) {
        setDiscordOverlayStatus(summary.text, summary.skipped ? 'warn' : 'error');
      } else {
        if (input) input.value = '';
        setDiscordOverlayStatus(summary.text, summary.warning ? 'warn' : 'ok');
      }
    } catch (error) {
      setDiscordOverlayStatus('✗ Versand fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function sendNowPlayingFromOverlay() {
    var button = document.getElementById('s666DiscordNowPlayingSend');
    if (button) button.disabled = true;
    setDiscordOverlayStatus('Now Playing wird gesendet …', 'sending');
    try {
      var result = await postTrackIfChanged(true, 'manual-now-playing');
      var summary = deliverySummary(result, '✓ Now Playing von Discord angenommen');
      setDiscordOverlayStatus(summary.text, summary.skipped || summary.warning ? 'warn' : (summary.sent ? 'ok' : 'error'));
    } catch (error) {
      setDiscordOverlayStatus('✗ Now Playing fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function messagePost(message) {
    if (typeof message === 'string' && clean(message, 1800)) {
      return postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: clean(message, 1800), manual: true }));
    }
    return openMessageOverlay();
  }

  async function manualPost() {
    return postJson('/api/discord/manual', Object.assign(readTrackFromDom(), { manual: true }));
  }

  async function postTrackIfChanged(force, reason) {
    var data = readTrackFromDom();
    var key = trackKey(data);
    if (!key) return { ok: true, skipped: true, reason: 'no_track_key' };
    if (key === lastPostedKey && !force) return { ok: true, skipped: true, reason: 'unchanged' };
    var result = await postJson('/api/discord/nowplaying', Object.assign({}, data, {
      force: Boolean(force),
      reason: reason || (force ? 'manual' : 'watcher'),
      clientVersion: VERSION
    }));
    if (!result || result.skipped !== true) lastPostedKey = key;
    return result;
  }

  function tryStartupAutoPost() {
    clearTimeout(startupTimer);
    if (startupAutoPostDone) return;
    var data = readTrackFromDom();
    var key = trackKey(data);
    if (!startupAutoPostStartedAt) startupAutoPostStartedAt = Date.now();

    if (!key) {
      if (Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS) {
        startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS);
      } else {
        dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'no_track_key' });
      }
      return;
    }

    if (key === lastPostedKey) {
      startupAutoPostDone = true;
      lastTrackKey = key;
      dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'already-posted-by-watcher', key: key });
      return;
    }

    startupAutoPostDone = true;
    lastTrackKey = key;
    dispatch('s666:discord-state', { phase: 'startup-autopost', key: key });
    postTrackIfChanged(true, 'startup-first-now-playing')
      .then(function (result) {
        var summary = deliverySummary(result);
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : (summary.warning ? 'startup-autopost-warning' : 'startup-autopost-success'), data: result, summary: summary });
      })
      .catch(function (error) {
        startupAutoPostDone = false;
        dispatch('s666:discord-state', { phase: 'startup-autopost-error', error: error && error.message ? error.message : String(error) });
        if (Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS) {
          startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS);
        } else {
          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'retry-window-exhausted', key: key });
        }
      });
  }

  async function checkStatus() {
    try {
      var response = await fetch('/api/discord/status?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
      var data = await response.json().catch(function () { return {}; });
      dispatch('s666:discord-state', { phase: 'status', ok: response.ok && data.ok === true, data: data });
      return data;
    } catch (error) {
      dispatch('s666:discord-state', { phase: 'status', ok: false, error: error && error.message ? error.message : String(error) });
      return { ok: false };
    }
  }

  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = setTimeout(async function () {
      var current = trackKey(readTrackFromDom());
      if (current && current !== lastTrackKey) {
        try {
          var result = await postTrackIfChanged(false, 'watcher-track-change');
          if (result && result.ok === true) lastTrackKey = current;
        } catch (_) {}
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

  function setVelunaMessengerStatus(text, mode) {
    var status = document.getElementById('s666VelunaMessengerStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = 's666-discord-status' + (mode ? ' is-' + mode : '');
  }

  function closeVelunaMessengerOverlay() {
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) overlay.classList.add('s666-discord-gate--hidden');
    document.body.style.overflow = '';
  }

  function ensureVelunaMessengerOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666VelunaMessengerOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden';
    var emojiHtml = '<div class="s666-discord-emojis">' + DISCORD_EMOJIS.map(function (emoji) { return '<button type="button" class="s666-discord-emoji" data-veluna-msg-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Veluna Messenger">' +
      '<button type="button" class="s666-discord-gate-x" data-veluna-msg-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">VELUNA MESSENGER</div>' +
      '<div class="s666-discord-gate-message">Broadcast message to WebRadio listeners:</div>' +
      '<textarea id="s666VelunaMessengerText" class="s666-discord-msg-input" maxlength="' + MSG_MAX + '" rows="6" placeholder="Nachricht an alle Hörer schreiben..."></textarea>' +
      '<span id="s666VelunaMessengerCount" class="s666msg-count-veluna">0 / ' + MSG_MAX + '</span>' +
      emojiHtml +
      '<div id="s666VelunaMessengerStatus" class="s666-discord-status" role="status" aria-live="polite">Bereit</div>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-veluna-msg-close>CLOSE</button><button type="button" id="s666VelunaMessengerSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var textarea = document.getElementById('s666VelunaMessengerText');
    var count = document.getElementById('s666VelunaMessengerCount');
    function updateCount() { if (count && textarea) count.textContent = String(textarea.value.length) + ' / ' + MSG_MAX; }
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-veluna-msg-close]')) { closeVelunaMessengerOverlay(); return; }
      var emojiButton = event.target.closest && event.target.closest('[data-veluna-msg-emoji]');
      if (emojiButton) {
        insertAtCursor(textarea, emojiButton.getAttribute('data-veluna-msg-emoji') || '', MSG_MAX);
        updateCount();
      }
    });
    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendVelunaMessenger(); } });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !overlay.classList.contains('s666-discord-gate--hidden')) closeVelunaMessengerOverlay(); });
    document.getElementById('s666VelunaMessengerSend').addEventListener('click', sendVelunaMessenger);
    return overlay;
  }

  async function ensurePlayerAlertClient() {
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    await loadScriptOnce('s666PlayerAlertClientVelunaBridge', '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121');
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
    throw new Error('player_alert_client_missing');
  }

  async function sendVelunaMessenger() {
    var input = document.getElementById('s666VelunaMessengerText');
    var button = document.getElementById('s666VelunaMessengerSend');
    var message = clean(input && input.value, MSG_MAX);
    if (!message) { setVelunaMessengerStatus('Nachricht fehlt', 'error'); return; }
    if (button) button.disabled = true;
    setVelunaMessengerStatus('Wird an die Hörer gesendet …', 'sending');
    dispatch('s666:veluna-messenger-state', { phase: 'sending' });
    try {
      var client = await ensurePlayerAlertClient();
      var result = await client.send(message, { username: 'Veluna Broadcast', source: 'veluna-messenger' });
      if (!result || result.ok !== true) throw new Error(clean(result && (result.error || result.message), 200) || 'messenger_send_failed');
      if (input) input.value = '';
      var count = document.getElementById('s666VelunaMessengerCount');
      if (count) count.textContent = '0 / ' + MSG_MAX;
      setVelunaMessengerStatus('✓ Erfolgreich an die Hörer gesendet', 'ok');
      dispatch('s666:veluna-messenger-state', { phase: 'success', data: result });
    } catch (error) {
      var detail = error && error.message ? error.message : String(error || 'messenger_send_failed');
      setVelunaMessengerStatus('✗ Versand fehlgeschlagen: ' + clean(detail, 180), 'error');
      dispatch('s666:veluna-messenger-state', { phase: 'error', error: detail });
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
      Promise.resolve()
        .then(function () {
          if (window.S666Messenger && typeof window.S666Messenger.open === 'function') return true;
          return loadScriptOnce('s666MessengerOverlayVelunaBridge', '/js/messenger-overlay.js?v=2026-07-19-overlay-status-v2');
        })
        .then(function () {
          if (!window.S666Messenger || typeof window.S666Messenger.open !== 'function') throw new Error('messenger_overlay_missing');
          window.S666Messenger.open();
        })
        .catch(function (error) { dispatch('s666:veluna-messenger-state', { phase: 'error', error: error && error.message ? error.message : String(error) }); });
    });
    var discordButton = document.getElementById('discordBtn');
    if (discordButton && discordButton.parentNode === toolStrip) toolStrip.insertBefore(button, discordButton.nextSibling);
    else toolStrip.appendChild(button);
    return true;
  }

  function installVelunaDiscordNoAuthBypass() {
    var button = document.getElementById('discordBtn');
    if (!button || button.dataset.s666NoAuthDiscord === '1') return false;
    button.dataset.s666NoAuthDiscord = '1';
    button.addEventListener('click', function (event) {
      if (location.pathname.toLowerCase().indexOf('/veluna') !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      dispatch('s666:discord-state', { phase: 'veluna-no-auth-click' });
      messagePost().catch(function (error) {
        dispatch('s666:discord-state', { phase: 'error', error: error && error.message ? error.message : String(error) });
      });
    }, true);
    return true;
  }

  function initVelunaMessengerBridge() {
    if (!document.querySelector('.tool-strip')) return;
    mountVelunaMessengerButton();
    installVelunaDiscordNoAuthBypass();
    ensurePlayerAlertClient().catch(function (error) { dispatch('s666:veluna-messenger-state', { phase: 'error', error: error.message || String(error) }); });
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

  function initSharedVisualBridge() {
    setSharedColorState('transport', 'idle');
    syncSharedColorState();
    clearInterval(visualTimer);
    visualTimer = setInterval(function () {
      syncSharedColorState();
      installVelunaDiscordNoAuthBypass();
    }, 3500);
  }

  function initDiscordButtonStatusBridge() {
    if (window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__) return;
    window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__ = true;
    window.addEventListener('s666:discord-state', function (event) {
      var detail = event.detail || {};
      var button = document.getElementById('discordBtn');
      if (!button) return;
      button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
      if (detail.phase === 'sending') button.classList.add('is-busy');
      else if (detail.phase === 'success') button.classList.add('is-ok');
      else if (detail.phase === 'warning') button.classList.add('is-warn');
      else if (detail.phase === 'error') button.classList.add('is-error');
    });
  }

  function initAll() {
    initDiscordButtonStatusBridge();
    checkStatus();
    tryStartupAutoPost();
    scheduleWatcher(4000);
    initVelunaMessengerBridge();
    initSharedVisualBridge();
  }

  document.addEventListener('visibilitychange', function () { scheduleWatcher(document.hidden ? 30000 : 1500); });
  document.addEventListener('DOMContentLoaded', initAll);
  if (document.readyState !== 'loading') setTimeout(initAll, 0);

  window.S666DiscordPlayerAddonV3 = {
    version: VERSION,
    auditRepair: true,
    velunaMessengerBridge: true,
    velunaDiscordNoAuth: true,
    sharedVisualBridge: false,
    sharedStatusBridge: true,
    startupNowPlayingAutopost: true,
    skippedIsNotSent: true,
    mountAll: function () { mountVelunaMessengerButton(); installVelunaDiscordNoAuthBypass(); initSharedVisualBridge(); return true; },
    manualPost: manualPost,
    messagePost: messagePost,
    postTrackIfChanged: postTrackIfChanged,
    readTrackFromDom: readTrackFromDom,
    checkStatus: checkStatus,
    deliverySummary: deliverySummary,
    setLed: function (mode, text) { dispatch('s666:discord-state', { phase: mode || 'idle', text: text || '' }); }
  };
})();
