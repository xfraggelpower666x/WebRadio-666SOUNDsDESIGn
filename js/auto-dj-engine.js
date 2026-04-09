window.AutoDJ = {

  running: false,

  async start() {
    if (this.running) return;
    this.running = true;

    console.log("AUTO DJ START");

    SoundCloudFallback.playFallback();
    SystemState.set({ mode: "soundcloud" });
  },

  stop() {
    this.running = false;
  }
};