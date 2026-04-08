/**
 * AUTO BOOST PRO ENGINE
 * Bidirectional Smart Gain (Up + Down)
 */

window.AutoBoostPro = {
  target: 0.72,          // target loudness
  attack: 0.02,          // how fast it reacts
  release: 0.005,        // how slow it relaxes
  maxGain: 1.6,
  minGain: 0.6,
  currentGain: 1.0,
  enabled: true,

  loop() {
    const analyser = window._analyser;
    const gainNode = window._gainNode;
    if (!analyser || !gainNode || !this.enabled) {
      requestAnimationFrame(() => this.loop());
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = (sum / data.length) / 255;

    let diff = this.target - avg;

    if (diff > 0) {
      this.currentGain += diff * this.attack;
    } else {
      this.currentGain += diff * this.release;
    }

    this.currentGain = Math.max(this.minGain, Math.min(this.maxGain, this.currentGain));

    gainNode.gain.value = this.currentGain;

    requestAnimationFrame(() => this.loop());
  },

  start() {
    this.enabled = true;
    this.loop();
  },

  stop() {
    this.enabled = false;
  }
};
