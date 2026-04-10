window.VisualBoostPro = {

  analyser: null,
  data: null,
  lastDrop: 0,

  init() {
    this.analyser = window._analyser;
    if (!this.analyser) return;

    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.loop();
  },

  loop() {
    this.analyser.getByteFrequencyData(this.data);

    let bass = 0;
    for (let i = 0; i < 10; i++) bass += this.data[i];
    bass /= 10;

    if (bass > 160 && Date.now() - this.lastDrop > 2000) {
      this.lastDrop = Date.now();
      this.triggerDrop();
    }

    requestAnimationFrame(() => this.loop());
  },

  triggerDrop() {
    document.body.classList.add("drop-explosion");
    setTimeout(() => {
      document.body.classList.remove("drop-explosion");
    }, 300);
  }
};