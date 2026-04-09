window.GodMode = {
  energy: 0,
  lastKickTs: 0,
  kickStreak: 0,
  lastInsaneTs: 0,
  initialized: false,

  init() {
    this.initialized = true;
    document.body.classList.add("god-mode-active");

    const hud = document.getElementById("hud");
    if (hud) hud.classList.add("god-mode");

    ["left", "center", "right"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("god-panel", id);
      if (!el.querySelector(".god-energy-ring")) {
        const ring = document.createElement("div");
        ring.className = "god-energy-ring";
        el.appendChild(ring);
      }
    });

    if (!document.getElementById("godModeStatus")) {
      const box = document.createElement("div");
      box.id = "godModeStatus";
      box.textContent = "GOD MODE ACTIVE";
      document.body.appendChild(box);
    }
  },

  getAnalyser() {
    return window._analyser || null;
  },

  getData() {
    const analyser = this.getAnalyser();
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  },

  getBass(data) {
    let bass = 0, count = 0;
    for (let i = 0; i < Math.min(15, data.length); i++) {
      bass += data[i];
      count++;
    }
    return count ? bass / count : 0;
  },

  pulseVisuals(level, bass) {
    const panels = document.querySelectorAll(".god-panel");
    const leds = document.querySelectorAll(".led");
    const center = document.getElementById("center");
    const cover = document.getElementById("cover");
    const signature = document.getElementById("signatureText");

    const scale = 1 + (level / 255) * 0.045;
    const strong = bass > 150;

    panels.forEach((panel) => {
      panel.style.filter = `brightness(${1 + level / 255})`;
      if (panel.id === "center") {
        panel.style.transform = `translateZ(${30 + level / 10}px) scale(${scale})`;
      }
    });

    if (cover) {
      cover.style.transform = `scale(${1 + level / 255 * 0.06})`;
      cover.style.filter = `brightness(${1 + level / 255})`;
    }

    if (signature) {
      signature.style.transform = `scale(${1 + level / 255 * 0.04})`;
    }

    leds.forEach((led) => {
      led.classList.remove("god-led-boost");
      if (strong) led.classList.add("god-led-boost");
    });

    const status = document.getElementById("godModeStatus");
    if (status) {
      status.textContent =
        SystemState.mode === "radio" ? "GOD MODE / MAIN" :
        SystemState.mode === "backup" ? "GOD MODE / BACKUP" :
        SystemState.mode === "soundcloud" ? "GOD MODE / SC" :
        SystemState.mode === "youtube" ? "GOD MODE / YT" :
        "GOD MODE ACTIVE";
    }
  },

  maybeTriggerInsane(level, bass) {
    const now = Date.now();

    if (bass > 160 && now - this.lastKickTs > 120) {
      this.lastKickTs = now;
      this.kickStreak++;
    } else {
      this.kickStreak = Math.max(0, this.kickStreak - 0.25);
    }

    this.energy = this.energy * 0.88 + level * 0.12;

    if (this.kickStreak >= 3 && this.energy > 145 && now - this.lastInsaneTs > 2500) {
      this.lastInsaneTs = now;
      this.kickStreak = 0;
      this.triggerInsane();
    }
  },

  triggerInsane() {
    document.body.classList.add("insane-mode-flash");
    document.querySelectorAll(".god-panel").forEach((p) => p.classList.add("god-pulse"));
    setTimeout(() => {
      document.body.classList.remove("insane-mode-flash");
      document.querySelectorAll(".god-panel").forEach((p) => p.classList.remove("god-pulse"));
    }, 420);
  },

  tick() {
    const data = this.getData();
    if (!data) {
      requestAnimationFrame(() => this.tick());
      return;
    }

    const sum = data.reduce((a, b) => a + b, 0);
    const level = sum / data.length;
    const bass = this.getBass(data);

    this.pulseVisuals(level, bass);
    this.maybeTriggerInsane(level, bass);

    requestAnimationFrame(() => this.tick());
  },

  start() {
    if (!this.initialized) this.init();
    this.tick();
  }
};
