document.addEventListener("DOMContentLoaded", () => {
  if (window.MixcloudPanel) MixcloudPanel.init();
  if (window.YouTubeOverlay) YouTubeOverlay.init();

  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      setTimeout(() => {
        if (window.GodMode) GodMode.start();
      }, 400);
    });
  }

  const ytBtn = document.getElementById("ytBtn");
  if (ytBtn) {
    ytBtn.addEventListener("click", () => {
      if (window.RadioCore && window.YouTubeOverlay) {
        RadioCore.stop();
        YouTubeOverlay.play();
      }
    });
  }

  const radioBtn = document.getElementById("radioBtn");
  if (radioBtn) {
    radioBtn.addEventListener("click", () => {
      if (window.YouTubeOverlay) YouTubeOverlay.pause();
    });
  }
});
