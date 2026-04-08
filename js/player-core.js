window.RadioCore = {
  audio: null,

  init() {
    this.audio = document.getElementById("audio");

    this.audio.addEventListener("error", () => {
      FailoverEngine.trigger();
    });
  },

  async playMain() {
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.stream;
    await this.audio.play();
  },

  async playBackup() {
    this.audio.src = RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.backup;
    await this.audio.play();
  },

  stop() {
    this.audio.pause();
  }
};