// iPhone Audio + Visual Fix

window.iOSFix = {
  init() {
    const btn = document.body;

    btn.addEventListener("touchstart", async () => {
      try {
        if (window._audioCtx && _audioCtx.state !== "running") {
          await _audioCtx.resume();
        }
      } catch(e){}
    }, { once: true });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  iOSFix.init();
});
