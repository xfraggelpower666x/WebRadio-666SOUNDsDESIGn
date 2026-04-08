window.SystemState = {
  workerOnline:false,
  signalState:"IDLE",
  source:"-",
  title:"Live Stream",
  dj:"666SOUNDsDESIGn DJ",
  listeners:0,
  bitrate:0,
  boostLevel:(window.RADIO_CONFIG?.boostDefault || 1),
  set(patch){
    Object.assign(this, patch);
    this.apply();
  },
  apply(){
    const byId = (id) => document.getElementById(id);
    const setTxt = (ids, txt) => ids.forEach(id => { const el = byId(id); if (el) el.textContent = txt; });
    setTxt(["workerState"], this.workerOnline ? "ONLINE" : "OFFLINE");
    setTxt(["signalState"], this.signalState || "IDLE");
    setTxt(["sourceState"], this.source || "-");
    setTxt(["songTitle","playerTrack"], this.title || "Live Stream");
    setTxt(["djState"], this.dj || "666SOUNDsDESIGn DJ");
    setTxt(["listenersState"], String(this.listeners || 0));
    setTxt(["bitrateState"], String(this.bitrate || 0));
    const boostStatus = byId("boostStatus");
    if (boostStatus) {
      boostStatus.innerHTML = `BOOST GR ${String(this.boostLevel || 0)} <span id="boostLed"></span>`;
      const led = byId("boostLed");
      if (led) led.className =
        Number(this.boostLevel||0) === 0 ? "boost-off" :
        Number(this.boostLevel||0) === 1 ? "boost-low" :
        Number(this.boostLevel||0) === 2 ? "boost-mid" :
        "boost-high";
    }
    document.querySelectorAll("[data-boost-level]").forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.boostLevel) === Number(this.boostLevel || 0));
    });
  }
};
