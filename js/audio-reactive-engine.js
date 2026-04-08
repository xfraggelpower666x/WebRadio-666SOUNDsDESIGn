window.AudioReactive = {
  started: false,
  raf: null,

  ensureMeter(idList) {
    return idList.map(id => document.getElementById(id)).find(Boolean) || null;
  },

  draw() {
    const analyser = window._analyser;
    if (!analyser) {
      this.raf = requestAnimationFrame(() => this.draw());
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;
    const heightPct = Math.max(6, Math.min(100, Math.round((avg / 255) * 100)));

    const meters = [
      this.ensureMeter(["meterL", "levelMeterLeft", "leftLevelMeter"]),
      this.ensureMeter(["meterR", "levelMeterRight", "rightLevelMeter"])
    ].filter(Boolean);

    meters.forEach(el => {
      el.classList.add("meter-active");
      el.style.height = heightPct + "%";
      el.style.opacity = String(Math.max(0.25, avg / 255));
      el.style.boxShadow = `0 0 ${8 + (avg / 18)}px rgba(0,234,255,.55)`;
      el.style.background = "linear-gradient(180deg, rgba(0,234,255,1) 0%, rgba(180,120,255,.9) 100%)";
    });

    if (avg > 90) document.body.classList.add("live-beat-pulse");
    else document.body.classList.remove("live-beat-pulse");

    if (avg > 145) document.body.classList.add("live-drop-flash");
    else document.body.classList.remove("live-drop-flash");

    document.querySelectorAll(".live-panel-react").forEach(el => {
      if (avg > 90) el.classList.add("live-beat");
      else el.classList.remove("live-beat");
      if (avg > 145) el.classList.add("live-drop");
      else el.classList.remove("live-drop");
    });

    SystemState.set({ visualReady: true });

    this.raf = requestAnimationFrame(() => this.draw());
  },

  start() {
    if (this.started) return;
    this.started = true;
    this.draw();
  }
};
