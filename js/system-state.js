window.SystemState = {
  mode: "idle",
  workerOnline: false,
  metadataOk: false,
  signalState: "idle",
  audioPlaying: false,
  audioError: false,
  djMode: "auto",
  track: "",
  djName: "",
  listeners: 0,
  bitrate: 0,
  sourceLabel: "",
  videoReady: false,
  visualReady: false,
  boostLevel: window.RADIO_CONFIG?.boostDefault || 0,

  set(patch) {
    Object.assign(this, patch);
    if (window.RadioLEDs && typeof RadioLEDs.syncFromState === "function") {
      RadioLEDs.syncFromState(this);
    }
    if (typeof this.applyToDom === "function") {
      this.applyToDom();
    }
  },

  applyToDom() {
    const qs = (id) => document.getElementById(id);

    [qs("workerStatus"), qs("workerState"), qs("statusWorker"), qs("status-worker")]
      .filter(Boolean)
      .forEach(el => { el.textContent = this.workerOnline ? "ONLINE" : "OFFLINE"; });

    const signalText =
      this.signalState === "backup" ? "BACKUP ACTIVE" :
      this.signalState === "soundcloud" ? "AUTO DJ ACTIVE" :
      this.signalState === "live" ? "LIVE" :
      this.signalState === "lost" ? "SIGNAL LOST" :
      "IDLE";

    [qs("signalStatus"), qs("signalState"), qs("statusSignal"), qs("status-signal")]
      .filter(Boolean)
      .forEach(el => { el.textContent = signalText; });

    [qs("sourceValue"), qs("source"), qs("currentSource"), qs("statusSource")]
      .filter(Boolean)
      .forEach(el => {
        el.textContent = this.sourceLabel || (this.mode === "backup" ? "backup" : this.mode === "radio" ? "main" : this.mode === "soundcloud" ? "autodj" : "-");
      });

    [qs("track"), qs("trackTitle"), qs("currentTitle"), qs("liveTitle")]
      .filter(Boolean)
      .forEach(el => {
        el.textContent = this.track || "Live Stream";
        el.classList.add("player-title-clip");
      });

    [qs("dj"), qs("djName"), qs("currentDj"), qs("liveDj")]
      .filter(Boolean)
      .forEach(el => { el.textContent = this.djName || "666SOUNDsDESIGn DJ"; });

    [qs("listeners"), qs("listenerCount"), qs("currentListeners")]
      .filter(Boolean)
      .forEach(el => { el.textContent = String(this.listeners || 0); });

    [qs("bitrate"), qs("bitrateValue"), qs("currentBitrate")]
      .filter(Boolean)
      .forEach(el => { el.textContent = String(this.bitrate || 0); });

    const label =
      this.mode === "backup" ? "Backup Stream" :
      this.mode === "radio" ? "Main Stream" :
      this.mode === "soundcloud" ? "Auto DJ" :
      "Live Stream";

    const title = this.track || label;
    const clipped = title.length > (window.RADIO_CONFIG?.streamTitleMaxLength || 72)
      ? title.slice(0, (window.RADIO_CONFIG?.streamTitleMaxLength || 72) - 1) + "…"
      : title;

    [qs("masterPlayerTitle"), qs("playerTitle"), qs("masterTitle")]
      .filter(Boolean)
      .forEach(el => {
        el.textContent = clipped;
        el.classList.add("player-title-clip");
      });

    let sub = "";
    if (this.mode === "backup") sub = "Fallback: backup active";
    else if (this.mode === "radio") sub = "Main stream active";
    else if (this.mode === "soundcloud") sub = "Fallback: Auto DJ active";

    [qs("playerSubline"), qs("masterPlayerSubline"), qs("playerSubtitle")]
      .filter(Boolean)
      .forEach(el => { el.textContent = sub; });

    const boostStatus = qs("boostStatus");
    if (boostStatus) {
      boostStatus.innerHTML = `BOOST GR ${String(this.boostLevel || 0)} <span id="boostLed"></span>`;
      const led = document.getElementById("boostLed");
      if (led) {
        led.className =
          Number(this.boostLevel || 0) === 0 ? "boost-off" :
          Number(this.boostLevel || 0) === 1 ? "boost-low" :
          Number(this.boostLevel || 0) === 2 ? "boost-mid" :
          "boost-high";
      }
    }

    document.querySelectorAll("[data-boost-level]").forEach(btn => {
      const lvl = Number(btn.getAttribute("data-boost-level"));
      btn.classList.toggle("active", lvl === Number(this.boostLevel || 0));
    });
  }
};
