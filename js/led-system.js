window.RadioLEDs = {

  set(id, state) {
    const el = document.querySelector(`[data-led="${id}"]`);
    if (!el) return;
    el.className = "led " + state;
  },

  syncFromState(state) {

    this.set("RAD", state.djMode === "live" ? "green" : "yellow");

    this.set("STR",
      state.mode === "radio"
        ? "green"
        : state.mode === "backup"
        ? "yellow"
        : "red"
    );

    this.set("META", state.metadataOk ? "green" : "red");

    this.set("AUD", state.audioPlaying ? "green" : "yellow");
  }
};