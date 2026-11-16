'use strict';
(() => {
  if (new URLSearchParams(location.search).get('output') === '1') return;
  const el = id => document.getElementById(id);
  const studio = window.vjStudio;
  const data = window.RWVjData.create();
  const audioStatus = el('vj-data-audio-status');
  const status = el('vj-data-status');
  const enabled = el('vj-data-audio-enabled');
  const progress = el('vj-data-progress');
  const audio = el('audio-element');
  let simulation = null;
  let audioSource = '';
  enabled.checked = false;

  function showAudioStatus() {
    const state = data.status();
    const loaded = state.bands.length ? state.bands.join(', ') : 'none';
    const live = ['bass', 'snare', 'hihat'].filter(band => !state.audioEnabled || !state.bands.includes(band));
    audioStatus.textContent = `CSV: ${loaded}. Live analysis: ${live.length ? live.join(', ') : 'none'}.`;
  }
  function setAudioEnabled(active) {
    data.setAudioEnabled(active);
    studio.setEnvelopeProvider(active ? ({ timeMs, bass, snare, hihat }) =>
      data.audio(timeMs, { bass, snare, hihat }) : null);
    enabled.checked = active;
    audioSource = active ? (audio.src || audio.currentSrc || '') : '';
    showAudioStatus();
  }
  for (const kind of ['bass', 'snare', 'hihat']) {
    const button = el(`vj-data-${kind}`);
    button.addEventListener('click', async () => {
      for (const id of ['vj-data-bass', 'vj-data-snare', 'vj-data-hihat', 'vj-data-clear-audio', 'vj-data-audio-enabled']) el(id).disabled = true;
      try {
        const files = await window.api.openVjData('sync');
        if (!files) return;
        const count = data.loadBand(kind, files[0].text);
        showAudioStatus();
        audioStatus.textContent += ` ${kind}: ${count} keyframes loaded from ${files[0].name}.`;
      } catch (error) {
        audioStatus.textContent = `Could not load ${kind} CSV: ${String(error.message || error)}`;
      } finally {
        for (const id of ['vj-data-bass', 'vj-data-snare', 'vj-data-hihat', 'vj-data-clear-audio', 'vj-data-audio-enabled']) el(id).disabled = false;
      }
    });
  }
  enabled.addEventListener('change', () => {
    try { setAudioEnabled(enabled.checked); }
    catch (error) { enabled.checked = false; audioStatus.textContent = String(error.message || error); }
  });
  el('vj-data-clear-audio').addEventListener('click', () => {
    data.clearBands();
    studio.setEnvelopeProvider(null);
    enabled.checked = false;
    showAudioStatus();
  });
  for (const event of ['emptied', 'seeking']) {
    audio.addEventListener(event, () => data.resetClock());
  }
  audio.addEventListener('loadstart', () => {
    const next = audio.src || audio.currentSrc || '';
    if (!enabled.checked || !next) return;
    if (audioSource && next !== audioSource) {
      setAudioEnabled(false);
      audioStatus.textContent += ' Audio source changed; load matching CSV files and re-enable sync.';
    } else audioSource = next;
  });

  el('vj-data-parity').addEventListener('click', async () => {
    for (const id of ['vj-data-parity', 'vj-data-clear-parity', 'vj-data-simulate', 'vj-data-select']) el(id).disabled = true;
    try {
      const files = await window.api.openVjData('parity');
      if (!files) return;
      const count = data.loadParity(files.map(file => file.text));
      status.textContent = `${count} parity records loaded from ${files.length} file(s).`;
    } catch (error) { status.textContent = `Could not load parity data: ${String(error.message || error)}`; }
    finally {
      for (const id of ['vj-data-parity', 'vj-data-clear-parity', 'vj-data-simulate', 'vj-data-select']) el(id).disabled = false;
    }
  });
  el('vj-data-clear-parity').addEventListener('click', () => {
    data.clearParity();
    status.textContent = 'Parity data cleared. Current video order is unchanged.';
  });
  el('vj-data-simulate').addEventListener('click', async () => {
    const inputs = el('vj-data-inputs').value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const shots = Number(el('vj-data-shots').value);
    simulation = new AbortController();
    for (const id of ['vj-data-simulate', 'vj-data-parity', 'vj-data-clear-parity', 'vj-data-select']) el(id).disabled = true;
    el('vj-data-cancel').disabled = false;
    progress.value = 0;
    status.textContent = 'Simulating locally...';
    try {
      const records = await data.simulate(inputs, {
        shots, signal: simulation.signal,
        onProgress: value => { progress.value = value; }
      });
      status.textContent = `${records.length} classical simulation records generated.`;
    } catch (error) {
      status.textContent = `Simulation: ${String(error.message || error)}`;
    } finally {
      simulation = null;
      for (const id of ['vj-data-simulate', 'vj-data-parity', 'vj-data-clear-parity', 'vj-data-select']) el(id).disabled = false;
      el('vj-data-cancel').disabled = true;
    }
  });
  el('vj-data-cancel').addEventListener('click', () => simulation?.abort());
  el('vj-data-select').addEventListener('click', () => {
    try {
      const candidates = studio.getState().items.map(item => item.id);
      if (!candidates.length) throw new Error('Choose videos first');
      const chosen = data.select(candidates, Number(el('vj-data-limit').value));
      if (!chosen.length) throw new Error('No videos selected: parity data contains no odd results');
      studio.setSequence(chosen);
      status.textContent = `Parity order applied: ${chosen.length} of ${candidates.length} videos.`;
    } catch (error) { status.textContent = `Selection: ${String(error.message || error)}`; }
  });
  el('vj-data-reset').addEventListener('click', () => {
    try {
      studio.setSequence(null);
      status.textContent = 'Full video order restored.';
    } catch (error) { status.textContent = `Could not restore order: ${String(error.message || error)}`; }
  });
  const capture = el('vj-data-capture');
  if (capture) {
    const kinds = ['bass','snare','hihat'];
    let samples = new Map(), timer, source;
    function stopCapture() {
      clearInterval(timer);
      timer = null;
      capture.textContent = 'RECORD LIVE ENVELOPES';
      audioStatus.textContent = 'Captured '+samples.size+' live samples. Save each band as CSV.';
    }
    capture.addEventListener('click', () => {
      if (timer) return stopCapture();
      if (audio.paused || audio.ended || !audio.currentSrc) {
        audioStatus.textContent = 'Play the audio track before capturing envelopes.';
        return;
      }
      samples = new Map();
      source = audio.currentSrc;
      capture.textContent = 'STOP CAPTURE';
      audioStatus.textContent = 'Capturing live audio at 10 samples per second…';
      timer = setInterval(() => {
        const runtime = window.SoundwaveRuntime;
        const analyser = runtime?.getAnalyser();
        if (audio.ended || audio.currentSrc!==source || samples.size>=20000) return stopCapture();
        if (audio.paused || audio.seeking || audio.readyState<2 || analyser?.context.state!=='running') return;
        const bins = runtime.getFrequencyData();
        if (!bins?.length) return;
        const binHz = analyser.context.sampleRate / analyser.fftSize;
        const level = (from,to) => {
          const first=Math.max(1,Math.ceil(from/binHz));
          const last=Math.min(bins.length,Math.max(first+1,Math.ceil(to/binHz)));
          let sum=0;
          for(let i=first;i<last;i++)sum+=bins[i];
          return last>first ? sum/(255*(last-first)) : 0;
        };
        samples.set(Math.round(audio.currentTime*1000),[level(25,160),level(160,2400),level(2400,12000)]);
      },100);
    });
    for (const kind of [...kinds,'json']) {
      el('vj-data-save-'+kind).addEventListener('click', async () => {
        try {
          if (kind!=='json' && timer) stopCapture();
          if (kind!=='json' && !samples.size) throw new Error('Record live envelopes first');
          const text = kind==='json' ? data.exportParity() : 'Time_ms,Bass_Amplitude\n'+
            [...samples.entries()].sort((a,b)=>a[0]-b[0]).map(([ms,values])=>ms+','+values[kinds.indexOf(kind)].toFixed(5)).join('\n')+'\n';
          const saved = await window.api.saveVjData(kind,text);
          if (saved) (kind==='json'?status:audioStatus).textContent='File saved.';
        } catch(error) { (kind==='json'?status:audioStatus).textContent=String(error.message||error); }
      });
    }
  }
  showAudioStatus();
})();
