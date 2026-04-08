window.iOSFix = {
  armed: false,

  init() {
    if (this.armed) return;
    this.armed = true;

    const unlock = async () => {
      try {
        if (window.RadioCore && RadioCore.unlockAudio) {
          await RadioCore.unlockAudio();
        }
        if (window.AudioReactive) {
          AudioReactive.start();
        }
      } catch (e) {
        console.log("iOS unlock fail", e);
      }
    };

    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
  }
};
