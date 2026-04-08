window.FailoverEngine = {
  lockUntil: 0,

  async check(url) {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  },

  async run() {
    const now = Date.now();
    if (now < this.lockUntil) return;
    this.lockUntil = now + (RADIO_CONFIG.retryCooldownMs || 2500);

    const main = await this.check(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.stream);
    if (main) return RadioCore.playMain();

    const backup = await this.check(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.backup);
    if (backup) return RadioCore.playBackup();

    if (window.SoundCloudFallback) {
      SystemState.set({ signalState: "soundcloud", sourceLabel: "autodj" });
      return SoundCloudFallback.playFallback();
    }

    SystemState.set({ signalState: "lost" });
  },

  trigger() {
    setTimeout(() => this.run(), 1000);
  }
};
