(() => {
  const audio = () => document.getElementById('audioPlayer');
  let started = false;

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

  function buildChain(){
    const a = audio();
    if (!a) return false;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    if (!window._audioCtx) {
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const eqNodes = [];
      let prev = src;

      const defs = (window.EQ7Band?.bands) || [];
      defs.forEach((b, idx) => {
        const f = ctx.createBiquadFilter();
        f.type = b.type || 'peaking';
        f.frequency.value = b.freq;
        f.Q.value = (idx === 0 || idx === defs.length - 1) ? 0.7 : 1.0;
        f.gain.value = b.gain || 0;
        prev.connect(f);
        prev = f;
        eqNodes.push(f);
      });

      const postGain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;

      prev.connect(postGain);
      postGain.connect(analyser);
      analyser.connect(ctx.destination);

      window._audioCtx = ctx;
      window._sourceNode = src;
      window._eqNodes = eqNodes;
      window._postGainNode = postGain;
      window._analyser = analyser;
      if (window.EQ7Band) window.EQ7Band.attach(eqNodes);
      if (window.SystemState) SystemState.set({
        eqChain: eqNodes.length ? '7-band attached' : 'eq missing',
        volumeNode: postGain ? 'postGain active' : 'postGain missing'
      });
    }
    return true;
  }

  function drawMeters(avg){
    ['meterLCanvas','meterRCanvas'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      fit(canvas, ctx);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      const bars = DeviceMode.mode === 'iphone' ? 12 : 18;
      const gap = 4;
      const barH = (h - gap * (bars - 1)) / bars;
      const active = Math.max(1, Math.round(avg * bars));
      ctx.clearRect(0,0,w,h);
      for (let i=0;i<bars;i++){
        const y = h - (i + 1) * barH - i * gap;
        ctx.globalAlpha = i < active ? 0.95 : 0.12;
        const grad = ctx.createLinearGradient(0,y,w,y+barH);
        grad.addColorStop(0,'#00e5ff');
        grad.addColorStop(1,'#ff2fd1');
        ctx.fillStyle = grad;
        ctx.fillRect(0,y,w,barH);
      }
      ctx.globalAlpha = 1;
    });
  }

  function drawEq(data){
    const canvas = document.getElementById('eqCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    fit(canvas, ctx);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const bars = DeviceMode.mode === 'iphone' ? 28 : 40;
    const barW = (w / bars) * 0.68;
    const gap = (w - bars * barW) / (bars + 1);
    ctx.clearRect(0,0,w,h);
    for (let i=0;i<bars;i++){
      const v = (data[i] || 0) / 255;
      const bh = Math.max(8, v * h * 0.9);
      const x = gap + i * (barW + gap);
      const y = h - bh;
      const grad = ctx.createLinearGradient(0,y,0,h);
      grad.addColorStop(0,'#55e8ff');
      grad.addColorStop(1,'#ff2fd1');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x,y,barW,bh);
    }
    ctx.globalAlpha = 1;
  }

  function frame(){
    const analyser = window._analyser;
    if (!analyser){ requestAnimationFrame(frame); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum=0; for(let i=0;i<data.length;i++) sum += data[i];
    const avg = (sum / data.length) / 255;
    drawMeters(avg);
    drawEq(data);
    if (avg > 0.35) document.body.classList.add('beat'); else document.body.classList.remove('beat');
    if (avg > 0.58) document.body.classList.add('drop'); else document.body.classList.remove('drop');
    requestAnimationFrame(frame);
  }

  window.AudioReactiveEngine = {
    async start(){
      if (!buildChain()) return false;
      if (window._audioCtx && window._audioCtx.state === 'suspended') await window._audioCtx.resume();
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
