/* Shared broadcast message history overlay for PC + iPhone. */
(function () {
  'use strict';
  if (window.__S666_BROADCAST_HISTORY_V110__) return;
  window.__S666_BROADCAST_HISTORY_V110__ = true;

  var MAX_ITEMS = 20;
  var observer = null;
  var mountTimer = 0;
  function qs(selector, root) { return (root || document).querySelector(selector); }
  function clean(value) { return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function ownId() { return window.S666PlayerAlertClient ? window.S666PlayerAlertClient.senderId() : ''; }
  function timeLabel(value) {
    var date = value ? new Date(value) : null;
    if (!date || isNaN(date.getTime())) return '';
    try { return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return date.toISOString().slice(11, 16); }
  }
  function normalizeItems(data) {
    var raw = Array.isArray(data) ? data : data && (data.items || data.history) || [];
    return raw.map(function (item) {
      return {
        id: clean(item.id || item.timestamp || item.createdAt || ''),
        message: clean(item.message || item.text || item.body || ''),
        senderId: clean(item.senderId || item.clientId || ''),
        createdAt: item.createdAt || item.timestamp || ''
      };
    }).filter(function (item) { return !!item.message; }).slice(0, MAX_ITEMS);
  }
  function ensureOverlay() {
    var backdrop = qs('#smfpBroadcastHistoryBackdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'smfpBroadcastHistoryBackdrop';
    backdrop.className = 'smfp-msg-history-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = '<section class="smfp-msg-history-modal" role="dialog" aria-modal="true" aria-label="Broadcast Message History"><header class="smfp-msg-history-head"><div><div class="smfp-msg-history-title">BROADCAST MESSAGE HISTORY</div><div class="smfp-msg-history-sub">LAST 20 PLAYER MESSAGES</div></div><button type="button" class="smfp-msg-history-close" data-smfp-msg-history-close>×</button></header><div id="smfpBroadcastHistoryList" class="smfp-msg-history-list"><div class="smfp-msg-history-empty">Loading messages...</div></div></section>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop || event.target.hasAttribute('data-smfp-msg-history-close')) closeOverlay();
    }, true);
    return backdrop;
  }
  function renderList(items, source) {
    var box = qs('#smfpBroadcastHistoryList');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="smfp-msg-history-empty">No broadcast messages yet.</div>'; return; }
    var me = ownId();
    box.innerHTML = '';
    items.forEach(function (item) {
      var article = document.createElement('article');
      article.className = 'smfp-msg-history-item' + (me && item.senderId === me ? ' is-self' : '');
      var meta = document.createElement('div');
      meta.className = 'smfp-msg-history-meta';
      meta.innerHTML = '<span>' + (me && item.senderId === me ? 'YOU' : 'PLAYER') + '</span><span>' + (timeLabel(item.createdAt) || clean(source || 'HISTORY')) + '</span>';
      var message = document.createElement('div');
      message.className = 'smfp-msg-history-message';
      message.textContent = item.message;
      article.appendChild(meta);
      article.appendChild(message);
      box.appendChild(article);
    });
  }
  function loadHistory() {
    var box = qs('#smfpBroadcastHistoryList');
    if (box) box.innerHTML = '<div class="smfp-msg-history-empty">Loading messages...</div>';
    var client = window.S666PlayerAlertClient;
    var promise = client && typeof client.history === 'function'
      ? client.history()
      : fetch('/api/player-alert/history?t=' + Date.now(), { cache: 'no-store' }).then(function (response) { return response.json(); });
    return Promise.resolve(promise).then(function (data) {
      if (!data || data.ok === false) throw new Error(data && data.error || 'history_failed');
      renderList(normalizeItems(data), data.source || '');
    }).catch(function () {
      if (box) box.innerHTML = '<div class="smfp-msg-history-error">Message history unavailable.</div>';
    });
  }
  function openOverlay(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    var backdrop = ensureOverlay();
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    loadHistory();
  }
  function closeOverlay() {
    var backdrop = qs('#smfpBroadcastHistoryBackdrop');
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
  function makeButton(id) {
    var button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = 'smfp-msg-history-btn';
    button.textContent = 'LOG';
    button.title = 'Broadcast message history';
    button.setAttribute('aria-label', 'Open broadcast message history');
    button.addEventListener('click', openOverlay, true);
    return button;
  }
  function mountButton() {
    var mobile = window.innerWidth <= 760;
    var target = mobile
      ? qs('#s666StageMobileActions') || qs('#s666MobileExtraRow') || qs('#mffApp .mff-discord-slot')
      : qs('.player-shell .bottom-console .control-toolbar') || qs('#s666MessageActionSlot');
    if (!target) return false;
    var button = qs('#s666BroadcastHistoryButton');
    if (!button) button = makeButton('s666BroadcastHistoryButton');
    var messageButton = qs('#s666MessageControlButton', target);
    if (messageButton && messageButton.nextSibling !== button) messageButton.insertAdjacentElement('afterend', button);
    else if (button.parentNode !== target) target.appendChild(button);
    return true;
  }
  function scheduleMount() { clearTimeout(mountTimer); mountTimer = setTimeout(mountButton, 80); }
  function boot() {
    ensureOverlay();
    mountButton();
    [300, 1000, 2500, 5000].forEach(function (delay) { setTimeout(mountButton, delay); });
    if (!observer && typeof MutationObserver === 'function') {
      observer = new MutationObserver(scheduleMount);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('resize', scheduleMount, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.SMFPBroadcastHistory = { open: openOverlay, close: closeOverlay, reload: loadHistory, mount: mountButton };
})();
