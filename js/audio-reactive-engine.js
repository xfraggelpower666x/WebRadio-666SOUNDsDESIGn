(() => {
  const audio = () => document.getElementById("audioPlayer");
  let started = false;

  function ensureGraph(){
    const a = audio();
    if (!a) return false;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!window._audioCtx) {
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      window._audioCtx = ctx;
      window._gainNode = gain;
      window._analyser = analyser;
    }
    return true;
  }

  function fit(canvas, ctx){
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(dpr, dpr);
    }
  }

  function drawMeters(avg){
    const ids = ["meterLCanvas","meterRCanvas"];
    ids.forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      fit(canvas, ctx);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.clearRect(0,0,w,h);
      const bars = DeviceMode.mode === "iphone" ? 12 : 18;
      const gap = 4;
      const barH = (h - gap * (bars - 1)) / bars;
      const active = Math.max(1, Math.round(avg * bars));
      for (let i=0;i<bars;i++){
        const y = h - (i + 1) * barH - i * gap;
        ctx.globalAlpha = i < active ? 0.95 : 0.12;
        const grad = ctx.createLinearGradient(0, y, w, y + barH);
        grad.addColorStop(0, "#00e5ff");
        grad.addColorStop(1, "#ff2fd1");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, barH);
      }
      ctx.globalAlpha = 1;
    });
  }

  function drawEq(data){
    const canvas = document.getElementById("eqCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    fit(canvas, ctx);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0,0,w,h);

    if (DeviceMode.mode === "iphone") {
      const bars = Math.min(28, data.length);
      const barW = (w / bars) * 0.68;
      const gap = (w - bars * barW) / (bars + 1);
      for (let i=0;i<bars;i++){
        const v = data[i] / 255;
        const bh = Math.max(8, v * h * 0.9);
        const x = gap + i * (barW + gap);
        const y = h - bh;
        const grad = ctx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, "#55e8ff");
        grad.addColorStop(1, "#ff2fd1");
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y, barW, bh);
      }
      ctx.globalAlpha = 1;
    } else {
      const cx = w/2, cy = h/2, base = Math.min(w,h) * 0.18;
      let sum = 0; for (let i=0;i<data.length;i++) sum += data[i];
      const avg = (sum / data.length) / 255;
      ctx.beginPath();
      ctx.arc(cx, cy, base + 10 + avg * 22, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(85,232,255,.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const bars = Math.min(48, data.length);
      for (let i=0;i<bars;i++){
        const v = data[i]/255;
        const angle = (i/bars)*Math.PI*2 - Math.PI/2;
        const inner = base + 8;
        const outer = inner + 14 + v*38;
        const x1 = cx + Math.cos(angle)*inner;
        const y1 = cy + Math.sin(angle)*inner;
        const x2 = cx + Math.cos(angle)*outer;
        const y2 = cy + Math.sin(angle)*outer;
        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? "#55e8ff" : "#ff42d9";
        ctx.lineWidth = 2;
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
      }
    }
  }

  function frame(){
    const analyser = window._analyser;
    if (!analyser) { requestAnimationFrame(frame); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i=0;i<data.length;i++) sum += data[i];
    const avg = (sum / data.length) / 255;
    drawMeters(avg);
    drawEq(data);
    if (avg > 0.35) document.body.classList.add("live-beat-pulse");
    else document.body.classList.remove("live-beat-pulse");
    if (avg > 0.58) document.body.classList.add("live-drop-flash");
    else document.body.classList.remove("live-drop-flash");
    requestAnimationFrame(frame);
  }

  window.AudioReactiveEngine = {
    async start(){
      if (!ensureGraph()) return false;
      if (window._audioCtx && window._audioCtx.state === "suspended") {
        await window._audioCtx.resume();
      }
      if (window.AutoBoostPro && !window.__autoBoostStarted) {
        window.__autoBoostStarted = true;
        window.AutoBoostPro.start();
      }
      if (!started) {
        started = true;
        frame();
      }
      return true;
    }
  };
})();
