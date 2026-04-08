window.MetadataFix = {
  async pull() {
    try {
      const res = await fetch(RADIO_CONFIG.radioBase + "/api/radio/metadata");
      const data = await res.json();

      document.getElementById("track").textContent = data.song || "LIVE";
      document.getElementById("dj").textContent = data.djusername || "666SOUNDsDESIGn";
    } catch(e) {
      console.log("metadata fail", e);
    }
  }
};

setInterval(() => MetadataFix.pull(), 5000);
