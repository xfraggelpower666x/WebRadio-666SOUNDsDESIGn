(() => {
  'use strict';

  const API = {
    metadata: '/api/nowplaying',
    discordStatus: '/api/discord/status',
    discordManual: '/api/discord/message',
    discordNowPlaying: '/api/discord/nowplaying'
  };

  const STREAMS = [
    'https://my.idjstream.com/666soundsdesign/stream',
    'https://my.idjstream.com:8686/stream',
    'https://my.idjstream.com/8686/stream'
  ];

  const PLAYER_URL = 'https://webradio.666soundsdesign-broadcaster.com/';
  const STREAM_URL = 'https://webradio.666soundsdesign-broadcaster.com/stream';

  const $ = (id) => document.getElementById(id);
  const streamState = $('streamState');
  const streamLed = $('streamLed');
  const discordLed = $('discordLed');
  const lastUpdate = $('lastUpdate');
  const bitrateValue = $('bitrateValue');
  const listenersValue = $('listenersValue');
  const nowPlaying = $('nowPlaying');
  const artistDj = $('artistDj');
  const signalPercent = $('signalPercent');
  const debugOutput = $('debugOutput');
  const discordResult = $('discordResult');

  let lastMetadata = {};

  function setLed(el, mode) {
    if (!el) return;
    el.className = 'led ' + (mode || 'wait');
  }

  function text(value, fallback = '—') {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  }

  function pick(obj, keys, fallback = '') {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
    }
    return fallback;
  }

  function normalizeMetadata(data) {
    const artist = pick(data, ['artist', 'servertitle', 'current_artist'], '');
    const title = pick(data, ['title', 'track', 'songtitle', 'current_song'], '');
    const song = pick(data, ['nowplaying', 'nowPlaying', 'song', 'songtitle'], '');
    const history = pick(data, ['history'], []);
    const listeners = pick(data, ['listeners', 'currentlisteners', 'listener_count'], 'unbekannt');
    const max = pick(data, ['maxlisteners', 'peaklisteners', 'peak'], '');
    const bitrate = pick(data, ['bitrate', 'kbps', 'stream_bitrate'], 'unbekannt');
    const dj = pick(data, ['djusername', 'djstatus', 'client', 'streamer', 'dj'], '666 DJ');
    const np = song || [artist, title].filter(Boolean).join(' – ') || 'Live transmission';
    return { artist, title, nowPlaying: np, listeners, max, bitrate, dj, history };
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, { cache: 'no-store', ...options });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('json') ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
    return body;
  }

  async function updateMetadata() {
    try {
      const data = await fetchJson(API.metadata);
      lastMetadata = normalizeMetadata(data);
      streamState.textContent = 'ONLINE';
      setLed(streamLed, 'ok');
      nowPlaying.textContent = lastMetadata.nowPlaying;
      artistDj.textContent = 'DJ / Artist: ' + text(lastMetadata.dj);
      listenersValue.textContent = 'Listeners: ' + text(lastMetadata.listeners) + (lastMetadata.max ? ' / ' + lastMetadata.max : '');
      bitrateValue.textContent = 'Bitrate: ' + text(lastMetadata.bitrate) + (String(lastMetadata.bitrate).toLowerCase().includes('kbps') ? '' : ' kbps');
      signalPercent.textContent = '88';
      lastUpdate.textContent = 'Last update: ' + new Date().toLocaleTimeString('de-DE');
    } catch (err) {
      streamState.textContent = 'METADATA FEHLT';
      setLed(streamLed, 'bad');
      nowPlaying.textContent = lastMetadata.nowPlaying || 'Metadata nicht erreichbar';
      artistDj.textContent = 'Fehler: ' + String(err.message || err).slice(0, 120);
      signalPercent.textContent = '33';
      lastUpdate.textContent = 'Last update failed: ' + new Date().toLocaleTimeString('de-DE');
    }
  }

  async function updateDiscordStatus() {
    try {
      const data = await fetchJson(API.discordStatus);
      setLed(discordLed, data.webhookConfigured ? 'ok' : 'wait');
      discordResult.textContent = 'Discord status:\n' + JSON.stringify(data, null, 2);
      return data;
    } catch (err) {
      setLed(discordLed, 'bad');
      discordResult.textContent = 'Discord status error:\n' + String(err.message || err);
    }
  }

  function gateHeaders() {
    const gate = $('gateCode')?.value?.trim();
    const headers = { 'content-type': 'application/json' };
    if (gate) headers['x-discord-gate-code'] = gate;
    return headers;
  }

  async function sendDiscordMessage() {
    const message = $('discordMessage')?.value?.trim();
    if (!message) return;
    try {
      const data = await fetchJson(API.discordManual, {
        method: 'POST',
        headers: gateHeaders(),
        body: JSON.stringify({
          message,
          text: message,
          content: message,
          playerUrl: PLAYER_URL,
          streamUrl: STREAM_URL,
          radioName: '666SOUNDsDESIGn WebRadio',
          nowPlaying: lastMetadata.nowPlaying || 'Live transmission',
          dj: lastMetadata.dj || '666 DJ',
          listeners: lastMetadata.listeners || 'unbekannt',
          bitrate: lastMetadata.bitrate || 'unbekannt'
        })
      });
      setLed(discordLed, 'ok');
      discordResult.textContent = 'Discord send OK:\n' + JSON.stringify(data, null, 2);
    } catch (err) {
      setLed(discordLed, 'bad');
      discordResult.textContent = 'Discord send failed:\n' + String(err.message || err);
    }
  }

  async function sendNowPlaying() {
    try {
      const payload = {
        nowPlaying: lastMetadata.nowPlaying || 'Live transmission',
        title: lastMetadata.title || lastMetadata.nowPlaying || 'Live transmission',
        artist: lastMetadata.artist || '',
        dj: lastMetadata.dj || '666 DJ',
        listeners: lastMetadata.listeners || 'unbekannt',
        bitrate: lastMetadata.bitrate || 'unbekannt',
        playerUrl: PLAYER_URL,
        streamUrl: STREAM_URL,
        radioName: '666SOUNDsDESIGn WebRadio'
      };
      const data = await fetchJson(API.discordNowPlaying, {
        method: 'POST',
        headers: gateHeaders(),
        body: JSON.stringify(payload)
      });
      setLed(discordLed, 'ok');
      discordResult.textContent = 'Now Playing post OK:\n' + JSON.stringify(data, null, 2);
    } catch (err) {
      setLed(discordLed, 'bad');
      discordResult.textContent = 'Now Playing post failed:\n' + String(err.message || err);
    }
  }

  function initButtons() {
    $('refreshBtn')?.addEventListener('click', updateMetadata);
    $('debugBtn')?.addEventListener('click', async () => {
      const out = {};
      try { out.metadata = await fetchJson(API.metadata); } catch (err) { out.metadataError = String(err.message || err); }
      try { out.discord = await fetchJson(API.discordStatus); } catch (err) { out.discordError = String(err.message || err); }
      debugOutput.textContent = JSON.stringify(out, null, 2);
    });
    $('sendDiscordBtn')?.addEventListener('click', sendDiscordMessage);
    $('sendNowPlayingBtn')?.addEventListener('click', sendNowPlaying);
    document.querySelectorAll('.preset').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-stream');
        try { await navigator.clipboard.writeText(value); button.textContent = 'Kopiert · ' + value; }
        catch { button.textContent = value; }
      });
    });
    document.querySelectorAll('[data-scroll]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-scroll]').forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        const target = document.getElementById(button.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  initButtons();
  updateMetadata();
  updateDiscordStatus();
  setInterval(updateMetadata, 15000);
  setInterval(updateDiscordStatus, 60000);
})();
