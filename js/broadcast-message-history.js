/*
FILE: js/broadcast-message-history.js
CREATED: 2026-05-22
PURPOSE: Shared broadcast message history overlay for PC + iPhone players.
RULES: Does not modify SEND route, worker route, Discord route, audio, or meter engine.
*/
(function(){
  'use strict';
  if(window.__smfpBroadcastMessageHistoryV189) return;
  window.__smfpBroadcastMessageHistoryV189 = true;

  var HISTORY_URL = '/api/player-alert/history';
  var SENDER_KEY = 'smfpPlayerAlertSenderId';
  var MAX_ITEMS = 20;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function ownId(){ try { return localStorage.getItem(SENDER_KEY) || ''; } catch(e){ return ''; } }
  function cleanText(v){ return String(v == null ? '' : v).replace(/[<>]/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim(); }
  function timeLabel(v){
    var d = v ? new Date(v) : null;
    if(!d || isNaN(d.getTime())) return '';
    try { return d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); } catch(e){ return d.toISOString().slice(11,16); }
  }
  function normalizeItems(data){
    var raw = [];
    if(Array.isArray(data)) raw = data;
    else if(data && Array.isArray(data.items)) raw = data.items;
    else if(data && Array.isArray(data.history)) raw = data.history;
    else if(data && data.message) raw = [data];
    return raw.map(function(x){
      return {
        id: cleanText(x.id || x.messageId || x.timestamp || x.createdAt || ''),
        message: cleanText(x.message || x.text || x.body || ''),
        senderId: cleanText(x.senderId || x.clientId || x.sender || ''),
        createdAt: cleanText(x.createdAt || x.timestamp || x.time || '')
      };
    }).filter(function(x){ return !!x.message; }).slice(0, MAX_ITEMS);
  }
  function ensureOverlay(){
    var back = qs('#smfpBroadcastHistoryBackdrop');
    if(back) return back;
    back = document.createElement('div');
    back.id = 'smfpBroadcastHistoryBackdrop';
    back.className = 'smfp-msg-history-backdrop';
    back.setAttribute('aria-hidden','true');
    back.innerHTML = '<section class="smfp-msg-history-modal" role="dialog" aria-modal="true" aria-label="Broadcast Message History">' +
      '<header class="smfp-msg-history-head"><div><div class="smfp-msg-history-title">BROADCAST MESSAGE HISTORY</div><div class="smfp-msg-history-sub">LAST 20 PLAYER MESSAGES</div></div><button type="button" class="smfp-msg-history-close" data-smfp-msg-history-close>×</button></header>' +
      '<div id="smfpBroadcastHistoryList" class="smfp-msg-history-list"><div class="smfp-msg-history-empty">Loading messages...</div></div>' +
      '</section>';
    document.body.appendChild(back);
    back.addEventListener('click', function(ev){
      if(ev.target === back || (ev.target && ev.target.hasAttribute('data-smfp-msg-history-close'))) closeOverlay();
    }, true);
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') closeOverlay(); }, {passive:true});
    return back;
  }
  function renderList(items, source){
    var box = qs('#smfpBroadcastHistoryList');
    if(!box) return;
    if(!items.length){ box.innerHTML = '<div class="smfp-msg-history-empty">No broadcast messages yet.</div>'; return; }
    var me = ownId();
    box.innerHTML = items.map(function(item){
      var self = me && item.senderId && item.senderId === me;
      var metaLeft = self ? 'YOU' : 'PLAYER';
      var metaRight = timeLabel(item.createdAt) || (source || 'HISTORY');
      return '<article class="smfp-msg-history-item '+(self?'is-self':'')+'">' +
        '<div class="smfp-msg-history-meta"><span>'+metaLeft+'</span><span>'+metaRight+'</span></div>' +
        '<div class="smfp-msg-history-message"></div>' +
        '</article>';
    }).join('');
    var msgEls = qsa('.smfp-msg-history-message', box);
    items.forEach(function(item, i){ if(msgEls[i]) msgEls[i].textContent = item.message; });
  }
  async function loadHistory(){
    var box = qs('#smfpBroadcastHistoryList');
    if(box) box.innerHTML = '<div class="smfp-msg-history-empty">Loading messages...</div>';
    try{
      var res = await fetch(HISTORY_URL + '?limit=20&ts=' + Date.now(), {cache:'no-store'});
      var data = {}; try { data = await res.json(); } catch(e) {}
      if(!res.ok || data.ok === false) throw new Error((data && (data.error || data.message)) || ('HTTP '+res.status));
      renderList(normalizeItems(data), cleanText(data.source || ''));
    }catch(err){
      if(box) box.innerHTML = '<div class="smfp-msg-history-error">Message history unavailable.</div>';
      console.warn('broadcast message history failed', err);
    }
  }
  function openOverlay(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    var back = ensureOverlay();
    back.classList.add('is-open');
    back.setAttribute('aria-hidden','false');
    loadHistory();
  }
  function closeOverlay(){
    var back = qs('#smfpBroadcastHistoryBackdrop');
    if(!back) return;
    back.classList.remove('is-open');
    back.setAttribute('aria-hidden','true');
  }
  function makeButton(id){
    var btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = 'smfp-msg-history-btn';
    btn.textContent = 'LOG';
    btn.title = 'Broadcast message history';
    btn.setAttribute('aria-label','Open broadcast message history');
    btn.addEventListener('click', openOverlay, true);
    return btn;
  }
  function installPcButton(){
    var box = qs('#playerAlertPcBox');
    if(!box || qs('#playerAlertHistoryPcBtn')) return;
    var send = qs('#playerAlertPcSend', box);
    var btn = makeButton('playerAlertHistoryPcBtn');
    if(send && send.parentNode === box) send.insertAdjacentElement('afterend', btn);
    else box.appendChild(btn);
  }
  function installMobileButton(){
    var app = qs('#mffApp');
    if(!app || qs('#playerAlertHistoryMobileBtn', app)) return;
    var slot = qs('.mff-discord-slot', app) || qs('.mff-actions', app) || qs('.mff-toolbar', app);
    if(!slot) return;
    var send = qs('#mffAlertOpen', slot) || qs('.mff-alert-open', slot);
    var btn = makeButton('playerAlertHistoryMobileBtn');
    if(send && send.parentNode === slot) send.insertAdjacentElement('afterend', btn);
    else slot.appendChild(btn);
  }
  function installEditorButton(){
    var back = qs('#mffAlertEditorBackdrop');
    if(!back || qs('#mffAlertHistoryInEditor', back)) return;
    var actions = qs('.mff-alert-editor-actions', back);
    if(!actions) return;
    var btn = makeButton('mffAlertHistoryInEditor');
    btn.textContent = 'HISTORY';
    actions.insertBefore(btn, actions.firstChild);
  }
  function boot(){
    ensureOverlay();
    installPcButton();
    installMobileButton();
    installEditorButton();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot, {passive:true});
  setTimeout(boot, 250); setTimeout(boot, 1000); setInterval(boot, 2500);
  window.SMFPBroadcastHistory = {open:openOverlay, close:closeOverlay, reload:loadHistory};
})();
