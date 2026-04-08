window.MetadataUI = {

  async update() {
    try {
      const res = await fetch(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.metadata);
      const data = await res.json();

      document.getElementById("track").textContent =
        data.song || "LIVE STREAM";

      const djRaw = (data.djusername || "").toLowerCase();
      const isAuto = !djRaw || ["auto","autodj","no dj","false"].some(v => djRaw.includes(v));

      document.getElementById("dj").textContent =
        isAuto ? RADIO_CONFIG.djFallbackName : "LIVE: " + data.djusername;

    } catch {}
  }
};