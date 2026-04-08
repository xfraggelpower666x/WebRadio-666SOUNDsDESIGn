window.MetadataUI = {
  async pullHealth() {
    try {
      const url = RADIO_CONFIG.radioBase + (RADIO_CONFIG.endpoints.health || "/health");
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      SystemState.set({ workerOnline: !!data.ok });
    } catch (e) {
      SystemState.set({ workerOnline: false });
    }
  },

  async update() {
    try {
      const res = await fetch(RADIO_CONFIG.radioBase + RADIO_CONFIG.endpoints.metadata, { cache: "no-store" });
      const data = await res.json();

      const track = data.song || data.title || "Live Stream";
      const djRaw = String(data.djusername || "").trim();
      const djLower = djRaw.toLowerCase();
      const isAuto = !djLower || ["auto","autodj","auto dj","no dj","false","none"].some(v => djLower.includes(v));

      let mode = SystemState.mode;
      let signal = SystemState.signalState;
      let sourceLabel = SystemState.sourceLabel;

      const streamState = String(data.stream || "").toLowerCase();
      if (streamState === "live") {
        signal = "live";
        if (mode !== "backup" && mode !== "soundcloud") mode = "radio";
        sourceLabel = "main";
      } else if (mode === "backup") {
        signal = "backup";
        sourceLabel = "backup";
      } else if (mode === "soundcloud") {
        signal = "soundcloud";
        sourceLabel = "autodj";
      }

      SystemState.set({
        metadataOk: true,
        track,
        djName: isAuto ? RADIO_CONFIG.djFallbackName : djRaw,
        djMode: isAuto ? "auto" : "live",
        listeners: Number(data.listeners || 0),
        bitrate: Number(data.bitrate || 0),
        mode,
        signalState: signal,
        sourceLabel
      });
    } catch (e) {
      SystemState.set({ metadataOk: false });
    }
  }
};
