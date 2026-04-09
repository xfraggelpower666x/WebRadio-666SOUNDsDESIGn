window.RadioCore = {
  audio: null,

  init() {
    this.audio = document.getElementById("audio");

    this.audio.addEventListener("playing", () => {
      SystemState.set({ audioPlaying: true, audioError: false });
    });

    this.audio.addEventListener("pause", () => {
      SystemState.set({ audioPlaying: false });
    });

    this.audio.addEventListener("error", () => {
      SystemState.set({ audioError: true });
      FailoverEngine.trigger();
    });
  },

  async safePlay() {
    try {
      await this.audio.play();
    } catch {
      console.log("User interaction required");
    }
  },

  async playMain() {
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.stream;
    await this.safePlay();
    SystemState.set({ mode: "radio" });
  },

  async playBackup() {
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.backup;
    await this.safePlay();
    SystemState.set({ mode: "backup" });
  },

  stop() {
    this.audio.pause();
    SystemState.set({ mode: "idle" });
  }
};