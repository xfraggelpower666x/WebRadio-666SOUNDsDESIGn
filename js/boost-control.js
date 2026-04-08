window.BoostControl = {
  mount(){
    document.querySelectorAll("[data-boost-level]").forEach(btn => {
      btn.addEventListener("click", () => {
        const lvl = Number(btn.dataset.boostLevel);
        const val = (window.RADIO_CONFIG?.boostGainLevels || [1.0,1.12,1.28,1.45])[lvl] || 1.0;
        if (window._gainNode) window._gainNode.gain.value = val;
        if (window.AutoBoostPro) window.AutoBoostPro.currentGain = val;
        SystemState.set({ boostLevel:lvl });
      });
    });
    SystemState.apply();
  }
};
