'use strict';
(() => {
  if (new URLSearchParams(location.search).get('output') === '1') return;
  const el = id => document.getElementById(id);
  const audio = el('audio-element');
  const select = el('vj-selection');
  const status = el('vj-status');
  const listeners = new Set();
  const initialLayout = Number(el('vj-layout').value);
  let items = [], sequence = [], index = -1, enabled = false;
  let layout = [1, 2, 3].includes(initialLayout) ? initialLayout : 1;
  let opacity = Math.max(0, Math.min(1, Number(el('vj-opacity').value) / 100 || 0));
  let loop = !!el('vj-loop').checked;
  let videos = [], generation = 0, microphoneRecording = false, microphoneStartedAt = 0, audioPlaying = false;
  let envelopeProvider = null, envelopeWarning = false;
  let reactiveBands = { bass: 0, snare: 0, hihat: 0 };

  const state = () => ({
    items: items.map(({ id, name }) => ({ id, name })),
    currentId: sequence[index] || null, sequence: sequence.slice(), enabled, layout, opacity, loop,
    envelopeProviderActive: !!envelopeProvider
  });
  function notify() {
    const snapshot = state();
    for (const listener of listeners) {
      try { listener(snapshot); } catch (error) { console.error('VJ listener', error); }
    }
    publish();
  }
  function publish() {
    if (!window.api?.vjSyncState) return;
    const snapshot = {
      sequence: sequence.slice(), currentId: sequence[index] || null, enabled, layout, opacity, loop,
      playing: enabled && (audioPlaying || microphoneRecording),
      positions: videos.map(video => Number.isFinite(video.currentTime) ? Math.max(0, Math.min(604800, video.currentTime)) : 0),
      bands: reactiveBands
    };
    window.api.vjSyncState(snapshot).catch(error => console.error('VJ follower synchronization:', error));
  }
  function message(text) { status.textContent = text; }
  function refreshUi() {
    select.replaceChildren();
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      option.disabled = !sequence.includes(item.id);
      select.appendChild(option);
    }
    if (index >= 0) select.value = sequence[index];
    select.disabled = !items.length;
    el('vj-next').disabled = !items.length;
    el('vj-toggle').disabled = !items.length;
    el('vj-clear').disabled = !items.length;
    el('vj-toggle').textContent = enabled ? 'DISABLE VJ' : 'ENABLE VJ';
    el('vj-toggle').setAttribute('aria-pressed', String(enabled));
    notify();
  }
  function dispose() {
    generation++;
    for (const video of videos) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    videos = [];
  }
  function syncPlayback() {
    const shouldPlay = enabled && (audioPlaying || microphoneRecording);
    const currentGeneration = generation;
    for (const video of videos) {
      if (!shouldPlay) { video.pause(); continue; }
      if (!video.paused) continue;
      try {
        Promise.resolve(video.play()).catch(error => {
          if (error?.name !== 'AbortError' && currentGeneration === generation && enabled && (audioPlaying || microphoneRecording)) message('Video playback failed. Check the file format and codec.');
        });
      } catch {
        if (currentGeneration === generation && enabled) message('Video playback failed. Check the file format and codec.');
      }
    }
  }
  function addVideo(pane) {
    const currentGeneration = generation;
    const item = items.find(entry => entry.id === sequence[(index + pane) % sequence.length]);
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = pane > 0;
    video.addEventListener('error', () => {
      if (currentGeneration === generation && videos.includes(video)) message(`Cannot decode or read: ${item.name}`);
    });
    if (pane === 0) video.addEventListener('ended', () => {
      if (currentGeneration !== generation || !enabled) return;
      if (index + 1 < sequence.length) selectIndex(index + 1);
      else if (loop) selectIndex(0);
      else {
        enabled = false;
        syncPlayback();
        el('vj-opacity-value').textContent = `${Math.round(opacity * 100)}%`;
        refreshUi();
        message('Sequence finished. Enable VJ or select another video to restart.');
      }
    });
    video.src = item.url;
    videos.push(video);
  }
  function rebuild() {
    dispose();
    if (index < 0 || !sequence.length) return;
    for (let pane = 0; pane < layout; pane++) addVideo(pane);
    syncPlayback();
  }
  function resizeLayout() {
    if (index < 0 || !sequence.length) return;
    while (videos.length > layout) {
      const video = videos.pop();
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    while (videos.length < layout) addVideo(videos.length);
    syncPlayback();
  }
  function selectIndex(next) {
    if (!Number.isInteger(next) || next < 0 || next >= sequence.length) return false;
    index = next;
    rebuild();
    refreshUi();
    message(`Selected: ${items.find(item => item.id === sequence[index]).name}${enabled && !audioPlaying && !microphoneRecording ? ' · waiting for shared playback' : ''}`);
    return true;
  }
  function selectById(id) { return typeof id === 'string' && selectIndex(sequence.indexOf(id)); }
  function nextVideo() { return sequence.length ? selectIndex((index + 1) % sequence.length) : false; }
  function setSequence(ids) {
    const next = ids === null ? items.map(item => item.id) : ids;
    if (ids === null && !next.length) { sequence = []; index = -1; refreshUi(); return true; }
    if (!Array.isArray(next) || !next.length || next.length > 100 ||
        new Set(next).size !== next.length || next.some(id => typeof id !== 'string' || !items.some(item => item.id === id))) throw new Error('Invalid VJ sequence: choose unique IDs from the current pool.');
    const current = sequence[index];
    sequence = next.slice();
    return selectIndex(Math.max(0, sequence.indexOf(current)));
  }
  function resetVideoPositions(time = 0) {
    for (const video of videos) {
      try {
        const duration = video.duration;
        video.currentTime = Number.isFinite(duration) && duration > 0 ? time % duration : 0;
      } catch {}
    }
  }
  audio.addEventListener('playing', () => { audioPlaying = true; syncPlayback(); publish(); });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => { audioPlaying = false; syncPlayback(); publish(); });
  }
  for (const event of ['emptied', 'loadstart']) {
    audio.addEventListener(event, () => { audioPlaying = false; resetVideoPositions(); syncPlayback(); publish(); });
  }
  audio.addEventListener('seeking', () => { resetVideoPositions(Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : 0); publish(); });
  el('vj-open').addEventListener('click', () => window.RWWorkspace?.toggle('vjStudio'));
  el('vj-choose').addEventListener('click', async () => {
    el('vj-choose').disabled = true;
    try {
      const chosen = await window.api.vjChooseVideos();
      if (!chosen) return;
      items = chosen;
      sequence = items.map(item => item.id);
      enabled = false;
      selectIndex(0);
      message(`Loaded ${items.length} video${items.length === 1 ? '' : 's'}. Enable VJ to follow shared playback.`);
    } catch (error) { message(`Could not choose videos: ${String(error.message || error)}`); }
    finally { el('vj-choose').disabled = false; }
  });
  el('vj-clear').addEventListener('click', async () => {
    try {
      await window.api.vjClearVideos();
      dispose(); items = []; sequence = []; index = -1; enabled = false;
      refreshUi(); message('Video pool cleared.');
    } catch (error) { message(`Could not clear videos: ${String(error.message || error)}`); }
  });
  select.addEventListener('change', () => selectById(select.value));
  el('vj-next').addEventListener('click', nextVideo);
  el('vj-toggle').addEventListener('click', () => {
    if (!items.length) return;
    enabled = !enabled;
    if (enabled && videos[0]?.ended) rebuild();
    syncPlayback(); refreshUi();
    message(enabled ? (audioPlaying || microphoneRecording ? 'VJ enabled.' : 'VJ enabled · waiting for shared playback.') : 'VJ disabled.');
  });
  el('vj-layout').addEventListener('change', event => {
    const value = Number(event.target.value);
    if (![1, 2, 3].includes(value)) return;
    layout = value; resizeLayout(); refreshUi();
  });
  el('vj-opacity').addEventListener('input', event => {
    opacity = Math.max(0, Math.min(1, Number(event.target.value) / 100 || 0));
    el('vj-opacity-value').textContent = `${Math.round(opacity * 100)}%`;
    notify();
  });
  el('vj-loop').addEventListener('change', event => { loop = !!event.target.checked; notify(); });

  window.vjStudio = Object.freeze({
    getState: state,
    select: selectById,
    next: nextVideo,
    setSequence,
    subscribe(callback) {
      if (typeof callback !== 'function') throw new TypeError('Expected a callback.');
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    setEnvelopeProvider(provider) {
      if (provider !== null && typeof provider !== 'function') throw new TypeError('Expected an envelope provider or null.');
      envelopeProvider = provider;
      envelopeWarning = false;
      notify();
    },
    setMicrophoneRecording(active) {
      microphoneRecording = !!active;
      if (microphoneRecording) { microphoneStartedAt = performance.now(); resetVideoPositions(); }
      syncPlayback();
      publish();
    },
    draw(ctx, width, height, live = {}) {
      if (!enabled || !opacity) return;
      const bounded = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      const bands = { bass: bounded(live.bass), snare: bounded(live.snare), hihat: bounded(live.hihat) };
      const timeMs = microphoneRecording
        ? Math.max(0, performance.now() - microphoneStartedAt)
        : (Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime * 1000) : 0);
      if (envelopeProvider) {
        try {
          const override = envelopeProvider({ timeMs, ...bands });
          if (!override || typeof override !== 'object' || Array.isArray(override)) throw new Error('Provider must return an object.');
          let invalid = false;
          for (const key of ['bass', 'snare', 'hihat']) {
            if (override[key] === undefined) continue;
            if (typeof override[key] === 'number' && Number.isFinite(override[key])) bands[key] = bounded(override[key]);
            else invalid = true;
          }
          if (invalid) {
            if (!envelopeWarning) {
              console.warn('VJ envelope provider returned invalid band values; using live analysis for those bands.');
              message('VJ envelope error · using live analysis for invalid bands. See console.');
              envelopeWarning = true;
            }
          } else envelopeWarning = false;
        } catch (error) {
          if (!envelopeWarning) {
            console.warn('VJ envelope provider failed; using live analysis:', error);
            message('VJ envelope error · using live analysis. See console.');
            envelopeWarning = true;
          }
        }
      }
      reactiveBands = bands;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.filter = `brightness(${1 + bands.bass * 0.18 + bands.snare * 0.12}) saturate(${1 + bands.hihat * 0.25})`;
      for (let pane = 0; pane < videos.length; pane++) {
        const video = videos[pane];
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) continue;
        const x = width * pane / layout, w = width * (pane + 1) / layout - x;
        const scale = Math.max(w / video.videoWidth, height / video.videoHeight);
        const sw = w / scale, sh = height / scale;
        try { ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, x, 0, w, height); }
        catch { message('Video frame could not be drawn.'); }
      }
      ctx.restore();
    }
  });
  if (typeof setInterval === 'function') setInterval(() => { if (sequence.length) publish(); }, 500);
  refreshUi();
})();
