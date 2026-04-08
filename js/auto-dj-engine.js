window.AutoDJ = {
  running: false,
  queue: [],
  currentIndex: 0,
  rotateMs: 15 * 60 * 1000,
  timer: null,

  async resolveSource(url) {
    try {
      const res = await fetch(
        RADIO_CONFIG.soundcloudBase + RADIO_CONFIG.endpoints.resolve + "?u=" + encodeURIComponent(url),
        { cache: "no-store" }
      );
      const data = await res.json();
      return data && data.ok ? data : null;
    } catch (e) {
      return null;
    }
  },

  async buildQueue() {
    this.queue = [];
    const sources = Array.isArray(RADIO_CONFIG.soundcloudFallbackSources)
      ? RADIO_CONFIG.soundcloudFallbackSources
      : [RADIO_CONFIG.soundcloudFallbackUrl];

    for (const url of sources) {
      const resolved = await this.resolveSource(url);
      if (resolved && resolved.permalink_url) {
        this.queue.push({
          title: resolved.title || "SoundCloud Fallback",
          permalink_url: resolved.permalink_url,
          artwork: resolved.artwork || "",
          artist: resolved.artist || resolved.user?.username || ""
        });
      }
    }

    if (!this.queue.length && RADIO_CONFIG.soundcloudFallbackUrl) {
      this.queue.push({
        title: "SoundCloud Fallback",
        permalink_url: RADIO_CONFIG.soundcloudFallbackUrl,
        artwork: "",
        artist: ""
      });
    }
  },

  async start() {
    if (this.running) return;
    this.running = true;
    await this.buildQueue();
    this.currentIndex = 0;
    this.playCurrent();
    this.startRotation();
    SystemState.set({ mode: "soundcloud", audioPlaying: true, metadataOk: true, djMode: "auto", signalState: "soundcloud", sourceLabel: "autodj" });
  },

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
  },

  playCurrent() {
    if (!this.queue.length || !window.SoundCloudFallback) return;
    const item = this.queue[this.currentIndex];
    SoundCloudFallback.playUrl(item.permalink_url);

    SystemState.set({
      track: item.title || "SoundCloud Fallback",
      djName: RADIO_CONFIG.djFallbackName || "666SOUNDsDESIGn DJ"
    });

    const coverEl = document.getElementById("cover");
    if (coverEl && item.artwork) coverEl.src = item.artwork;
  },

  next() {
    if (!this.queue.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    this.playCurrent();
  },

  startRotation() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.running) this.next();
    }, this.rotateMs);
  }
};
