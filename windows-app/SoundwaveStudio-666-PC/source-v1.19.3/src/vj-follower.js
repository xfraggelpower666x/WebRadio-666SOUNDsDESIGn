'use strict';
(() => {
  if (new URLSearchParams(location.search).get('output') !== '1') return;
  const api = window.api;
  let latest = null, revision = 0, videos = [], paneIds = [], stale = false;
  const status = document.createElement('div');
  status.className = 'vj-output-status hidden';
  status.setAttribute('role', 'status');
  document.body.appendChild(status);
  const report = text => { status.textContent = text; status.classList.remove('hidden'); };
  function dispose() {
    for (const video of videos) { video.pause(); video.removeAttribute('src'); video.load(); }
    videos = []; paneIds = [];
  }
  function correct() {
    const snapshot = latest?.state;
    if (!snapshot) return;
    const elapsed = snapshot.playing ? Math.max(0, Math.min(2, (Date.now() - latest.at) / 1000)) : 0;
    videos.forEach((video, pane) => {
      const duration = video.duration;
      let target = snapshot.positions[pane] + elapsed;
      if (Number.isFinite(duration) && duration > 0) target %= duration;
      try {
        if (video.readyState >= 1 && Math.abs(video.currentTime - target) > 0.3) video.currentTime = target;
      } catch { report('VJ output could not seek the selected video.'); }
      if (snapshot.enabled && snapshot.playing && !stale) {
        if (video.paused) {
          try { Promise.resolve(video.play()).catch(error => {
            if (error?.name !== 'AbortError' && latest?.state?.playing && !stale) report('VJ output cannot play the selected video.');
          }); } catch { report('VJ output cannot play the selected video.'); }
        }
      } else video.pause();
    });
  }
  function receive(message) {
    if (!message || !Number.isSafeInteger(message.revision) || message.revision <= revision) return;
    revision = message.revision;
    latest = message;
    if (stale) status.classList.add('hidden');
    stale = false;
    const snapshot = message.state;
    if (!snapshot || !snapshot.sequence.length) { dispose(); status.classList.add('hidden'); return; }
    const start = snapshot.sequence.indexOf(snapshot.currentId);
    const nextIds = Array.from({ length: snapshot.layout }, (_, i) => snapshot.sequence[(start + i) % snapshot.sequence.length]);
    if (nextIds.length !== paneIds.length || nextIds.some((id, i) => paneIds[i] !== id)) {
      dispose();
      paneIds = nextIds;
      for (const id of paneIds) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; video.muted = true; video.defaultMuted = true;
        video.playsInline = true; video.preload = 'auto'; video.loop = true;
        video.addEventListener('loadedmetadata', correct);
        video.addEventListener('error', () => report('VJ output cannot decode or read the selected video.'));
        video.src = `swvj://video/${id}`;
        videos.push(video);
      }
      status.classList.add('hidden');
    }
    correct();
  }
  api.onVjFollowerState(receive);
  api.vjFollowerState().then(receive).catch(() => report('VJ output synchronization unavailable.'));
  setInterval(() => {
    if (latest?.state?.playing && Date.now() - latest.at > 2500) {
      stale = true;
      for (const video of videos) video.pause();
      report('VJ output is waiting for the primary visualizer.');
    }
  }, 500);
  window.vjStudio = Object.freeze({
    draw(ctx, width, height) {
      const state = latest?.state;
      if (!state?.enabled || !state.opacity) return;
      const { bass, snare, hihat } = state.bands;
      ctx.save();
      ctx.globalAlpha = state.opacity;
      ctx.filter = `brightness(${1 + bass * 0.18 + snare * 0.12}) saturate(${1 + hihat * 0.25})`;
      videos.forEach((video, pane) => {
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
        const x = width * pane / state.layout, w = width * (pane + 1) / state.layout - x;
        const scale = Math.max(w / video.videoWidth, height / video.videoHeight);
        const sw = w / scale, sh = height / scale;
        try { ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, x, 0, w, height); }
        catch { report('VJ output could not draw the selected video.'); }
      });
      ctx.restore();
    }
  });
})();
