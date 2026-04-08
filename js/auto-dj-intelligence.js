window.AutoDJIntelligence = {
  classify(rawDj) {
    const djRaw = String(rawDj || "").trim().toLowerCase();
    const autoList = ["auto", "autodj", "auto dj", "no dj", "false", "none", ""];
    return autoList.some(v => djRaw === v || djRaw.includes(v)) ? "auto" : "live";
  },

  apply(data) {
    const mode = this.classify(data?.djusername);
    if (!window.SystemState) return mode;

    SystemState.set({
      djMode: mode,
      djName: mode === "auto"
        ? RADIO_CONFIG.djFallbackName
        : String(data?.djusername || "").trim()
    });

    return mode;
  }
};
