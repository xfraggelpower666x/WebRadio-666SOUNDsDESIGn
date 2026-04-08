window.MixcloudPanel = {
  init() {
    const frame = document.getElementById("mixFrame");
    if (!frame || !window.RADIO_CONFIG) return;
    frame.src =
      "https://www.mixcloud.com/widget/iframe/?feed=" +
      encodeURIComponent(RADIO_CONFIG.mixcloudFeed);
  }
};
