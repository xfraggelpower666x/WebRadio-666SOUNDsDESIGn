window.SystemState = {

  mode: "idle",

  audioPlaying: false,
  audioError: false,

  metadataOk: false,
  djMode: "auto",

  set(patch) {
    Object.assign(this, patch);

    if (window.RadioLEDs) {
      RadioLEDs.syncFromState(this);
    }
  }
};