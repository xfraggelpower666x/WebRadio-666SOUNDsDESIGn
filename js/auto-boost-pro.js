window.AutoBoostPro = {
  target:0.72,
  attack:0.02,
  release:0.005,
  maxGain:1.6,
  minGain:0.6,
  currentGain:1.0,
  enabled:true,
  getAnalyser(){ return window._analyser || null; },
  getGainNode(){ return window._gainNode || null; },
  computeLevel(data){
    let sum = 0;
    for (let i=0;i<data.length;i++) sum += data[i];
    return (sum / data.length) / 255;
  },
  loop(){
    if (!this.enabled) { requestAnimationFrame(()=>this.loop()); return; }
    const analyser = this.getAnalyser();
    const gainNode = this.getGainNode();
    if (!analyser || !gainNode) { requestAnimationFrame(()=>this.loop()); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = this.computeLevel(data);
    const diff = this.target - avg;
    this.currentGain += diff * (diff > 0 ? this.attack : this.release);
    this.currentGain = Math.max(this.minGain, Math.min(this.maxGain, this.currentGain));
    gainNode.gain.value = this.currentGain;
    requestAnimationFrame(()=>this.loop());
  },
  start(){ this.enabled = true; this.loop(); },
  stop(){ this.enabled = false; }
};
