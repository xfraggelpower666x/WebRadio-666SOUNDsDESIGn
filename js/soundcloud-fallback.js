window.SoundCloudFallback = {
  playUrl(url) {
    const iframe = document.getElementById("sc-widget");
    if (!iframe || !url) return;
    iframe.src =
      "https://w.soundcloud.com/player/?url=" +
      encodeURIComponent(url) +
      "&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false";
    SystemState.set({ mode: "soundcloud", audioPlaying: true, signalState: "soundcloud", sourceLabel: "autodj" });
  },

  pause() {
    const iframe = document.getElementById("sc-widget");
    if (iframe) iframe.src = "";
  },

  async resolve(url) {
    const res = await fetch(
      RADIO_CONFIG.soundcloudBase + RADIO_CONFIG.endpoints.resolve + "?u=" + encodeURIComponent(url),
      { cache: "no-store" }
    );
    return await res.json();
  },

  async playFallback() {
    if (window.AutoDJ) return AutoDJ.start();

    try {
      const data = await this.resolve(RADIO_CONFIG.soundcloudFallbackUrl);
      if (!data || !data.ok) return;
      this.playUrl(data.permalink_url || RADIO_CONFIG.soundcloudFallbackUrl);
    } catch (e) {}
  }
};
