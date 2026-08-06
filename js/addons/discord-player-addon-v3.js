/*
 * 666SOUNDsDESIGn Discord Shooter + Veluna Messenger + shared visual bridge.
 * Discord transport defaults to direct browser-to-webhook delivery with three locally stored categories.
 * Webhook URLs never enter the repository, events, logs or payload diagnostics. Worker transport remains explicit legacy fallback only.
 * Veluna messenger continues to use the authoritative /api/player-alert/* backend.
 * Repair v5.0: restore direct startup Now Playing, three-category shooter and local target migration.
 */
(function () {
  'use strict';
  if (window.S666DiscordPlayerAddonV3 && window.S666DiscordPlayerAddonV3.version) return;

  var VERSION = 'V5.0-20260806-DIRECT-LOCAL-THREE-CATEGORY';
  var lifecycleGeneration = 0;
  var requestSequence = 0;
  var activeRequestId = 0;
  var fetchControllerSequence = 0;
  var activeFetchControllers = Object.create(null);
  var statusSequence = 0;
  var velunaSendSequence = 0;
  var activeVelunaSendId = 0;
  var discordOverlaySendSequence = 0;
  var activeDiscordOverlaySendId = 0;
  var messengerOpenSequence = 0;
  var discordOverlayFocusTimer = 0;
  var discordOverlayReturnFocus = null;
  var watcherTimer = 0;
  var visualTimer = 0;
  var controlObserver = null;
  var controlObserverRoot = null;
  var controlReconcileTimer = 0;
  var startupTimer = 0;
  var lastTrackKey = '';
  var lastPostedKey = '';
  var startupAutoPostDone = false;
  var startupAutoPostStartedAt = 0;
  var initialized = false;
  var watcherRunning = false;
  var lifecycleSuspended = false;
  var statusResetTimer = 0;
  var velunaStatusResetTimer = 0;
  var escapeBridgeInstalled = false;
  var discordOverlayStatusState = { text: 'Bereit', mode: '' };
  var discordDraftState = '';
  var discordDraftRevision = 0;
  var discordButtonPhase = 'idle';
  var discordButtonStateSequence = 0;
  var velunaButtonPhase = 'idle';
  var velunaButtonStateSequence = 0;
  var playerAlertClientLoad = null;
  var messengerOverlayClientLoad = null;
  var scriptLoads = Object.create(null);
  var REQUEST_TIMEOUT_MS = 15000;
  var STATUS_TIMEOUT_MS = 10000;
  var MSG_MAX = 240;
  var STARTUP_RETRY_MS = 1500;
  var STARTUP_MAX_WAIT_MS = 24000;
  var DIRECT_STORAGE_KEY = 's666_discord_direct_v1';
  var DIRECT_CATEGORY_IDS = ['main', 'community', 'labor'];
  var directPlaybackStarted = false;
  var directPlayingBridgeInstalled = false;

  function runtimeConfig() {
    return window.S666_DISCORD_PLAYER_CONFIG && typeof window.S666_DISCORD_PLAYER_CONFIG === 'object'
      ? window.S666_DISCORD_PLAYER_CONFIG : {};
  }

  function transportMode() {
    return clean(runtimeConfig().transport || 'direct', 24).toLowerCase() === 'worker' ? 'worker' : 'direct';
  }

  function defaultDirectSettings() {
    return {
      version: 1,
      selectedTarget: 'main',
      autoTarget: 'main',
      categories: [
        { id: 'main', label: 'MAIN', webhook: '' },
        { id: 'community', label: 'COMMUNITY', webhook: '' },
        { id: 'labor', label: 'AI / PSYCHOACTIV / DESIGN LABOR', webhook: '' }
      ],
      migrated: false
    };
  }

  function normalizeDiscordWebhook(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    try {
      var url = new URL(raw);
      var host = String(url.hostname || '').toLowerCase();
      if (url.protocol !== 'https:' || !/(^|\.)discord(?:app)?\.com$/.test(host)) return '';
      if (!/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) return '';
      return url.origin + url.pathname.replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function webhookCandidatesFromText(value) {
    var matches = String(value || '').match(/https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi) || [];
    var result = [];
    matches.forEach(function (candidate) {
      var normalized = normalizeDiscordWebhook(candidate);
      if (normalized && result.indexOf(normalized) < 0) result.push(normalized);
    });
    return result;
  }

  function migrateLegacyDirectTargets(settings) {
    if (settings.migrated) return settings;
    var discovered = [];
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i) || '';
        if (key === DIRECT_STORAGE_KEY || !/(discord|webhook|shooter|private.?track)/i.test(key)) continue;
        webhookCandidatesFromText(localStorage.getItem(key) || '').forEach(function (url) {
          if (discovered.indexOf(url) < 0) discovered.push(url);
        });
      }
    } catch (_) {}
    settings.categories.forEach(function (category, index) {
      if (!category.webhook && discovered[index]) category.webhook = discovered[index];
    });
    settings.migrated = true;
    return settings;
  }

  function normalizeDirectSettings(raw) {
    var defaults = defaultDirectSettings();
    raw = raw && typeof raw === 'object' ? raw : {};
    var byId = Object.create(null);
    if (Array.isArray(raw.categories)) raw.categories.forEach(function (item) {
      if (item && DIRECT_CATEGORY_IDS.indexOf(String(item.id || '')) >= 0) byId[String(item.id)] = item;
    });
    defaults.categories = defaults.categories.map(function (fallback) {
      var item = byId[fallback.id] || {};
      return {
        id: fallback.id,
        label: clean(item.label || fallback.label, 52) || fallback.label,
        webhook: normalizeDiscordWebhook(item.webhook || '')
      };
    });
    defaults.selectedTarget = DIRECT_CATEGORY_IDS.indexOf(String(raw.selectedTarget || '')) >= 0 ? String(raw.selectedTarget) : 'main';
    defaults.autoTarget = DIRECT_CATEGORY_IDS.indexOf(String(raw.autoTarget || '')) >= 0 ? String(raw.autoTarget) : 'main';
    defaults.migrated = raw.migrated === true;
    return migrateLegacyDirectTargets(defaults);
  }

  function loadDirectSettings() {
    var parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(DIRECT_STORAGE_KEY) || 'null'); } catch (_) {}
    var settings = normalizeDirectSettings(parsed);
    if (!parsed || settings.migrated !== Boolean(parsed && parsed.migrated)) saveDirectSettings(settings);
    return settings;
  }

  function saveDirectSettings(settings) {
    var normalized = normalizeDirectSettings(Object.assign({}, settings || {}, { migrated: true }));
    try { localStorage.setItem(DIRECT_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
    return normalized;
  }

  function directCategory(settings, id) {
    settings = settings || loadDirectSettings();
    var targetId = DIRECT_CATEGORY_IDS.indexOf(String(id || '')) >= 0 ? String(id) : settings.selectedTarget;
    for (var i = 0; i < settings.categories.length; i += 1) if (settings.categories[i].id === targetId) return settings.categories[i];
    return settings.categories[0];
  }

  function directTargetId(path, payload, settings) {
    settings = settings || loadDirectSettings();
    if (String(path).indexOf('/nowplaying') >= 0) return settings.autoTarget;
    var requested = payload && payload.directTarget;
    return DIRECT_CATEGORY_IDS.indexOf(String(requested || '')) >= 0 ? String(requested) : settings.selectedTarget;
  }

  function directTargetReady(path, payload) {
    if (transportMode() !== 'direct') return true;
    var settings = loadDirectSettings();
    return Boolean(directCategory(settings, directTargetId(path, payload, settings)).webhook);
  }

  function directDiscordPayload(path, payload, category) {
    payload = payload || {};
    var username = '666SOUNDsDESIGn WebRadio';
    if (String(path).indexOf('/message') >= 0 || String(path).indexOf('/manual') >= 0) {
      var message = clean(payload.message || payload.track || payload.nowPlaying || '', 1800);
      return { username: username, content: message, allowed_mentions: { parse: [] } };
    }
    var title = clean(payload.track || payload.nowPlaying || [payload.artist, payload.title].filter(Boolean).join(' - ') || 'Live Stream', 240);
    var fields = [];
    if (clean(payload.dj, 120)) fields.push({ name: 'DJ', value: clean(payload.dj, 120), inline: true });
    if (clean(payload.bitrate, 80)) fields.push({ name: 'Bitrate', value: clean(payload.bitrate, 80), inline: true });
    if (clean(payload.listeners, 80)) fields.push({ name: 'Listeners', value: clean(payload.listeners, 80), inline: true });
    var embed = {
      title: 'NOW PLAYING',
      description: title,
      color: 16727483,
      fields: fields,
      footer: { text: '666SOUNDsDESIGn · ' + clean(category && category.label || 'DIRECT', 80) },
      timestamp: new Date().toISOString()
    };
    if (payload.playerUrl) embed.url = clean(payload.playerUrl, 1000);
    if (payload.artwork) embed.thumbnail = { url: clean(payload.artwork, 1000) };
    return { username: username, embeds: [embed], allowed_mentions: { parse: [] } };
  }

  function directErrorMessage(response, data) {
    var status = Number(response && response.status || 0);
    var code = Number(data && data.code || 0);
    if (status === 404 || code === 10015) return 'Webhook gelöscht oder ungültig';
    if (status === 401 || status === 403) return 'Webhook nicht autorisiert';
    if (status === 429) return 'Discord Rate-Limit aktiv';
    return clean(data && (data.message || data.error) || ('Discord HTTP ' + status), 180);
  }

  function directConfiguredCount(settings) {
    return (settings || loadDirectSettings()).categories.filter(function (category) { return Boolean(category.webhook); }).length;
  }

  function directCategoryOptions(settings, selected) {
    return settings.categories.map(function (category) {
      return '<option value="' + category.id + '"' + (category.id === selected ? ' selected' : '') + '>' + clean(category.label, 52) + (category.webhook ? ' ✓' : ' — FEHLT') + '</option>';
    }).join('');
  }

  function syncDirectSettingsUi() {
    if (transportMode() !== 'direct') return;
    var settings = loadDirectSettings();
    var targetSelect = document.getElementById('s666DiscordTargetSelect');
    var autoSelect = document.getElementById('s666DiscordAutoTarget');
    if (targetSelect) targetSelect.innerHTML = directCategoryOptions(settings, settings.selectedTarget);
    if (autoSelect) autoSelect.innerHTML = directCategoryOptions(settings, settings.autoTarget);
    settings.categories.forEach(function (category) {
      var label = document.querySelector('[data-direct-label="' + category.id + '"]');
      var webhook = document.querySelector('[data-direct-webhook="' + category.id + '"]');
      if (label && document.activeElement !== label) label.value = category.label;
      if (webhook && document.activeElement !== webhook) webhook.value = category.webhook;
    });
    var summary = document.getElementById('s666DiscordDirectSummary');
    if (summary) summary.textContent = directConfiguredCount(settings) + '/3 Ziele lokal eingerichtet · Auto: ' + directCategory(settings, settings.autoTarget).label;
  }

  function toggleDirectSettings(open) {
    var panel = document.getElementById('s666DiscordDirectSettings');
    if (!panel) return;
    var next = typeof open === 'boolean' ? open : panel.classList.contains('s666-discord-settings--hidden');
    panel.classList.toggle('s666-discord-settings--hidden', !next);
    if (next) syncDirectSettingsUi();
  }

  function saveDirectSettingsFromOverlay() {
    var current = loadDirectSettings();
    var invalid = false;
    current.categories = current.categories.map(function (category) {
      var labelInput = document.querySelector('[data-direct-label="' + category.id + '"]');
      var webhookInput = document.querySelector('[data-direct-webhook="' + category.id + '"]');
      var rawWebhook = String(webhookInput && webhookInput.value || '').trim();
      var normalized = normalizeDiscordWebhook(rawWebhook);
      if (rawWebhook && !normalized) invalid = true;
      return {
        id: category.id,
        label: clean(labelInput && labelInput.value || category.label, 52) || category.label,
        webhook: normalized
      };
    });
    var selected = document.getElementById('s666DiscordTargetSelect');
    var auto = document.getElementById('s666DiscordAutoTarget');
    if (selected && DIRECT_CATEGORY_IDS.indexOf(selected.value) >= 0) current.selectedTarget = selected.value;
    if (auto && DIRECT_CATEGORY_IDS.indexOf(auto.value) >= 0) current.autoTarget = auto.value;
    if (invalid) { setDiscordOverlayStatus('Mindestens eine Webhook-Adresse ist ungültig', 'error'); return false; }
    saveDirectSettings(current);
    syncDirectSettingsUi();
    setDiscordOverlayStatus('Direkte Discord-Ziele lokal gespeichert', 'ok');
    startupAutoPostDone = false;
    startupAutoPostStartedAt = 0;
    if (directPlaybackStarted) tryStartupAutoPost();
    checkStatus();
    return true;
  }

  function clearDirectSettingsFromOverlay() {
    saveDirectSettings(defaultDirectSettings());
    syncDirectSettingsUi();
    startupAutoPostDone = false;
    lastPostedKey = '';
    setDiscordOverlayStatus('Lokale Discord-Ziele entfernt', 'warn');
    checkStatus();
  }

  function bindDirectPlaybackAutopost() {
    if (directPlayingBridgeInstalled) return;
    directPlayingBridgeInstalled = true;
    function onPlaying(event) {
      if (transportMode() !== 'direct') return;
      if (event && event.target && String(event.target.tagName || '').toLowerCase() !== 'audio') return;
      directPlaybackStarted = true;
      if (!startupAutoPostDone) setTimeout(tryStartupAutoPost, 250);
    }
    document.addEventListener('playing', onPlaying, true);
    Array.prototype.slice.call(document.querySelectorAll('audio')).forEach(function (audio) {
      audio.addEventListener('playing', onPlaying, { passive: true });
      if (!audio.paused && audio.readyState >= 2) directPlaybackStarted = true;
    });
  }

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

  function releaseFetchController(controllerId, entry) {
    if (controllerId && activeFetchControllers[controllerId] === entry) delete activeFetchControllers[controllerId];
  }

  function abortActiveFetches() {
    Object.keys(activeFetchControllers).forEach(function (controllerId) {
      var entry = activeFetchControllers[controllerId];
      if (entry && typeof entry.cancel === 'function') {
        entry.cancel('lifecycle');
        return;
      }
      delete activeFetchControllers[controllerId];
      if (!entry || !entry.controller) return;
      entry.abortReason = 'lifecycle';
      try { entry.controller.abort(); } catch (_) {}
    });
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var limit = timeoutMs || REQUEST_TIMEOUT_MS;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var controllerId = ++fetchControllerSequence;
    var entry = { controller: controller, abortReason: '', cancel: null };
    var requestOptions = Object.assign({}, options || {});
    var timer = 0;
    var settled = false;
    activeFetchControllers[controllerId] = entry;
    if (controller) requestOptions.signal = controller.signal;
    return new Promise(function (resolve, reject) {
      function cleanup() {
        clearTimeout(timer);
        releaseFetchController(controllerId, entry);
      }
      function rejectAbort(error) {
        if (entry.abortReason === 'lifecycle') reject(staleLifecycleError());
        else if (error && error.name === 'AbortError') reject(new Error('discord_request_timeout'));
        else reject(error);
      }
      function cancelRequest(reason) {
        if (settled) return false;
        settled = true;
        entry.abortReason = reason || 'lifecycle';
        cleanup();
        if (controller) {
          try { controller.abort(); } catch (_) {}
        }
        if (reason === 'timeout') reject(new Error('discord_request_timeout'));
        else reject(staleLifecycleError());
        return true;
      }
      entry.cancel = cancelRequest;
      timer = setTimeout(function () { cancelRequest('timeout'); }, limit);
      var fetchPromise;
      try {
        fetchPromise = fetch(url, requestOptions);
      } catch (error) {
        if (!settled) {
          settled = true;
          cleanup();
          rejectAbort(error);
        }
        return;
      }
      Promise.resolve(fetchPromise).then(function (response) {
        return response.json().catch(function (error) {
          if (error && error.name === 'AbortError') throw error;
          return {};
        }).then(function (data) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({ response: response, data: data });
        });
      }).catch(function (error) {
        if (settled) return;
        settled = true;
        cleanup();
        rejectAbort(error);
      });
    });
  }

  function lifecycleIsCurrent(generation) {
    return !lifecycleSuspended && generation === lifecycleGeneration;
  }

  function staleLifecycleError() {
    var error = new Error('discord_request_stale');
    error.code = 'S666_STALE_LIFECYCLE';
    return error;
  }

  function isStaleLifecycleError(error) {
    return Boolean(error && (error.code === 'S666_STALE_LIFECYCLE' || error.message === 'discord_request_stale'));
  }

  async function postJson(path, payload) {
    if (activeRequestId) throw new Error('discord_request_in_flight');
    var requestId = ++requestSequence;
    var requestLifecycle = lifecycleGeneration;
    var direct = transportMode() === 'direct' && /^\/api\/discord\/(message|manual|nowplaying)$/.test(String(path || ''));
    activeRequestId = requestId;
    dispatch('s666:discord-state', { phase: 'sending', path: path, transport: direct ? 'direct-local' : 'worker', requestId: requestId });
    try {
      var requestUrl = path;
      var requestOptions = {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(payload || {})
      };
      var directCategoryState = null;
      if (direct) {
        var settings = loadDirectSettings();
        var targetId = directTargetId(path, payload, settings);
        directCategoryState = directCategory(settings, targetId);
        if (!directCategoryState.webhook) throw new Error('Discord-Ziel fehlt – ZIELE öffnen');
        requestUrl = directCategoryState.webhook + (directCategoryState.webhook.indexOf('?') >= 0 ? '&' : '?') + 'wait=true';
        requestOptions.credentials = 'omit';
        requestOptions.body = JSON.stringify(directDiscordPayload(path, payload, directCategoryState));
      }
      var packet = await fetchWithTimeout(requestUrl, requestOptions, REQUEST_TIMEOUT_MS);
      if (!lifecycleIsCurrent(requestLifecycle) || activeRequestId !== requestId) throw staleLifecycleError();
      var response = packet.response;
      var responseData = packet.data && typeof packet.data === 'object' ? packet.data : {};
      var data = responseData;
      if (direct) {
        if (!response.ok) throw new Error(directErrorMessage(response, responseData));
        data = {
          ok: true,
          sent: true,
          accepted: true,
          direct: true,
          target: directCategoryState.id,
          targetLabel: directCategoryState.label,
          __httpStatus: response.status
        };
      } else {
        data.__httpStatus = response.status;
        if (!response.ok || data.ok !== true) throw new Error(clean(data.error || data.message || ('HTTP ' + response.status), 300));
      }
      var summary = deliverySummary(data);
      dispatch('s666:discord-state', { phase: summary.warning ? 'warning' : 'success', path: path, transport: direct ? 'direct-local' : 'worker', data: data, summary: summary, requestId: requestId });
      return data;
    } catch (error) {
      if (!lifecycleIsCurrent(requestLifecycle) || activeRequestId !== requestId || isStaleLifecycleError(error)) throw staleLifecycleError();
      dispatch('s666:discord-state', { phase: 'error', path: path, transport: direct ? 'direct-local' : 'worker', error: error && error.message ? error.message : String(error), requestId: requestId });
      throw error;
    } finally {
      if (activeRequestId === requestId) activeRequestId = 0;
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
      '.s666-discord-emojis{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px}.s666-discord-emoji{min-width:32px;min-height:30px;border-radius:8px!important;padding:4px 6px!important;font-size:18px!important}.s666-discord-nowplaying{border-color:rgba(126,220,255,.68)!important;color:#7edcff!important}',
      '.s666-discord-target-row{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;align-items:center!important;margin:10px auto 0!important;width:min(340px,82vw)!important}.s666-discord-target-select,.s666-discord-direct-input{min-height:34px!important;border-radius:10px!important;border:1px solid rgba(22,255,243,.48)!important;background:rgba(0,0,0,.55)!important;color:#eaffff!important;padding:6px 9px!important;font-weight:800!important}.s666-discord-settings-toggle{min-height:34px!important;border-radius:10px!important;border:1px solid rgba(255,61,187,.58)!important;background:rgba(255,61,187,.10)!important;color:#ff8ddb!important;font-weight:950!important;cursor:pointer!important}',
      '.s666-discord-settings{width:min(400px,86vw)!important;margin:10px auto 0!important;padding:10px!important;border:1px solid rgba(22,255,243,.26)!important;border-radius:14px!important;background:rgba(0,0,0,.30)!important;text-align:left!important}.s666-discord-settings--hidden{display:none!important}.s666-discord-direct-row{display:grid!important;grid-template-columns:minmax(90px,.8fr) minmax(150px,1.6fr)!important;gap:7px!important;margin:6px 0!important}.s666-discord-direct-input{width:100%!important;box-sizing:border-box!important}.s666-discord-direct-summary{font-size:10px!important;color:#9eefff!important;text-align:center!important;margin:4px 0 8px!important}.s666-discord-settings-actions{display:flex!important;justify-content:center!important;gap:8px!important;margin-top:8px!important}.s666-discord-settings-note{font-size:9px!important;line-height:1.3!important;color:rgba(220,250,255,.68)!important;text-align:center!important}'
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

  function renderDiscordOverlayStatus(text, mode) {
    var status = document.getElementById('s666DiscordMessageStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = 's666-discord-status' + (mode ? ' is-' + mode : '');
  }

  function applyDiscordOverlayStatusState() {
    renderDiscordOverlayStatus(discordOverlayStatusState.text, discordOverlayStatusState.mode);
  }

  function setDiscordOverlayStatus(text, mode) {
    discordOverlayStatusState = { text: text || '', mode: mode || '' };
    applyDiscordOverlayStatusState();
  }

  function syncDiscordDraftToOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    if (!input) return;
    if (!input.value && discordDraftState) input.value = discordDraftState;
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

  function setDiscordOverlayButtonsDisabled(disabled) {
    ['s666DiscordMessageSend', 's666DiscordNowPlayingSend'].forEach(function (id) {
      var currentButton = document.getElementById(id);
      if (currentButton) currentButton.disabled = Boolean(disabled);
    });
  }

  function scheduleDiscordOverlayFocus(delay) {
    clearTimeout(discordOverlayFocusTimer);
    var focusLifecycle = lifecycleGeneration;
    discordOverlayFocusTimer = setTimeout(function () {
      discordOverlayFocusTimer = 0;
      var currentOverlay = document.getElementById('s666DiscordMessageOverlay');
      if (!lifecycleIsCurrent(focusLifecycle) || !currentOverlay || currentOverlay.classList.contains('s666-discord-gate--hidden')) return;
      var currentInput = document.getElementById('s666DiscordMessageText');
      if (currentInput && currentOverlay.contains(currentInput)) {
        try { currentInput.focus(); } catch (_) {}
      }
    }, typeof delay === 'number' ? delay : 40);
  }

  function restoreDiscordOverlayFocus() {
    var previous = discordOverlayReturnFocus;
    discordOverlayReturnFocus = null;
    if (lifecycleSuspended || !previous || previous.isConnected === false || typeof previous.focus !== 'function') return;
    try { previous.focus(); } catch (_) {}
  }

  function closeMessageOverlay() {
    clearTimeout(discordOverlayFocusTimer);
    discordOverlayFocusTimer = 0;
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) overlay.classList.add('s666-discord-gate--hidden');
    restoreDiscordOverlayFocus();
  }

  function installEscapeBridge() {
    if (escapeBridgeInstalled) return;
    escapeBridgeInstalled = true;
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var discordOverlay = document.getElementById('s666DiscordMessageOverlay');
      if (discordOverlay && !discordOverlay.classList.contains('s666-discord-gate--hidden')) closeMessageOverlay();
      var velunaOverlay = document.getElementById('s666VelunaMessengerOverlay');
      if (velunaOverlay && !velunaOverlay.classList.contains('s666-discord-gate--hidden')) closeVelunaMessengerOverlay();
    });
  }

  function bindDiscordMessageOverlay(overlay) {
    if (!overlay || overlay.__s666DiscordOverlayBound === true) return;
    overlay.__s666DiscordOverlayBound = true;
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || (event.target.closest && event.target.closest('[data-discord-close]'))) { closeMessageOverlay(); return; }
      if (event.target.closest && event.target.closest('[data-discord-settings-toggle]')) { toggleDirectSettings(); return; }
      if (event.target.closest && event.target.closest('[data-discord-settings-save]')) { saveDirectSettingsFromOverlay(); return; }
      if (event.target.closest && event.target.closest('[data-discord-settings-clear]')) { clearDirectSettingsFromOverlay(); return; }
      var emojiButton = event.target.closest && event.target.closest('[data-discord-emoji]');
      if (emojiButton) {
        insertAtCursor(document.getElementById('s666DiscordMessageText'), emojiButton.getAttribute('data-discord-emoji') || '', 1800);
        var emojiInput = document.getElementById('s666DiscordMessageText');
        if (emojiInput) {
          discordDraftState = String(emojiInput.value || '');
          discordDraftRevision += 1;
        }
        return;
      }
      var action = event.target.closest && event.target.closest('#s666DiscordMessageSend,#s666DiscordNowPlayingSend');
      if (!action) return;
      if (action.id === 's666DiscordMessageSend') sendMessageFromOverlay();
      else sendNowPlayingFromOverlay();
    });
    overlay.addEventListener('input', function (event) {
      if (event.target && event.target.id === 's666DiscordMessageText') {
        discordDraftState = String(event.target.value || '');
        discordDraftRevision += 1;
      }
    });
    overlay.addEventListener('change', function (event) {
      if (!event.target) return;
      if (event.target.id === 's666DiscordTargetSelect') {
        var settings = loadDirectSettings();
        if (DIRECT_CATEGORY_IDS.indexOf(event.target.value) >= 0) settings.selectedTarget = event.target.value;
        saveDirectSettings(settings);
        syncDirectSettingsUi();
      }
    });
    overlay.addEventListener('keydown', function (event) {
      if (!event.target || event.target.id !== 's666DiscordMessageText') return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        sendMessageFromOverlay();
      }
    });
  }

  function reconcileDiscordMessageOverlay() {
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (!overlay) return false;
    bindDiscordMessageOverlay(overlay);
    syncDiscordDraftToOverlay();
    syncDirectSettingsUi();
    applyDiscordOverlayStatusState();
    setDiscordOverlayButtonsDisabled(Boolean(activeDiscordOverlaySendId || activeRequestId));
    if (!overlay.classList.contains('s666-discord-gate--hidden')) {
      var activeElement = document.activeElement;
      if (!activeElement || activeElement === document.body || !overlay.contains(activeElement)) scheduleDiscordOverlayFocus(0);
    }
    return true;
  }

  function ensureMessageOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666DiscordMessageOverlay');
    if (overlay) {
      reconcileDiscordMessageOverlay();
      return overlay;
    }
    overlay = document.createElement('div');
    overlay.id = 's666DiscordMessageOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden s666-discord-gate--message';
    var emojiHtml = '<div class="s666-discord-emojis">' + DISCORD_EMOJIS.map(function (emoji) { return '<button type="button" class="s666-discord-emoji" data-discord-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Message to Discord:</div>' +
      '<div class="s666-discord-target-row"><select id="s666DiscordTargetSelect" class="s666-discord-target-select" aria-label="Discord Posting Kategorie"></select><button type="button" class="s666-discord-settings-toggle" data-discord-settings-toggle>ZIELE</button></div>' +
      '<div id="s666DiscordDirectSettings" class="s666-discord-settings s666-discord-settings--hidden"><div id="s666DiscordDirectSummary" class="s666-discord-direct-summary"></div>' +
      '<div class="s666-discord-direct-row"><input class="s666-discord-direct-input" data-direct-label="main" maxlength="52" aria-label="Kategorie 1 Name"><input type="password" autocomplete="off" class="s666-discord-direct-input" data-direct-webhook="main" placeholder="Webhook Kategorie 1" aria-label="Webhook Kategorie 1"></div>' +
      '<div class="s666-discord-direct-row"><input class="s666-discord-direct-input" data-direct-label="community" maxlength="52" aria-label="Kategorie 2 Name"><input type="password" autocomplete="off" class="s666-discord-direct-input" data-direct-webhook="community" placeholder="Webhook Kategorie 2" aria-label="Webhook Kategorie 2"></div>' +
      '<div class="s666-discord-direct-row"><input class="s666-discord-direct-input" data-direct-label="labor" maxlength="52" aria-label="Kategorie 3 Name"><input type="password" autocomplete="off" class="s666-discord-direct-input" data-direct-webhook="labor" placeholder="Webhook Kategorie 3" aria-label="Webhook Kategorie 3"></div>' +
      '<div class="s666-discord-direct-row"><span class="s666-discord-settings-note">AUTO NOW PLAYING</span><select id="s666DiscordAutoTarget" class="s666-discord-target-select" aria-label="Auto Now Playing Ziel"></select></div>' +
      '<div class="s666-discord-settings-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-settings-clear>CLEAR</button><button type="button" class="s666-discord-gate-submit" data-discord-settings-save>SAVE LOCAL</button></div><div class="s666-discord-settings-note">Nur in diesem Browser gespeichert · keine Worker · keine Repo-Secrets</div></div>' +
      '<textarea id="s666DiscordMessageText" class="s666-discord-msg-input" maxlength="1800" rows="7" placeholder="Message"></textarea>' +
      emojiHtml +
      '<div id="s666DiscordMessageStatus" class="s666-discord-status" role="status" aria-live="polite">Bereit</div>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-close>CLOSE</button><button type="button" id="s666DiscordNowPlayingSend" class="s666-discord-gate-submit s666-discord-nowplaying">NOW PLAYING</button><button type="button" id="s666DiscordMessageSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bindDiscordMessageOverlay(overlay);
    syncDiscordDraftToOverlay();
    syncDirectSettingsUi();
    applyDiscordOverlayStatusState();
    installEscapeBridge();
    return overlay;
  }

  async function openMessageOverlay() {
    var overlay = ensureMessageOverlay();
    var activeElement = document.activeElement;
    var overlayBusy = Boolean(activeDiscordOverlaySendId || activeRequestId);
    if (activeElement && activeElement !== document.body && !overlay.contains(activeElement)) discordOverlayReturnFocus = activeElement;
    overlay.classList.remove('s666-discord-gate--hidden');
    syncDirectSettingsUi();
    setDiscordOverlayButtonsDisabled(overlayBusy);
    setDiscordOverlayStatus(overlayBusy ? 'Discord verarbeitet bereits einen Versand …' : 'Bereit', overlayBusy ? 'sending' : '');
    scheduleDiscordOverlayFocus(40);
    return true;
  }

  function requestBusyResult(source) {
    return {
      ok: false,
      skipped: true,
      busy: true,
      reason: 'request_in_flight',
      source: source || 'discord'
    };
  }

  async function sendMessageFromOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    var inputSnapshot = String(input && input.value || '');
    var inputRevision = discordDraftRevision;
    discordDraftState = inputSnapshot;
    var message = clean(inputSnapshot, 1800);
    var sendLifecycle = lifecycleGeneration;
    if (!message) { setDiscordOverlayStatus('Nachricht fehlt', 'error'); return; }
    if (activeDiscordOverlaySendId) return;
    if (activeRequestId) {
      setDiscordOverlayStatus('Discord verarbeitet bereits einen Versand …', 'warn');
      return;
    }
    var sendId = ++discordOverlaySendSequence;
    activeDiscordOverlaySendId = sendId;
    setDiscordOverlayButtonsDisabled(true);
    setDiscordOverlayStatus('Wird gesendet …', 'sending');
    try {
      var selectedTarget = document.getElementById('s666DiscordTargetSelect');
      var result = await postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: message, manual: true, directTarget: selectedTarget && selectedTarget.value }));
      if (!lifecycleIsCurrent(sendLifecycle) || activeDiscordOverlaySendId !== sendId) return;
      var summary = deliverySummary(result, '✓ Discord-Nachricht angenommen');
      if (summary.skipped || !summary.sent) {
        setDiscordOverlayStatus(summary.text, summary.skipped ? 'warn' : 'error');
      } else {
        var currentInput = document.getElementById('s666DiscordMessageText');
        if (discordDraftRevision === inputRevision && discordDraftState === inputSnapshot) {
          discordDraftState = '';
          discordDraftRevision += 1;
          if (currentInput && currentInput.value === inputSnapshot) currentInput.value = '';
        }
        setDiscordOverlayStatus(summary.text, summary.warning ? 'warn' : 'ok');
      }
    } catch (error) {
      if (isStaleLifecycleError(error) || !lifecycleIsCurrent(sendLifecycle) || activeDiscordOverlaySendId !== sendId) return;
      setDiscordOverlayStatus('✗ Versand fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (activeDiscordOverlaySendId === sendId) activeDiscordOverlaySendId = 0;
      if (lifecycleIsCurrent(sendLifecycle)) setDiscordOverlayButtonsDisabled(false);
    }
  }

  async function sendNowPlayingFromOverlay() {
    var sendLifecycle = lifecycleGeneration;
    if (activeDiscordOverlaySendId) return;
    if (activeRequestId) {
      setDiscordOverlayStatus('Discord verarbeitet bereits einen Versand …', 'warn');
      return;
    }
    var sendId = ++discordOverlaySendSequence;
    activeDiscordOverlaySendId = sendId;
    setDiscordOverlayButtonsDisabled(true);
    setDiscordOverlayStatus('Now Playing wird gesendet …', 'sending');
    try {
      var result = await postTrackIfChanged(true, 'manual-now-playing');
      if (!lifecycleIsCurrent(sendLifecycle) || activeDiscordOverlaySendId !== sendId) return;
      var summary = deliverySummary(result, '✓ Now Playing von Discord angenommen');
      setDiscordOverlayStatus(summary.text, summary.skipped || summary.warning ? 'warn' : (summary.sent ? 'ok' : 'error'));
    } catch (error) {
      if (isStaleLifecycleError(error) || !lifecycleIsCurrent(sendLifecycle) || activeDiscordOverlaySendId !== sendId) return;
      setDiscordOverlayStatus('✗ Now Playing fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (activeDiscordOverlaySendId === sendId) activeDiscordOverlaySendId = 0;
      if (lifecycleIsCurrent(sendLifecycle)) setDiscordOverlayButtonsDisabled(false);
    }
  }

  async function messagePost(message) {
    if (typeof message === 'string' && clean(message, 1800)) {
      if (activeRequestId) return requestBusyResult('message');
      var settings = loadDirectSettings();
      return postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: clean(message, 1800), manual: true, directTarget: settings.selectedTarget }));
    }
    return openMessageOverlay();
  }

  async function manualPost() {
    if (activeRequestId) return requestBusyResult('manual');
    var settings = loadDirectSettings();
    return postJson('/api/discord/manual', Object.assign(readTrackFromDom(), { manual: true, directTarget: settings.selectedTarget }));
  }

  async function postTrackIfChanged(force, reason) {
    if (activeRequestId) return requestBusyResult(reason || 'nowplaying');
    var data = readTrackFromDom();
    var key = trackKey(data);
    var postLifecycle = lifecycleGeneration;
    if (!key) return { ok: true, skipped: true, reason: 'no_track_key' };
    if (transportMode() === 'direct' && !directTargetReady('/api/discord/nowplaying', data)) return { ok: true, skipped: true, configured: false, reason: 'direct_target_missing' };
    if (transportMode() === 'direct' && !force && !directPlaybackStarted) return { ok: true, skipped: true, reason: 'audio_not_playing' };
    if (key === lastPostedKey && !force) return { ok: true, skipped: true, reason: 'unchanged' };
    var result = await postJson('/api/discord/nowplaying', Object.assign({}, data, {
      force: Boolean(force),
      reason: reason || (force ? 'manual' : 'watcher'),
      clientVersion: VERSION
    }));
    if (lifecycleIsCurrent(postLifecycle) && trackKey(readTrackFromDom()) === key && (!result || result.skipped !== true)) lastPostedKey = key;
    return result;
  }

  function tryStartupAutoPost() {
    clearTimeout(startupTimer);
    if (startupAutoPostDone) return;
    if (transportMode() === 'direct' && !directPlaybackStarted) return;
    if (transportMode() === 'direct' && !directTargetReady('/api/discord/nowplaying', readTrackFromDom())) {
      startupAutoPostDone = true;
      dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'direct_target_missing', transport: 'direct-local' });
      return;
    }
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
    var startupLifecycle = lifecycleGeneration;
    postTrackIfChanged(true, 'startup-first-now-playing')
      .then(function (result) {
        if (!lifecycleIsCurrent(startupLifecycle)) return;
        if (result && result.busy) {
          startupAutoPostDone = false;
          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'request_in_flight', key: key });
          if (Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS) startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS);
          else lastTrackKey = '';
          return;
        }
        var summary = deliverySummary(result);
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : (summary.warning ? 'startup-autopost-warning' : 'startup-autopost-success'), data: result, summary: summary });
      })
      .catch(function (error) {
        if (isStaleLifecycleError(error) || !lifecycleIsCurrent(startupLifecycle)) return;
        startupAutoPostDone = false;
        dispatch('s666:discord-state', { phase: 'startup-autopost-error', error: error && error.message ? error.message : String(error) });
        if (Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS) {
          startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS);
        } else {
          lastTrackKey = '';
          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'retry-window-exhausted', key: key });
        }
      });
  }

  async function checkStatus() {
    var statusId = ++statusSequence;
    if (transportMode() === 'direct') {
      var settings = loadDirectSettings();
      var configured = directConfiguredCount(settings);
      var autoReady = Boolean(directCategory(settings, settings.autoTarget).webhook);
      var localData = {
        ok: configured > 0,
        direct: true,
        transport: 'direct-local',
        configuredTargets: configured,
        targetCount: 3,
        autoReady: autoReady,
        autoTarget: settings.autoTarget
      };
      dispatch('s666:discord-state', { phase: 'status', ok: localData.ok, data: localData, statusId: statusId });
      return localData;
    }
    var statusLifecycle = lifecycleGeneration;
    var statusRequestSequence = requestSequence;
    var statusStartedDuringRequest = Boolean(activeRequestId);
    function statusIsStale() {
      return !lifecycleIsCurrent(statusLifecycle) ||
        statusId !== statusSequence ||
        statusStartedDuringRequest ||
        Boolean(activeRequestId) ||
        requestSequence !== statusRequestSequence;
    }
    try {
      var packet = await fetchWithTimeout('/api/discord/status?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } }, STATUS_TIMEOUT_MS);
      if (statusIsStale()) return { ok: false, stale: true };
      var response = packet.response;
      var data = packet.data && typeof packet.data === 'object' ? packet.data : {};
      dispatch('s666:discord-state', { phase: 'status', ok: response.ok && data.ok === true, data: data, statusId: statusId });
      return data;
    } catch (error) {
      if (isStaleLifecycleError(error) || statusIsStale()) return { ok: false, stale: true };
      dispatch('s666:discord-state', { phase: 'status', ok: false, error: error && error.message ? error.message : String(error), statusId: statusId });
      return { ok: false };
    }
  }

  function scheduleWatcher(delay) {
    clearTimeout(watcherTimer);
    watcherTimer = 0;
    if (lifecycleSuspended) return;
    watcherTimer = setTimeout(async function () {
      if (lifecycleSuspended) return;
      if (watcherRunning) {
        scheduleWatcher(document.hidden ? 30000 : 1500);
        return;
      }
      watcherRunning = true;
      var watcherLifecycle = lifecycleGeneration;
      try {
        var current = trackKey(readTrackFromDom());
        if (current && current !== lastTrackKey) {
          try {
            var result = await postTrackIfChanged(false, 'watcher-track-change');
            if (result && result.ok === true && lifecycleIsCurrent(watcherLifecycle) && trackKey(readTrackFromDom()) === current) lastTrackKey = current;
          } catch (_) {}
        }
      } finally {
        watcherRunning = false;
        if (!lifecycleSuspended) scheduleWatcher(document.hidden ? 30000 : 8000);
      }
    }, delay);
  }

  function clearScriptLoadEntry(id, entry) {
    if (scriptLoads[id] === entry) delete scriptLoads[id];
  }

  function cancelPendingScriptLoads() {
    Object.keys(scriptLoads).forEach(function (id) {
      var entry = scriptLoads[id];
      if (entry && typeof entry.cancel === 'function') entry.cancel(staleLifecycleError());
    });
  }

  function normalizedScriptSource(src) {
    try {
      var url = new URL(src, document.baseURI || location.href);
      url.hash = '';
      return url.href;
    } catch (_) { return String(src || '').split('#')[0]; }
  }

  function scriptSourceMatches(script, src) {
    if (!script) return false;
    var currentSource = script.src || script.getAttribute('src') || '';
    return normalizedScriptSource(currentSource) === normalizedScriptSource(src);
  }

  function scriptIsLoaderOwned(script) {
    return Boolean(script && script.dataset && script.dataset.s666LoaderOwned === '1');
  }

  function recoveryScriptId(id, recoveryIndex) {
    return recoveryIndex > 0 ? id + 'S666Recovery' + (recoveryIndex > 1 ? String(recoveryIndex) : '') : id;
  }

  function findScriptSlot(id, src, forceRecovery) {
    var recoveryIndex = forceRecovery ? 1 : 0;
    var elementId = recoveryScriptId(id, recoveryIndex);
    var script = document.getElementById(elementId);
    while (script && (!scriptSourceMatches(script, src) || (forceRecovery && !scriptIsLoaderOwned(script)))) {
      if (scriptIsLoaderOwned(script)) {
        if (script.parentNode) script.parentNode.removeChild(script);
        script = null;
        break;
      }
      recoveryIndex += 1;
      elementId = recoveryScriptId(id, recoveryIndex);
      script = document.getElementById(elementId);
    }
    return { elementId: elementId, script: script };
  }

  function removeOwnedScriptSlots(id) {
    var scripts = document.getElementsByTagName ? Array.prototype.slice.call(document.getElementsByTagName('script')) : [];
    scripts.forEach(function (script) {
      var elementId = String(script && script.id || '');
      if (elementId !== id && elementId.indexOf(id + 'S666Recovery') !== 0) return;
      if (scriptIsLoaderOwned(script) && script.parentNode) script.parentNode.removeChild(script);
    });
  }

  function loadScriptOnce(id, src, forceRecovery) {
    var requestedSource = normalizedScriptSource(src);
    var pending = scriptLoads[id];
    if (pending) {
      if (pending.source === requestedSource && pending.forceRecovery === Boolean(forceRecovery)) return pending.promise;
      if (typeof pending.cancel === 'function') pending.cancel(new Error('script_source_changed:' + id));
    }
    var entry = {
      promise: null,
      cancel: null,
      script: null,
      createdByAddon: false,
      source: requestedSource,
      forceRecovery: Boolean(forceRecovery)
    };
    scriptLoads[id] = entry;
    entry.promise = new Promise(function (resolve, reject) {
      var slot = findScriptSlot(id, requestedSource, entry.forceRecovery);
      var elementId = slot.elementId;
      var script = slot.script;
      var settled = false;
      var timeout = 0;
      var appendAfterBinding = false;
      entry.script = script;
      entry.createdByAddon = scriptIsLoaderOwned(script);
      function cleanup() {
        clearTimeout(timeout);
        if (!script) return;
        script.removeEventListener('load', done);
        script.removeEventListener('error', failed);
      }
      function removeBrokenScript() {
        if (entry.createdByAddon && script && script.parentNode) script.parentNode.removeChild(script);
      }
      function finish(error) {
        if (settled) return;
        settled = true;
        cleanup();
        clearScriptLoadEntry(id, entry);
        if (error) reject(error);
        else resolve();
      }
      function done() {
        if (script) script.dataset.s666Loaded = '1';
        finish();
      }
      function failed() {
        removeBrokenScript();
        finish(new Error('script_load_failed:' + src));
      }
      function timedOut() {
        removeBrokenScript();
        finish(new Error('script_load_timeout:' + src));
      }
      entry.cancel = function (error) {
        if (settled) return;
        removeBrokenScript();
        finish(error || staleLifecycleError());
      };
      if (script && (script.dataset.s666Loaded === '1' || script.readyState === 'loaded' || script.readyState === 'complete')) return done();
      if (!script) {
        script = document.createElement('script');
        entry.script = script;
        entry.createdByAddon = true;
        appendAfterBinding = true;
        script.id = elementId;
        script.src = requestedSource;
        script.async = false;
        script.dataset.s666LoaderOwned = '1';
      }
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', failed, { once: true });
      timeout = setTimeout(timedOut, REQUEST_TIMEOUT_MS);
      if (appendAfterBinding) {
        var host = document.head || document.documentElement;
        if (!host) return finish(new Error('script_host_missing:' + src));
        host.appendChild(script);
      }
    });
    return entry.promise;
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
    installEscapeBridge();
    document.getElementById('s666VelunaMessengerSend').addEventListener('click', sendVelunaMessenger);
    return overlay;
  }

  function ensurePlayerAlertClient() {
    if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return Promise.resolve(window.S666PlayerAlertClient);
    if (playerAlertClientLoad) return playerAlertClientLoad;
    var loadPromise = (async function () {
      var id = 's666PlayerAlertClientVelunaBridge';
      var src = '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121';
      await loadScriptOnce(id, src);
      if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
      removeOwnedScriptSlots(id);
      delete scriptLoads[id];
      await loadScriptOnce(id, src, true);
      if (window.S666PlayerAlertClient && typeof window.S666PlayerAlertClient.send === 'function') return window.S666PlayerAlertClient;
      throw new Error('player_alert_client_missing');
    })();
    playerAlertClientLoad = loadPromise;
    loadPromise.then(function () {
      if (playerAlertClientLoad === loadPromise) playerAlertClientLoad = null;
    }, function () {
      if (playerAlertClientLoad === loadPromise) playerAlertClientLoad = null;
    });
    return loadPromise;
  }

  function ensureMessengerOverlayClient() {
    if (window.S666Messenger && typeof window.S666Messenger.open === 'function') return Promise.resolve(window.S666Messenger);
    if (messengerOverlayClientLoad) return messengerOverlayClientLoad;
    var loadPromise = (async function () {
      var id = 's666MessengerOverlayVelunaBridge';
      var src = '/js/messenger-overlay.js?v=2026-07-19-overlay-status-v2';
      await loadScriptOnce(id, src);
      if (window.S666Messenger && typeof window.S666Messenger.open === 'function') return window.S666Messenger;
      removeOwnedScriptSlots(id);
      delete scriptLoads[id];
      await loadScriptOnce(id, src, true);
      if (window.S666Messenger && typeof window.S666Messenger.open === 'function') return window.S666Messenger;
      throw new Error('messenger_overlay_missing');
    })();
    messengerOverlayClientLoad = loadPromise;
    loadPromise.then(function () {
      if (messengerOverlayClientLoad === loadPromise) messengerOverlayClientLoad = null;
    }, function () {
      if (messengerOverlayClientLoad === loadPromise) messengerOverlayClientLoad = null;
    });
    return loadPromise;
  }

  async function sendVelunaMessenger() {
    var input = document.getElementById('s666VelunaMessengerText');
    var button = document.getElementById('s666VelunaMessengerSend');
    var inputSnapshot = String(input && input.value || '');
    var message = clean(inputSnapshot, MSG_MAX);
    var sendLifecycle = lifecycleGeneration;
    if (!message) { setVelunaMessengerStatus('Nachricht fehlt', 'error'); return; }
    if (activeVelunaSendId) return;
    var sendId = ++velunaSendSequence;
    activeVelunaSendId = sendId;
    if (button) button.disabled = true;
    setVelunaMessengerStatus('Wird an die Hörer gesendet …', 'sending');
    dispatch('s666:veluna-messenger-state', { phase: 'sending', sendId: sendId });
    try {
      var client = await ensurePlayerAlertClient();
      if (!lifecycleIsCurrent(sendLifecycle) || activeVelunaSendId !== sendId) throw staleLifecycleError();
      var result = await client.send(message, { username: 'Veluna Broadcast', source: 'veluna-messenger' });
      if (!lifecycleIsCurrent(sendLifecycle) || activeVelunaSendId !== sendId) throw staleLifecycleError();
      if (!result || result.ok !== true) throw new Error(clean(result && (result.error || result.message), 200) || 'messenger_send_failed');
      var currentInput = document.getElementById('s666VelunaMessengerText');
      if (currentInput && currentInput.value === inputSnapshot) currentInput.value = '';
      var count = document.getElementById('s666VelunaMessengerCount');
      if (count && currentInput) count.textContent = String(currentInput.value.length) + ' / ' + MSG_MAX;
      setVelunaMessengerStatus('✓ Erfolgreich an die Hörer gesendet', 'ok');
      dispatch('s666:veluna-messenger-state', { phase: 'success', data: result, sendId: sendId });
    } catch (error) {
      if (isStaleLifecycleError(error) || !lifecycleIsCurrent(sendLifecycle) || activeVelunaSendId !== sendId) return;
      var detail = error && error.message ? error.message : String(error || 'messenger_send_failed');
      setVelunaMessengerStatus('✗ Versand fehlgeschlagen: ' + clean(detail, 180), 'error');
      dispatch('s666:veluna-messenger-state', { phase: 'error', error: detail, sendId: sendId });
    } finally {
      if (activeVelunaSendId === sendId) activeVelunaSendId = 0;
      if (lifecycleIsCurrent(sendLifecycle)) {
        var currentButton = document.getElementById('s666VelunaMessengerSend');
        if (currentButton) currentButton.disabled = false;
      }
    }
  }

  function openVelunaMessengerFromButton() {
    var openId = ++messengerOpenSequence;
    var openLifecycle = lifecycleGeneration;
    ensureMessengerOverlayClient()
      .then(function (messenger) {
        if (!lifecycleIsCurrent(openLifecycle) || openId !== messengerOpenSequence) return;
        messenger.open();
      })
      .catch(function (error) {
        if (isStaleLifecycleError(error) || !lifecycleIsCurrent(openLifecycle) || openId !== messengerOpenSequence) return;
        dispatch('s666:veluna-messenger-state', { phase: 'error', error: error && error.message ? error.message : String(error) });
      });
  }

  function mountVelunaMessengerButton() {
    var discordButton = document.getElementById('discordBtn');
    var toolStrip = discordButton && typeof discordButton.closest === 'function' ? discordButton.closest('.tool-strip') : document.querySelector('.tool-strip');
    if (!toolStrip || !discordButton) return false;
    var button = document.getElementById('s666VelunaMessageButton');
    var changed = false;
    if (!button) {
      button = document.createElement('button');
      button.id = 's666VelunaMessageButton';
      button.type = 'button';
      button.className = 'small-btn s666-veluna-msg-btn';
      button.textContent = 'MSG';
      changed = true;
    }
    button.title = 'VELUNA Broadcast Messenger';
    button.setAttribute('aria-label', 'VELUNA Broadcast Messenger');
    if (button.__s666VelunaMessengerBound !== true) {
      button.__s666VelunaMessengerBound = true;
      button.addEventListener('click', openVelunaMessengerFromButton);
      changed = true;
    }
    if (button.parentNode !== toolStrip) {
      if (discordButton.parentNode === toolStrip) toolStrip.insertBefore(button, discordButton.nextSibling);
      else toolStrip.appendChild(button);
      changed = true;
    }
    return changed;
  }

  function installVelunaDiscordNoAuthBypass() {
    var button = document.getElementById('discordBtn');
    if (!button || button.__s666NoAuthDiscordBound === true) return false;
    button.__s666NoAuthDiscordBound = true;
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

  function applyDiscordButtonPhase(button, phase) {
    if (!button) return;
    var effectivePhase = phase || discordButtonPhase;
    button.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');
    if (effectivePhase === 'sending') button.classList.add('is-busy');
    else if (effectivePhase === 'success') button.classList.add('is-ok');
    else if (effectivePhase === 'warning') button.classList.add('is-warn');
    else if (effectivePhase === 'error') button.classList.add('is-error');
  }

  function applyVelunaButtonPhase(button, phase) {
    if (!button) return;
    var effectivePhase = phase || velunaButtonPhase;
    button.classList.remove('is-busy', 'is-ok', 'is-error');
    if (effectivePhase === 'sending') button.classList.add('is-busy');
    else if (effectivePhase === 'success') button.classList.add('is-ok');
    else if (effectivePhase === 'error') button.classList.add('is-error');
  }

  function syncMountedBusyState() {
    var discordButton = document.getElementById('discordBtn');
    applyDiscordButtonPhase(discordButton, activeRequestId ? 'sending' : discordButtonPhase);
    var velunaButton = document.getElementById('s666VelunaMessageButton');
    applyVelunaButtonPhase(velunaButton, activeVelunaSendId ? 'sending' : velunaButtonPhase);
    var discordBusy = Boolean(activeDiscordOverlaySendId || activeRequestId);
    setDiscordOverlayButtonsDisabled(discordBusy);
    if (discordBusy) renderDiscordOverlayStatus('Discord verarbeitet bereits einen Versand …', 'sending');
    else applyDiscordOverlayStatusState();
    var velunaSendButton = document.getElementById('s666VelunaMessengerSend');
    if (velunaSendButton) velunaSendButton.disabled = Boolean(activeVelunaSendId);
    if (activeVelunaSendId) setVelunaMessengerStatus('Wird an die Hörer gesendet …', 'sending');
  }

  function reconcileMountedControls() {
    mountVelunaMessengerButton();
    installVelunaDiscordNoAuthBypass();
    reconcileDiscordMessageOverlay();
    syncMountedBusyState();
  }

  function nodeTouchesMountedControls(node) {
    if (!node || node.nodeType !== 1) return false;
    var selector = '#discordBtn,#s666VelunaMessageButton,#s666DiscordMessageOverlay,#s666DiscordMessageSend,#s666DiscordNowPlayingSend,#s666VelunaMessengerSend,.tool-strip';
    if (node.matches && node.matches(selector)) return true;
    return Boolean(node.querySelector && node.querySelector(selector));
  }

  function scheduleControlReconciliation() {
    if (lifecycleSuspended || controlReconcileTimer) return;
    controlReconcileTimer = setTimeout(function () {
      controlReconcileTimer = 0;
      if (!lifecycleSuspended) reconcileMountedControls();
    }, 0);
  }

  function startControlObserver() {
    if (controlObserver || typeof MutationObserver !== 'function') return;
    var root = document && typeof document.nodeType === 'number' ? document : (document.documentElement || document.body);
    if (!root) return;
    controlObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        for (var a = 0; a < mutation.addedNodes.length; a += 1) {
          if (nodeTouchesMountedControls(mutation.addedNodes[a])) return scheduleControlReconciliation();
        }
        for (var r = 0; r < mutation.removedNodes.length; r += 1) {
          if (nodeTouchesMountedControls(mutation.removedNodes[r])) return scheduleControlReconciliation();
        }
      }
    });
    controlObserverRoot = root;
    try {
      controlObserver.observe(root, { childList: true, subtree: true });
    } catch (_) {
      controlObserver.disconnect();
      controlObserver = null;
      controlObserverRoot = null;
    }
  }

  function stopControlObserver() {
    clearTimeout(controlReconcileTimer);
    controlReconcileTimer = 0;
    if (controlObserver) controlObserver.disconnect();
    controlObserver = null;
    controlObserverRoot = null;
  }

  function initVelunaMessengerBridge() {
    if (!window.__S666_VELUNA_MESSENGER_STATUS_BRIDGE__) {
      window.__S666_VELUNA_MESSENGER_STATUS_BRIDGE__ = true;
      window.addEventListener('s666:veluna-messenger-state', function (event) {
        var detail = event.detail || {};
        if (detail.phase !== 'sending' && detail.phase !== 'success' && detail.phase !== 'error') return;
        clearTimeout(velunaStatusResetTimer);
        var stateSequence = ++velunaButtonStateSequence;
        velunaButtonPhase = detail.phase;
        applyVelunaButtonPhase(document.getElementById('s666VelunaMessageButton'));
        if (detail.phase === 'success' || detail.phase === 'error') {
          velunaStatusResetTimer = setTimeout(function () {
            if (velunaButtonStateSequence !== stateSequence) return;
            velunaButtonPhase = 'idle';
            applyVelunaButtonPhase(document.getElementById('s666VelunaMessageButton'));
            velunaStatusResetTimer = 0;
          }, detail.phase === 'success' ? 5000 : 8000);
        }
      });
    }
    if (!document.querySelector('.tool-strip')) return;
    reconcileMountedControls();
    ensurePlayerAlertClient().catch(function (error) {
      if (isStaleLifecycleError(error) || lifecycleSuspended) return;
      dispatch('s666:veluna-messenger-state', { phase: 'error', error: error.message || String(error) });
    });
  }

  function initSharedVisualBridge() {
    setSharedColorState('transport', 'idle');
    syncSharedColorState();
    reconcileMountedControls();
    clearInterval(visualTimer);
    visualTimer = 0;
    if (lifecycleSuspended) return;
    startControlObserver();
    visualTimer = setInterval(function () {
      syncSharedColorState();
      reconcileMountedControls();
    }, 3500);
  }

  function initDiscordButtonStatusBridge() {
    if (window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__) return;
    window.__S666_DISCORD_BUTTON_STATUS_BRIDGE__ = true;
    window.addEventListener('s666:discord-state', function (event) {
      var detail = event.detail || {};
      var phase = detail.phase;
      if (phase === 'status') {
        if (activeRequestId) return;
        if (detail.ok !== false) return;
        phase = 'error';
      }
      if (phase !== 'sending' && phase !== 'success' && phase !== 'warning' && phase !== 'error') return;
      clearTimeout(statusResetTimer);
      var stateSequence = ++discordButtonStateSequence;
      discordButtonPhase = phase;
      applyDiscordButtonPhase(document.getElementById('discordBtn'));
      if (phase !== 'sending') {
        statusResetTimer = setTimeout(function () {
          if (discordButtonStateSequence !== stateSequence) return;
          discordButtonPhase = 'idle';
          applyDiscordButtonPhase(document.getElementById('discordBtn'));
          statusResetTimer = 0;
        }, phase === 'success' ? 5000 : 8000);
      }
    });
  }

  function resetTransientRuntimeState() {
    discordButtonStateSequence += 1;
    velunaButtonStateSequence += 1;
    discordButtonPhase = 'idle';
    velunaButtonPhase = 'idle';
    var discordButton = document.getElementById('discordBtn');
    applyDiscordButtonPhase(discordButton);
    var velunaButton = document.getElementById('s666VelunaMessageButton');
    applyVelunaButtonPhase(velunaButton);
    ['s666DiscordMessageSend', 's666DiscordNowPlayingSend', 's666VelunaMessengerSend'].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.disabled = false;
    });
    setDiscordOverlayStatus('Bereit', '');
    setVelunaMessengerStatus('Bereit', '');
  }

  function suspendRuntime() {
    lifecycleGeneration += 1;
    statusSequence += 1;
    messengerOpenSequence += 1;
    lifecycleSuspended = true;
    abortActiveFetches();
    cancelPendingScriptLoads();
    stopControlObserver();
    playerAlertClientLoad = null;
    messengerOverlayClientLoad = null;
    activeRequestId = 0;
    activeVelunaSendId = 0;
    activeDiscordOverlaySendId = 0;
    discordOverlaySendSequence += 1;
    clearTimeout(discordOverlayFocusTimer);
    clearTimeout(watcherTimer);
    clearTimeout(startupTimer);
    clearTimeout(statusResetTimer);
    clearTimeout(velunaStatusResetTimer);
    clearInterval(visualTimer);
    discordOverlayFocusTimer = 0;
    watcherTimer = 0;
    startupTimer = 0;
    statusResetTimer = 0;
    velunaStatusResetTimer = 0;
    visualTimer = 0;
    resetTransientRuntimeState();
  }

  function resumeRuntime() {
    if (!initialized || !lifecycleSuspended) return;
    lifecycleSuspended = false;
    resetTransientRuntimeState();
    syncSharedColorState();
    initSharedVisualBridge();
    scheduleWatcher(1200);
    var discordOverlay = document.getElementById('s666DiscordMessageOverlay');
    if (discordOverlay && !discordOverlay.classList.contains('s666-discord-gate--hidden')) scheduleDiscordOverlayFocus(0);
    if (!startupAutoPostDone) tryStartupAutoPost();
    checkStatus();
  }

  function initAll() {
    if (initialized) return;
    initialized = true;
    initDiscordButtonStatusBridge();
    bindDirectPlaybackAutopost();
    checkStatus();
    tryStartupAutoPost();
    scheduleWatcher(4000);
    initVelunaMessengerBridge();
    initSharedVisualBridge();
  }

  document.addEventListener('visibilitychange', function () {
    if (!lifecycleSuspended) scheduleWatcher(document.hidden ? 30000 : 1500);
  });
  window.addEventListener('pagehide', suspendRuntime);
  window.addEventListener('pageshow', function () { resumeRuntime(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });
  else setTimeout(initAll, 0);

  window.S666DiscordPlayerAddonV3 = {
    version: VERSION,
    auditRepair: true,
    velunaMessengerBridge: true,
    velunaDiscordNoAuth: true,
    sharedVisualBridge: false,
    sharedStatusBridge: true,
    startupNowPlayingAutopost: true,
    directLocalTransport: true,
    threePostingCategories: true,
    skippedIsNotSent: true,
    transportMode: transportMode,
    directStatus: function () { var settings = loadDirectSettings(); return { configuredTargets: directConfiguredCount(settings), autoReady: Boolean(directCategory(settings, settings.autoTarget).webhook), selectedTarget: settings.selectedTarget, autoTarget: settings.autoTarget }; },
    mountAll: function () { initVelunaMessengerBridge(); initSharedVisualBridge(); reconcileMountedControls(); return true; },
    manualPost: manualPost,
    messagePost: messagePost,
    postTrackIfChanged: postTrackIfChanged,
    readTrackFromDom: readTrackFromDom,
    checkStatus: checkStatus,
    deliverySummary: deliverySummary,
    setLed: function (mode, text) { dispatch('s666:discord-state', { phase: mode || 'idle', text: text || '' }); }
  };
})();
