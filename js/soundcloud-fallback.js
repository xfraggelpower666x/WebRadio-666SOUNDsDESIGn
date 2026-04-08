window.SoundCloudFallback = {

  async resolve(url) {
    const res = await fetch(
      RADIO_CONFIG.soundcloudBase + RADIO_CONFIG.endpoints.resolve + "?u=" + encodeURIComponent(url)
    );
    return await res.json();
  },

  async playFallback() {
    const data = await this.resolve(RADIO_CONFIG.soundcloudFallbackUrl);
    if (!data || !data.ok) return;

    const iframe = document.getElementById("sc-widget");
    iframe.src =
      "https://w.soundcloud.com/player/?url=" +
      encodeURIComponent(data.permalink_url);
  }
};