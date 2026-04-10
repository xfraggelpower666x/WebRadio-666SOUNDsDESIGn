window.SmartFailover = {

  lastAudioTs: 0,
  timeoutMs: 8000,

  init() {
    const audio = document.getElementById("audio");
    if (!audio) return;

    audio.addEventListener("playing", () => {
      this.lastAudioTs = Date.now();
    });

    audio.addEventListener("timeupdate", () => {
      this.lastAudioTs = Date.now();
    });

    setInterval(() => this.monitor(), 3000);
  },

  async monitor() {
    const now = Date.now();

    if (SystemState.mode === "radio" || SystemState.mode === "backup") {
      if (now - this.lastAudioTs > this.timeoutMs) {
        console.log("SMART FAILOVER TRIGGER");
        FailoverEngine.trigger();
      }
    }
  }
};