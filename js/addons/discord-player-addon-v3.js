/*
############################################################
# 666SOUNDsDESIGn — Discord Player Frontend Add-on
# Created: 2026-05-07
# Modified: 2026-05-07
# Version: V3.1
# Purpose: LED + gated manual player-card post + track-change post trigger for both HTML players.
# Notes:
# - No webhook URL in frontend.
# - Calls Worker routes only.
# - Uses localStorage for browser-side dedupe; Worker also has RAM cooldown.
############################################################
*/
(function(){
  'use strict';
  const VERSION = 'V3.1-20260507-GATED';
  const DEFAULTS = {
    radioName: '666SOUNDsDESIGn WebRadio',
    domain: 'webradio.666soundsdesign-broadcaster.com',
    playerUrl: 'https://webradio.666soundsdesign-broadcaster.com',
    streamUrl: 'https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
    discordInfo: 'Discord: 666SOUNDsDESIGn Cyber Radio Community',
    embedInfo: 'Embed info: web radio stream via https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
    endpointManual: '/api/discord/manual',
    endpointNowPlaying: '/api/discord/nowplaying',
    endpointStatus: '/api/discord/status',
    trackPollMs: 15000,
    manualButtonText: 'DC PLAYER POST',
    accessTitle: 'DISCORD ACCESS',
    accessMessage: 'Enter access code to unlock the Discord player post.',
    accessPlaceholder: 'ACCESS CODE',
    accessSubmitText: 'UNLOCK + POST',
    accessCancelText: 'CANCEL',
    accessDeniedTitle: 'ACCESS DENIED',
    accessDeniedMessage: 'Wrong code. Discord control remains locked.',
    autoPostTrackChanges: false
  };
  const cfg = Object.assign({}, DEFAULTS, window.S666_DISCORD_PLAYER_CONFIG || {});
  const state = { led: null, text: null, button: null, gate: null, denied: null, input: null, lastTrackKey: localStorage.getItem('s666_discord_last_track_key_v3') || '' };

  function clean(v){ return String(v || '').replace(/\s+/g,' ').trim(); }
  function setLed(mode, label){
    if(!state.led || !state.text) return;
    state.led.className = 's666-discord-led s666-discord-led--' + (mode || 'idle');
    state.text.textContent = label || (mode === 'ok' ? 'Discord post OK' : mode === 'error' ? 'Discord error' : 'Discord ready');
  }
  function endpoint(path){
    if(/^https?:\/\//i.test(path)) return path;
    return path;
  }
  async function post(path, payload){
    setLed('sending', 'Discord sending…');
    const headers = { 'content-type': 'application/json' };
    if(cfg.adminToken) headers['x-admin-token'] = cfg.adminToken;
    if(payload && payload.__accessCode){ headers['x-discord-gate-code'] = String(payload.__accessCode); delete payload.__accessCode; }
    const res = await fetch(endpoint(path), { method:'POST', headers, body: JSON.stringify(payload || {}) });
    let data = null;
    try { data = await res.json(); } catch { data = { ok: res.ok }; }
    if(!res.ok || !data.ok){ throw new Error((data && data.error) || ('HTTP ' + res.status)); }
    setLed(data.skipped ? 'cooldown' : 'ok', data.skipped ? 'Discord skipped' : 'Discord post OK');
    setTimeout(() => setLed('idle','Discord ready'), 4500);
    return data;
  }
  function basePayload(){
    return {
      radioName: cfg.radioName,
      domain: cfg.domain,
      playerUrl: cfg.playerUrl,
      streamUrl: cfg.streamUrl,
      discordInfo: cfg.discordInfo,
      embedInfo: cfg.embedInfo,
      previewImage: cfg.previewImage
    };
  }
  function ensureGateOverlay(){
    let gate = document.getElementById('s666DiscordGateOverlay');
    if(gate){
      state.gate = gate;
      state.input = gate.querySelector('.s666-discord-gate-input');
      return gate;
    }
    gate = document.createElement('div');
    gate.id = 's666DiscordGateOverlay';
    gate.className = 's666-discord-gate s666-discord-gate--hidden';
    gate.setAttribute('role','dialog');
    gate.setAttribute('aria-modal','true');
    gate.setAttribute('aria-label', cfg.accessTitle);
    gate.innerHTML = '<div class="s666-discord-gate-box">'
      + '<button type="button" class="s666-discord-gate-x" aria-label="Close">×</button>'
      + '<div class="s666-discord-gate-title"></div>'
      + '<div class="s666-discord-gate-message"></div>'
      + '<input class="s666-discord-gate-input" type="password" autocomplete="off" spellcheck="false" inputmode="text">'
      + '<div class="s666-discord-gate-actions">'
      + '<button type="button" class="s666-discord-gate-cancel"></button>'
      + '<button type="button" class="s666-discord-gate-submit"></button>'
      + '</div></div>';
    gate.querySelector('.s666-discord-gate-title').textContent = cfg.accessTitle;
    gate.querySelector('.s666-discord-gate-message').textContent = cfg.accessMessage;
    gate.querySelector('.s666-discord-gate-input').placeholder = cfg.accessPlaceholder;
    gate.querySelector('.s666-discord-gate-cancel').textContent = cfg.accessCancelText;
    gate.querySelector('.s666-discord-gate-submit').textContent = cfg.accessSubmitText;
    const close = () => closeGateOverlay();
    gate.querySelector('.s666-discord-gate-x').addEventListener('click', close);
    gate.querySelector('.s666-discord-gate-cancel').addEventListener('click', close);
    gate.querySelector('.s666-discord-gate-submit').addEventListener('click', submitGateOverlay);
    gate.querySelector('.s666-discord-gate-input').addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter') submitGateOverlay();
      if(ev.key === 'Escape') closeGateOverlay();
    });
    gate.addEventListener('click', (ev) => { if(ev.target === gate) closeGateOverlay(); });
    document.body.appendChild(gate);
    state.gate = gate;
    state.input = gate.querySelector('.s666-discord-gate-input');
    return gate;
  }
  function openGateOverlay(){
    const gate = ensureGateOverlay();
    gate.classList.remove('s666-discord-gate--hidden');
    gate.classList.add('s666-discord-gate--open');
    setTimeout(() => { if(state.input){ state.input.value = ''; state.input.focus(); } }, 30);
  }
  function closeGateOverlay(){
    const gate = state.gate || document.getElementById('s666DiscordGateOverlay');
    if(!gate) return;
    gate.classList.add('s666-discord-gate--hidden');
    gate.classList.remove('s666-discord-gate--open');
  }
  function showAccessDenied(){
    closeGateOverlay();
    let denied = document.getElementById('s666DiscordDeniedOverlay');
    if(!denied){
      denied = document.createElement('div');
      denied.id = 's666DiscordDeniedOverlay';
      denied.className = 's666-discord-denied s666-discord-denied--hidden';
      denied.setAttribute('role','alertdialog');
      denied.setAttribute('aria-modal','true');
      denied.innerHTML = '<div class="s666-discord-denied-box"><div class="s666-discord-denied-title"></div><div class="s666-discord-denied-message"></div><button type="button" class="s666-discord-denied-close">OK</button></div>';
      denied.querySelector('.s666-discord-denied-title').textContent = cfg.accessDeniedTitle;
      denied.querySelector('.s666-discord-denied-message').textContent = cfg.accessDeniedMessage;
      denied.querySelector('.s666-discord-denied-close').addEventListener('click', () => denied.classList.add('s666-discord-denied--hidden'));
      denied.addEventListener('click', (ev) => { if(ev.target === denied) denied.classList.add('s666-discord-denied--hidden'); });
      document.body.appendChild(denied);
    }
    state.denied = denied;
    denied.classList.remove('s666-discord-denied--hidden');
    setTimeout(() => denied.classList.add('s666-discord-denied--hidden'), 2600);
  }
  async function gatedManualPost(accessCode){
    try { await post(cfg.endpointManual, Object.assign(basePayload(), { __accessCode: accessCode })); closeGateOverlay(); }
    catch(e){
      const msg = String(e && e.message || e || '');
      if(/access denied|invalid discord gate code|HTTP 401/i.test(msg)) { setLed('error', 'Access denied'); showAccessDenied(); }
      else { setLed('error', 'Discord error'); console.warn('[S666 Discord V3] manual failed:', e); }
    }
  }
  function submitGateOverlay(){
    const code = clean(state.input && state.input.value);
    if(!code){ showAccessDenied(); setLed('error', 'Access denied'); return; }
    gatedManualPost(code);
  }
  function manualPost(){ openGateOverlay(); }
  function readTrackFromDom(){
    const selectors = [
      '[data-now-playing]', '[data-track-title]', '#nowPlaying', '#now-playing', '.now-playing', '.track-title', '.song-title', '.metadata-title'
    ];
    for(const s of selectors){
      const el = document.querySelector(s);
      const txt = clean(el && (el.getAttribute('data-now-playing') || el.textContent));
      if(txt && !/^[-–—\s]*$/.test(txt)) return { nowPlaying: txt };
    }
    if(window.S666_NOW_PLAYING) return { nowPlaying: clean(window.S666_NOW_PLAYING) };
    if(window.radioMetadata && (window.radioMetadata.title || window.radioMetadata.nowPlaying)) return {
      artist: clean(window.radioMetadata.artist),
      title: clean(window.radioMetadata.title),
      nowPlaying: clean(window.radioMetadata.nowPlaying)
    };
    return null;
  }
  async function postTrackIfChanged(track){
    if(!cfg.autoPostTrackChanges || !track) return;
    const key = clean((track.artist || '') + '::' + (track.title || '') + '::' + (track.nowPlaying || '')).toLowerCase();
    if(!key || key === state.lastTrackKey) return;
    state.lastTrackKey = key;
    localStorage.setItem('s666_discord_last_track_key_v3', key);
    try { await post(cfg.endpointNowPlaying, Object.assign(basePayload(), track)); }
    catch(e){ setLed('error','Discord track error'); console.warn('[S666 Discord V3] nowplaying failed:', e); }
  }
  function startTrackWatcher(){
    postTrackIfChanged(readTrackFromDom());
    setInterval(() => postTrackIfChanged(readTrackFromDom()), Math.max(8000, Number(cfg.trackPollMs) || 15000));
  }
  function mount(container){
    const host = typeof container === 'string' ? document.querySelector(container) : container;
    const box = document.createElement('div');
    box.className = 's666-discord-panel';
    box.innerHTML = '<div class="s666-discord-status"><span class="s666-discord-led s666-discord-led--idle"></span><span class="s666-discord-text">Discord ready</span></div><button type="button" class="s666-discord-button"></button>';
    state.led = box.querySelector('.s666-discord-led');
    state.text = box.querySelector('.s666-discord-text');
    state.button = box.querySelector('.s666-discord-button');
    state.button.textContent = cfg.manualButtonText;
    state.button.addEventListener('click', manualPost);
    if(host) host.appendChild(box); else document.body.appendChild(box);
    setLed('idle','Discord ready');
  }
  window.S666DiscordPlayerAddonV3 = { version: VERSION, mount, manualPost, postTrackIfChanged, readTrackFromDom, setLed };
  document.addEventListener('DOMContentLoaded', () => {
    mount(cfg.mount || '[data-discord-addon-slot]');
    startTrackWatcher();
    // MOBILE_SAFE_REMOUNT: iPhone-Player baut #mffApp dynamisch; deshalb Slot später erneut prüfen, ohne doppelte Panels zu stapeln.
    [300, 900, 1800, 3600].forEach((delay) => setTimeout(() => {
      const existing = document.querySelector('.s666-discord-panel');
      const host = document.querySelector(cfg.mount || '[data-discord-addon-slot]');
      if(host && (!existing || !host.contains(existing))) {
        if(existing && existing.parentNode) existing.parentNode.removeChild(existing);
        mount(host);
      }
    }, delay));
  });
})();
