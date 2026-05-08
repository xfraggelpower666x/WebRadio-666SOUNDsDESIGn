/*
############################################################
# 666SOUNDsDESIGn — Discord Player Frontend Add-on
# Created: 2026-05-07
# Modified: 2026-05-07
# Version: V3.8
# Purpose: Compact DC/MSG gate with structured Discord broadcast embed posts, metadata, artwork, branding and socials.
# Change Summary:
# - Repairs PC/iPhone slot mounting: one panel per visible player slot, no moving panel between slots.
# - Adds global click/touch bridge so rebuilt/cloned Discord panels still open the access overlay.
# - Repairs mobile #mffApp body-hide rule conflict and pairs with index.html whitelist.
# - Keeps gate overlay English-only.
# - Keeps webhook URL server-side only.
# - Uses safer status/error display without touching stream/audio/worker routes outside /api/discord/*.
# - Adds compact DC player-post button and MSG custom-message overlay.
# - Enriches Discord posts with current title/listeners/bitrate/DJ metadata.
# - Auto now-playing posts only after successful gate unlock in this browser session.
# - V3.7 upgrades the Discord payload data for structured underground broadcast cards.
# - V3.8 keeps the big broadcast post manual and arms automatic compact Now Playing posts after valid unlock; improves artwork/metadata extraction and dedupe status.
############################################################
*/
(function(){
  'use strict';
  const VERSION = 'V3.8-20260508-MANUAL-BROADCAST-AUTO-NOWPLAYING';
  const DEFAULTS = {
    radioName: '666SOUNDsDESIGn WebRadio',
    domain: 'webradio.666soundsdesign-broadcaster.com',
    playerUrl: 'https://webradio.666soundsdesign-broadcaster.com',
    streamUrl: 'https://webradio.666soundsdesign-broadcaster.com/stream',
    discordInfo: 'Discord: 666SOUNDsDESIGn Cyber Radio Community',
    embedInfo: 'Embed info: Web radio stream via https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
    previewImage: 'https://webradio.666soundsdesign-broadcaster.com/assets/icons/icon-512x512.png',
    backupStreamUrl: 'https://my.idjstream.com/666soundsdesign/stream',
    soundcloudUrl: 'https://soundcloud.com/fraggelpower666',
    mixcloudUrl: 'https://www.mixcloud.com/Fraggelpower666/',
    youtubeUrl: 'https://music.youtube.com/@fraggelpower666',
    facebookUrl: 'https://www.facebook.com/PsyTranceFraggeL2k',
    instagramUrl: 'https://www.instagram.com/fraggelpower/',
    tiktokUrl: 'https://www.tiktok.com/@fraggelpower666',
    discordProfileUrl: 'https://discord.com/users/1332026823168757776',
    distrokidUrl1: 'https://distrokid.com/hyperfollow/fraggelpower666/dark-techno-hyper-psy-trance-full-on',
    distrokidUrl2: 'https://distrokid.com/hyperfollow/fraggelpower666/the-dark-dancer-volume-i',
    distrokidUrl3: 'https://distrokid.com/hyperfollow/fraggelpower666/the-dark-dancer-volume-ii',
    endpointManual: '/api/discord/manual',
    endpointNowPlaying: '/api/discord/nowplaying',
    endpointMessage: '/api/discord/message',
    endpointStatus: '/api/discord/status',
    trackPollMs: 12000,
    manualButtonText: 'DC',
    messageButtonText: 'MSG',
    accessTitle: 'DISCORD ACCESS',
    accessMessage: 'Enter access code to unlock the Discord player post.',
    accessPlaceholder: 'ACCESS CODE',
    accessSubmitText: 'UNLOCK + POST',
    messageTitle: 'DISCORD MESSAGE',
    messageText: 'Enter access code and message text for the Discord channel.',
    messagePlaceholder: 'MESSAGE TEXT',
    messageSubmitText: 'UNLOCK + SEND',
    accessCancelText: 'CANCEL',
    accessDeniedTitle: 'ACCESS DENIED',
    accessDeniedMessage: 'Wrong code. Discord control remains locked.',
    autoPostTrackChanges: true,
    autoPostRequiresUnlock: true,
    mount: '[data-discord-addon-slot]'
  };
  const cfg = Object.assign({}, DEFAULTS, window.S666_DISCORD_PLAYER_CONFIG || {});
  const state = {
    panels: [],
    gate: null,
    denied: null,
    input: null,
    lastTrackKey: localStorage.getItem('s666_discord_last_track_key_v3') || '',
    accessCode: sessionStorage.getItem('s666_discord_gate_code_v3') || '',
    activeMode: 'manual',
    msg: null
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
  function readText(selector){
    const el = document.querySelector(selector);
    return clean(el && (el.getAttribute('data-now-playing') || el.getAttribute('data-track-title') || el.textContent));
  }
  async function fetchMetadataSnapshot(){
    try{
      const res = await fetch('/api/nowplaying?t=' + Date.now(), { cache:'no-store', headers:{ 'accept':'application/json' } });
      if(!res.ok) return null;
      return await res.json();
    }catch(_){ return null; }
  }
  function normalizeMetadata(raw){
    raw = raw || {};
    const song = raw.song || raw.now_playing || raw.nowPlaying || raw.current || {};
    const title = clean(raw.title || raw.songtitle || raw.current_title || raw.currentSong || raw.track || song.title || song.text || song.songtitle || readText('#nowPlayingTicker') || readText('#metaLine') || readText('#mffApp .mff-title h1') || readText('[data-now-playing]'));
    const artist = clean(raw.artist || raw.artist_name || song.artist || readText('#mffApp .mff-title h2'));
    const listeners = clean(raw.listeners || raw.currentlisteners || raw.currentListeners || raw.listener_count || raw.current_listeners || raw.listeners_current || (raw.stats && raw.stats.listeners) || readText('#listenersText') || readText('#mffApp .mff-card:nth-of-type(1) .mff-card-value') || readText('#mffApp .mff-cards .mff-card:nth-child(1)'));
    const bitrate = clean(raw.bitrate || raw.kbps || raw.stream_bitrate || raw.streamBitrate || (raw.stats && raw.stats.bitrate) || readText('#bitrateText') || readText('#mffApp .mff-cards .mff-card:nth-child(2)'));
    const dj = clean(raw.dj || raw.djusername || raw.djstatus || raw.streamer || raw.client || readText('#djText') || readText('#mffApp .mff-cards .mff-card:nth-child(3)') || 'DJ-666');
    const source = clean(raw.source || raw.stream || raw.activeSource || readText('#mainBtn.is-active') || readText('#fallbackBtn.is-active') || 'Mainstream / Auto Switch');
    const station = raw.station || {};
    const np = raw.now_playing || raw.nowPlaying || {};
    const npSong = np.song || {};
    const artwork = clean(
      raw.artwork || raw.cover || raw.coverArt || raw.image || raw.icon || raw.logo || raw.album_art || raw.albumArt || raw.cover_url || raw.art ||
      station.icon || station.logo || station.image || station.artwork ||
      song.art || song.image || song.cover || npSong.art || npSong.image || npSong.cover || ''
    );
    const nowPlaying = clean(raw.nowPlaying || raw.now_playing_text || raw.songtitle || title || 'Live Stream');
    return { title, artist, nowPlaying, listeners, bitrate, dj, source, artwork };
  }
  async function currentMetadataPayload(){
    const live = normalizeMetadata(await fetchMetadataSnapshot());
    const dom = normalizeMetadata({});
    return {
      title: live.title || dom.title,
      artist: live.artist || dom.artist,
      nowPlaying: live.nowPlaying || dom.nowPlaying,
      listeners: live.listeners || dom.listeners,
      bitrate: live.bitrate || dom.bitrate,
      dj: live.dj || dom.dj,
      source: live.source || dom.source,
      artwork: live.artwork || dom.artwork
    };
  }
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
      console.warn('[S666 Discord V3.7] status failed:', e);
    }
  }
  async function basePayload(){
    const meta = await currentMetadataPayload();
    return {
      radioName: cfg.radioName,
      domain: cfg.domain,
      playerUrl: cfg.playerUrl,
      streamUrl: cfg.streamUrl,
      discordInfo: cfg.discordInfo,
      embedInfo: cfg.embedInfo,
      previewImage: cfg.previewImage,
      artwork: meta.artwork,
      backupStreamUrl: cfg.backupStreamUrl,
      soundcloudUrl: cfg.soundcloudUrl,
      mixcloudUrl: cfg.mixcloudUrl,
      youtubeUrl: cfg.youtubeUrl,
      facebookUrl: cfg.facebookUrl,
      instagramUrl: cfg.instagramUrl,
      tiktokUrl: cfg.tiktokUrl,
      discordProfileUrl: cfg.discordProfileUrl,
      distrokidUrl1: cfg.distrokidUrl1,
      distrokidUrl2: cfg.distrokidUrl2,
      distrokidUrl3: cfg.distrokidUrl3,
      title: meta.title,
      artist: meta.artist,
      nowPlaying: meta.nowPlaying,
      listeners: meta.listeners,
      bitrate: meta.bitrate,
      dj: meta.dj,
      source: meta.source
    };
  }
  function ensureGateOverlay(){
    let gate = document.getElementById('s666DiscordGateOverlay');
    if(gate){
      state.gate = gate;
      state.input = gate.querySelector('.s666-discord-gate-input');
      state.msg = gate.querySelector('.s666-discord-msg-input');
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
      + '<textarea class="s666-discord-msg-input" rows="5" spellcheck="true"></textarea>'
      + '<div class="s666-discord-gate-actions">'
      + '<button type="button" class="s666-discord-gate-cancel"></button>'
      + '<button type="button" class="s666-discord-gate-submit"></button>'
      + '</div></div>';
    gate.querySelector('.s666-discord-gate-title').textContent = cfg.accessTitle;
    gate.querySelector('.s666-discord-gate-message').textContent = cfg.accessMessage;
    gate.querySelector('.s666-discord-gate-input').placeholder = cfg.accessPlaceholder;
    gate.querySelector('.s666-discord-gate-cancel').textContent = cfg.accessCancelText;
    gate.querySelector('.s666-discord-gate-submit').textContent = cfg.accessSubmitText;
    gate.querySelector('.s666-discord-msg-input').placeholder = cfg.messagePlaceholder;
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
    state.msg = gate.querySelector('.s666-discord-msg-input');
    return gate;
  }
  function openGateOverlay(mode){
    state.activeMode = mode === 'message' ? 'message' : 'manual';
    const gate = ensureGateOverlay();
    const title = gate.querySelector('.s666-discord-gate-title');
    const msg = gate.querySelector('.s666-discord-gate-message');
    const submit = gate.querySelector('.s666-discord-gate-submit');
    if(title) title.textContent = state.activeMode === 'message' ? cfg.messageTitle : cfg.accessTitle;
    if(msg) msg.textContent = state.activeMode === 'message' ? cfg.messageText : cfg.accessMessage;
    if(submit) submit.textContent = state.activeMode === 'message' ? cfg.messageSubmitText : cfg.accessSubmitText;
    gate.classList.toggle('s666-discord-gate--message', state.activeMode === 'message');
    gate.classList.remove('s666-discord-gate--hidden');
    gate.classList.add('s666-discord-gate--open');
    setTimeout(() => {
      if(state.input){ state.input.value = ''; state.input.focus(); }
      if(state.msg && state.activeMode === 'message') state.msg.value = '';
    }, 30);
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
  async function gatedPost(accessCode){
    try {
      const payload = await basePayload();
      payload.__accessCode = accessCode;
      if(state.activeMode === 'message'){
        const customMessage = clean(state.msg && state.msg.value, '', 1800);
        if(!customMessage){ setLed('error', 'Message missing'); return; }
        payload.message = customMessage;
        await post(cfg.endpointMessage, payload);
      } else {
        await post(cfg.endpointManual, payload);
      }
      state.accessCode = accessCode;
      try { sessionStorage.setItem('s666_discord_gate_code_v3', accessCode); } catch(_){}
      setLed('ok', 'Discord auto armed');
      // AUTO_NOWPLAYING_ARM: The large broadcast post remains manual, but a valid unlock arms compact song-change posts in this browser session.
      setTimeout(async () => {
        try { await postTrackIfChanged(await readTrackFromDom()); }
        catch(_){}
      }, 1200);
      closeGateOverlay();
    }
    catch(e){
      const msg = String(e && e.message || e || '');
      if(/access denied|invalid discord gate code|HTTP 401/i.test(msg)) { setLed('error', 'Access denied'); showAccessDenied(); }
      else { setLed('error', 'Discord error'); console.warn('[S666 Discord V3.7] gated post failed:', e); }
    }
  }
  function submitGateOverlay(){
    const code = clean(state.input && state.input.value);
    if(!code){ showAccessDenied(); setLed('error', 'Access denied'); return; }
    gatedPost(code);
  }
  function manualPost(){ openGateOverlay('manual'); }
  function messagePost(){ openGateOverlay('message'); }
  async function readTrackFromDom(){
    const meta = await currentMetadataPayload();
    if(meta && (meta.title || meta.nowPlaying || meta.artist)) return meta;
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
    if(cfg.autoPostRequiresUnlock !== false && !state.accessCode) return;
    const key = clean((track.artist || '') + '::' + (track.title || '') + '::' + (track.nowPlaying || '')).toLowerCase();
    if(!key || key === state.lastTrackKey) return;
    state.lastTrackKey = key;
    localStorage.setItem('s666_discord_last_track_key_v3', key);
    try {
      const payload = Object.assign(await basePayload(), track, { __accessCode: state.accessCode, autoPost: true });
      await post(cfg.endpointNowPlaying, payload);
    }
    catch(e){ setLed('error','Discord track error'); console.warn('[S666 Discord V3.8] nowplaying failed:', e); }
  }
  async function startTrackWatcher(){
    postTrackIfChanged(await readTrackFromDom());
    setInterval(async () => postTrackIfChanged(await readTrackFromDom()), Math.max(8000, Number(cfg.trackPollMs) || 15000));
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
    box.innerHTML = '<div class="s666-discord-status"><span class="s666-discord-led s666-discord-led--idle"></span><span class="s666-discord-text">Discord ready</span></div><div class="s666-discord-actions"><button type="button" class="s666-discord-button s666-discord-button--dc" data-s666-discord-action="manual"></button><button type="button" class="s666-discord-button s666-discord-button--msg" data-s666-discord-action="message"></button></div>';
    const btn = box.querySelector('.s666-discord-button--dc');
    const msgBtn = box.querySelector('.s666-discord-button--msg');
    btn.textContent = cfg.manualButtonText;
    msgBtn.textContent = cfg.messageButtonText;
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); manualPost(); });
    msgBtn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); messagePost(); });
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
      const action = target.getAttribute('data-s666-discord-action');
      if(action === 'message') messagePost(); else manualPost();
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
  window.S666DiscordPlayerAddonV3 = { version: VERSION, mountAll, manualPost, messagePost, postTrackIfChanged, readTrackFromDom, setLed, checkStatus };
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
