window.RadioCore = {
  audio: null,
  gainNode: null,
  analyserNode: null,
  sourceNode: null,

  init() {
    this.audio = document.getElementById("audio");
    if (!this.audio) return;

    this.audio.preload = "none";
    this.audio.crossOrigin = "anonymous";

    this.audio.addEventListener("playing", () => {
      SystemState.set({ audioPlaying: true, audioError: false });
    });

    this.audio.addEventListener("pause", () => {
      SystemState.set({ audioPlaying: false });
    });

    this.audio.addEventListener("error", () => {
      SystemState.set({ audioError: true });
      if (window.FailoverEngine) FailoverEngine.trigger();
    });

    this.audio.addEventListener("stalled", () => {
      if (window.FailoverEngine) FailoverEngine.trigger();
    });

    this.audio.addEventListener("abort", () => {
      if (window.FailoverEngine) FailoverEngine.trigger();
    });
  },

  async unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!window._audioCtx && Ctx && this.audio) {
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(this.audio);
        const gain = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;

        source.connect(gain);
        gain.connect(analyser);
        analyser.connect(ctx.destination);

        window._audioCtx = ctx;
        window._sourceNode = source;
        window._gainNode = gain;
        window._analyser = analyser;

        this.sourceNode = source;
        this.gainNode = gain;
        this.analyserNode = analyser;

        this.applyBoost(SystemState.boostLevel || window.RADIO_CONFIG?.boostDefault || 0);
      }

      if (window._audioCtx && window._audioCtx.state === "suspended") {
        await window._audioCtx.resume();
      }
    } catch (e) {
      console.log("unlockAudio failed", e);
    }
  },

  getGainNode() {
    return this.gainNode || window._gainNode || null;
  },

  applyBoost(level) {
    const gain = this.getGainNode();
    const lvl = Math.max(0, Math.min(3, Number(level || 0)));
    const value = (window.RADIO_CONFIG?.boostGainLevels || [1.0, 1.12, 1.28, 1.45])[lvl] || 1.0;
    if (gain) gain.gain.value = value;
    SystemState.set({ boostLevel: lvl });
  },

  async safePlay() {
    try {
      await this.unlockAudio();
      await this.audio.play();
      return true;
    } catch (e) {
      console.log("safePlay blocked", e);
      return false;
    }
  },

  async playMain() {
    if (!this.audio) return false;
    this.stopExternal();
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.stream;
    const ok = await this.safePlay();
    if (ok) {
      SystemState.set({
        mode: "radio",
        signalState: "live",
        sourceLabel: "main"
      });
    }
    return ok;
  },

  async playBackup() {
    if (!this.audio) return false;
    this.stopExternal();
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.backup;
    const ok = await this.safePlay();
    if (ok) {
      SystemState.set({
        mode: "backup",
        signalState: "backup",
        sourceLabel: "backup"
      });
    }
    return ok;
  },

  stopExternal() {
    try { window.SoundCloudFallback && SoundCloudFallback.pause && SoundCloudFallback.pause(); } catch (e) {}
    try { window.YouTubeOverlay && YouTubeOverlay.pause && YouTubeOverlay.pause(); } catch (e) {}
  },

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.stopExternal();
    SystemState.set({
      mode: "idle",
      audioPlaying: false,
      signalState: "idle"
    });
  }
};
