document.addEventListener("DOMContentLoaded", () => {

  if (window.SmartFailover) SmartFailover.init();

  if (window.VisualBoostPro) {
    setTimeout(() => VisualBoostPro.init(), 1000);
  }

  const startBtn = document.getElementById("startBtn");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      setTimeout(() => {
        if (window.VisualBoostPro) VisualBoostPro.init();
      }, 500);
    });
  }

  const fallbackCheck = setInterval(() => {
    if (SystemState.mode === "idle") {
      AutoDJ.start();
    }
  }, 5000);

});