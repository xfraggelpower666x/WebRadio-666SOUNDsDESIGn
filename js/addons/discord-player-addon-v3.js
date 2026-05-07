/*
############################################################
# 666SOUNDsDESIGn — Discord Player Frontend Add-on
# Created: 2026-05-07
# Modified: 2026-05-07
# Version: V3.4
# Purpose: Multi-slot LED + gated manual player-card post for PC and iPhone players.
# Change Summary:
# - Repairs PC/iPhone slot mounting: one panel per visible player slot, no moving panel between slots.
# - Adds global click/touch bridge so rebuilt/cloned Discord panels still open the access overlay.
# - Repairs mobile #mffApp body-hide rule conflict: gate/denied overlays stay visible above iPhone player.
# - Keeps gate overlay English-only.
# - Keeps webhook URL server-side only.
# - Uses safer status/error display without touching stream/audio/worker routes outside /api/discord/*.
############################################################
*/
(function(){
  'use strict';
  const VERSION = 'V3.4-20260507-MOBILE-OVERLAY-VISIBILITY-REPAIR';
  const DEFAULTS = {
    radioName: '666SOUNDsDESIGn WebRadio',
    domain: 'webradio.666soundsdesign-broadcaster.com',
    playerUrl: 'https://webradio.666soundsdesign-broadcaster.com',
    streamUrl: 'https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
    discordInfo: 'Discord: 666SOUNDsDESIGn Cyber Radio Community',
    embedInfo: 'Embed info: Web radio stream via https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
    previewImage: 'https://webradio.666soundsdesign-broadcaster.com/assets/icons/icon-512x512.png',
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
    autoPostTrackChanges: false,
    mount: '[data-discord-addon-slot]'
  };
  const cfg = Object.assign({}, DEFAULTS, window.S666_DISCORD_PLAYER_CONFIG || {});
  const state = {
    panels: [],
    gate: null,
    denied: null,
    input: null,
    lastTrackKey: localStorage.getItem('s666_discord_last_track_key_v3') || ''
  };


  function installMobileOverlayVisibilityPatch(){
    if(document.getElementById('s666DiscordOverlayVisibilityPatch')) return;
    const style = document.createElement('style');
    style.id = 's666DiscordOverlayVisibilityPatch';
    style.textContent = `
      body[data-smfp-active="1"] > #s666DiscordGateOverlay,
      body[data-smfp-active="1"] > #s666DiscordDeniedOverlay{
        visibility:visible!important;
        opacity:1!important;
        pointer-events:auto!important;
        width:auto!important;
        height:auto!important;
        min-width:0!important;
        min-height:0!important;
        max-width:none!important;
        max-height:none!important;
        margin:0!important;
        padding:18px!important;
        overflow:visible!important;
        background:radial-gradient(circle at 50% 30%,rgba(255,61,187,.16),rgba(3,5,18,.86) 48%,rgba(0,0,0,.94) 100%)!important;
        border:0!important;
        box-shadow:none!important;
        z-index:2147483600!important;
      }
      body[data-smfp-active="1"] > #s666DiscordGateOverlay.s666-discord-gate--hidden,
      body[data-smfp-active="1"] > #s666DiscordDeniedOverlay.s666-discord-denied--hidden{
        display:none!important;
        visibility:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      body[data-smfp-active="1"] > #s666DiscordGateOverlay:not(.s666-discord-gate--hidden),
      body[data-smfp-active="1"] > #s666DiscordDeniedOverlay:not(.s666-discord-denied--hidden){
        display:flex!important;
      }
      #mffApp .s666-discord-panel,
      #mffApp .s666-discord-panel *,
      #mffApp [data-discord-addon-slot]{
        pointer-events:auto!important;
        touch-action:manipulation!important;
      }
    `;
    document.head.appendChild(style);
  }

  function clean(v){ return String(v || '').replace(/\s+/g,' ').trim(); }
  function allPanels(){
    state.panels = Array.from(document.querySelectorAll('.s666-discord-panel'));
    return state.panels;
  }
  function setLed(mode, label){
    const panels = allPanels();
    panels.forEach((panel) => {
      const led = panel.querySelector('.s666-discord-led');
      const text = panel.querySelector('.s666-discord-text');
      if(led) led.className = 's666-discord-led s666-discord-led--' + (mode || 'idle');
      if(text) text.textContent = label || (mode === 'ok' ? 'Discord post OK' : mode === 'error' ? 'Discord error' : 'Discord ready');
    });
  }
  function endpoint(path){ return /^https?:\/\//i.test(path) ? path : path; }
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
  async function checkStatus(){
    try{
      const res = await fetch(endpoint(cfg.endpointStatus), { method:'GET', headers:{ 'accept':'application/json' }, cache:'no-store' });
      const data = await res.json().catch(() => null);
      if(res.ok && data && data.ok){
        setLed(data.webhookConfigured ? 'idle' : 'error', data.webhookConfigured ? 'Discord ready' : 'Discord webhook missing');
      }
    }catch(e){
      setLed('error','Discord route error');
      console.warn('[S666 Discord V3.2] status failed:', e);
    }
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
      else { setLed('error', 'Discord error'); console.warn('[S666 Discord V3.2] manual failed:', e); }
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
    catch(e){ setLed('error','Discord track error'); console.warn('[S666 Discord V3.2] nowplaying failed:', e); }
  }
  function startTrackWatcher(){
    postTrackIfChanged(readTrackFromDom());
    setInterval(() => postTrackIfChanged(readTrackFromDom()), Math.max(8000, Number(cfg.trackPollMs) || 15000));
  }
  function createPanel(host){
    if(!host || host.querySelector('.s666-discord-panel')) return;
    const box = document.createElement('div');
    box.className = 's666-discord-panel';
    box.setAttribute('data-s666-discord-version', VERSION);
    box.setAttribute('data-s666-discord-trigger', '1');
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.setAttribute('aria-label', 'Open Discord access gate');
    box.innerHTML = '<div class="s666-discord-status"><span class="s666-discord-led s666-discord-led--idle"></span><span class="s666-discord-text">Discord ready</span></div><button type="button" class="s666-discord-button" data-s666-discord-trigger="1"></button>';
    const btn = box.querySelector('.s666-discord-button');
    btn.textContent = cfg.manualButtonText;
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); manualPost(); });
    box.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); manualPost(); }
    });
    host.appendChild(box);
  }
  function installClickBridge(){
    if(window.__S666DiscordClickBridgeInstalled) return;
    window.__S666DiscordClickBridgeInstalled = true;
    const handle = (ev) => {
      const target = ev.target && ev.target.closest ? ev.target.closest('.s666-discord-button,[data-s666-discord-trigger="1"]') : null;
      if(!target) return;
      if(target.closest && target.closest('#s666DiscordGateOverlay,#s666DiscordDeniedOverlay')) return;
      ev.preventDefault();
      ev.stopPropagation();
      manualPost();
    };
    document.addEventListener('click', handle, true);
    document.addEventListener('touchend', handle, { capture:true, passive:false });
  }
  function mountAll(){
    const hosts = Array.from(document.querySelectorAll(cfg.mount || '[data-discord-addon-slot]'));
    if(!hosts.length){
      if(!document.body.querySelector('.s666-discord-panel')) createPanel(document.body);
    } else {
      hosts.forEach(createPanel);
    }
    allPanels();
    setLed('idle','Discord ready');
  }
  window.S666DiscordPlayerAddonV3 = { version: VERSION, mountAll, manualPost, postTrackIfChanged, readTrackFromDom, setLed, checkStatus };
  installClickBridge();
  installMobileOverlayVisibilityPatch();
  document.addEventListener('DOMContentLoaded', () => {
    installClickBridge();
    installMobileOverlayVisibilityPatch();
    mountAll();
    checkStatus();
    startTrackWatcher();
    // MOBILE_SAFE_REMOUNT: iPhone player creates #mffApp dynamically; scan all slots without moving panels between PC/mobile.
    [150, 300, 900, 1800, 3600, 7000, 12000, 20000].forEach((delay) => setTimeout(() => { mountAll(); checkStatus(); }, delay));
  });
})();
