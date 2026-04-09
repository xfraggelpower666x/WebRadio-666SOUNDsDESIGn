window.FailoverEngine = {

  async check(url) {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  },

  async run() {
    const main = await this.check(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.stream);
    if (main) return RadioCore.playMain();

    const backup = await this.check(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.backup);
    if (backup) return RadioCore.playBackup();

    return SoundCloudFallback.playFallback();
  },

  trigger() {
    setTimeout(() => this.run(), 1000);
  }
};