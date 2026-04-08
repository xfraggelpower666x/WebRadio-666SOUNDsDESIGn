/**
 * 666SOUNDsDESIGn — AUTO BOOST PRO ENGINE (FULL VERSION)
 * Mobile + iPhone optimized
 * Bidirectional Smart Gain (Up + Down)
 */

window.AutoBoostPro = {
  target: 0.72,          // Ziel-Lautheit (0–1)
  attack: 0.02,          // schneller hochregeln
  release: 0.005,        // langsamer runterregeln
  maxGain: 1.6,          // Max Boost
  minGain: 0.6,          // Min Limit
  currentGain: 1.0,
  enabled: true,

  debug: false,

  getAnalyser() {
    return window._analyser || null;
  },

  getGainNode() {
    return window._gainNode || null;
  },

  computeLevel(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return (sum / data.length) / 255;
  },

  process(avg) {
    let diff = this.target - avg;

    if (diff > 0) {
      // zu leise → schneller hoch
      this.currentGain += diff * this.attack;
    } else {
      // zu laut → langsamer runter (smooth)
      this.currentGain += diff * this.release;
    }

    this.currentGain = Math.max(this.minGain, Math.min(this.maxGain, this.currentGain));
  },

  apply() {
    const gainNode = this.getGainNode();
    if (!gainNode) return;

    gainNode.gain.value = this.currentGain;
  },

  loop() {
    if (!this.enabled) {
      requestAnimationFrame(() => this.loop());
      return;
    }

    const analyser = this.getAnalyser();
    const gainNode = this.getGainNode();

    if (!analyser || !gainNode) {
      requestAnimationFrame(() => this.loop());
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const avg = this.computeLevel(data);

    this.process(avg);
    this.apply();

    if (this.debug) {
      console.log("AUTO BOOST", {
        level: avg.toFixed(3),
        gain: this.currentGain.toFixed(3)
      });
    }

    requestAnimationFrame(() => this.loop());
  },

  start() {
    this.enabled = true;
    this.loop();
  },

  stop() {
    this.enabled = false;
  },

  setTarget(v) {
    this.target = Math.max(0.4, Math.min(0.9, v));
  },

  setRange(min, max) {
    this.minGain = min;
    this.maxGain = max;
  }
};