
window.RadioAudioEngine = (() => {
  let audioCtx = null;
  let sourceNode = null;
  let analyser = null;
  let compressor = null;
  let gainNode = null;
  let attachedAudio = null;

  function ensure(audioEl) {
    if (audioCtx) return { audioCtx, analyser, compressor, gainNode };
    attachedAudio = audioEl;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.19;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0;

    sourceNode.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioCtx.destination);

    return { audioCtx, analyser, compressor, gainNode };
  }

  async function resume() {
    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  }

  function setBoost(level) {
    if (!gainNode) return;
    const table = [1.0, 1.08, 1.16, 1.24];
    gainNode.gain.value = table[level] || 1.0;
  }

  function getAnalysis() {
    if (!analyser) return null;

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    let peak = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = Math.abs((timeData[i] - 128) / 128);
      if (v > peak) peak = v;
    }

    const reduction = typeof compressor.reduction === "number" ? Math.abs(compressor.reduction) : 0;

    return {
      peak,
      reduction,
      freqData,
      gainValue: gainNode ? gainNode.gain.value : 1.0
    };
  }

  function autoGainStep(enabled, boostLevel) {
    if (!enabled || !gainNode) return gainNode ? gainNode.gain.value : 1.0;
    const analysis = getAnalysis();
    if (!analysis) return gainNode.gain.value;

    const level = analysis.peak;
    const current = gainNode.gain.value;
    const maxGain = 1.42 + boostLevel * 0.06;
    let next = current;

    if (level < 0.18) next = Math.min(current + 0.01, maxGain);
    else if (level > 0.72) next = Math.max(current - 0.015, 0.72);
    else next += (0.58 - level) * 0.02;

    gainNode.gain.value = Math.min(Math.max(next, 0.72), maxGain);
    return gainNode.gain.value;
  }

  return { ensure, resume, setBoost, getAnalysis, autoGainStep };
})();
