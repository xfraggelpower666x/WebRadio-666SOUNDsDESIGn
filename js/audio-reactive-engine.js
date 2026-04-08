
(() => {
  const WORKER_BASE = "https://666soundsdesign-radio-worker.fraggelpower666.workers.dev/api/radio";
  const STREAM_URL = `${WORKER_BASE}/stream`;
  const META_URL = `${WORKER_BASE}/metadata`;
  const HISTORY_URL = `${WORKER_BASE}/history`;
  const FALLBACK_COVER = "assets/fallback.jpg";
  const META_POLL_MS = 7000;

  const dom = {
    audio: document.getElementById("audioPlayer"),
    playBtn: document.getElementById("playBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    stopBtn: document.getElementById("stopBtn"),

    songTitle: document.getElementById("songTitle"),
    djValue: document.getElementById("djValue"),
    heroDj: document.getElementById("heroDj"),
    heroLive: document.getElementById("heroLive"),
    coverImage: document.getElementById("coverImage"),
    coverBlurImage: document.getElementById("coverBlurImage"),
    listenersValue: document.getElementById("listenersValue"),
    bitrateValue: document.getElementById("bitrateValue"),
    playerTrack: document.getElementById("playerTrack"),
    fallbackLine: document.getElementById("fallbackLine"),
    historyList: document.getElementById("historyList"),

    eqCanvas: document.getElementById("eqCanvas"),
    meterLCanvas: document.getElementById("meterLCanvas"),
    meterRCanvas: document.getElementById("meterRCanvas"),
  };

  function fetchJson(url, timeout = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .finally(() => clearTimeout(timer));
  }

  function normalizeMeta(data = {}) {
    const streamState = String(data.stream || "").toLowerCase();
    const djOnline = String(data.djstatus || "").toLowerCase() === "true";

    const isOffline = streamState === "offline";
    const isAutoDj = streamState === "autodj";
    const isLiveDj = streamState === "live" || djOnline;

    return {
      title: isOffline ? "Offline" : (data.song || "Live Stream"),
      dj: isOffline
        ? "Offline"
        : isLiveDj
          ? (data.djusername && data.djusername !== "false" ? data.djusername : "Live DJ")
          : "AutoDJ",
      cover: data.art && String(data.art).trim() ? data.art : FALLBACK_COVER,
      listeners: Number(data.listeners || 0) || 0,
      bitrate: data.bitrate || "0",
      modeLabel: isOffline ? "OFFLINE" : isLiveDj ? "LIVE DJ" : isAutoDj ? "AUTO DJ" : "LIVE STREAM",
    };
  }

  function applyMeta(meta) {
    if (dom.songTitle) dom.songTitle.textContent = meta.title;
    if (dom.djValue) dom.djValue.textContent = meta.dj;
    if (dom.heroDj) dom.heroDj.textContent = meta.dj;
    if (dom.heroLive) dom.heroLive.textContent = meta.modeLabel;
    if (dom.coverImage) dom.coverImage.src = meta.cover;
    if (dom.coverBlurImage) dom.coverBlurImage.src = meta.cover;
    if (dom.listenersValue) dom.listenersValue.textContent = String(meta.listeners);
    if (dom.bitrateValue) dom.bitrateValue.textContent = String(meta.bitrate);
    if (dom.playerTrack) dom.playerTrack.textContent = `${meta.dj} — ${meta.title}`;
    if (dom.fallbackLine) dom.fallbackLine.textContent = `Mode: ${meta.modeLabel}`;
  }

  function renderHistory(items = []) {
    if (!dom.historyList) return;
    if (!Array.isArray(items) || items.length === 0) {
      dom.historyList.innerHTML = `<div class="history-item">Keine History</div>`;
      return;
    }

    dom.historyList.innerHTML = items.slice(0, 8).map((item) => {
      const song = item.song || "Unknown Track";
      const dj = item.djusername || "AutoDJ";
      const ts = item.ts || "";
      return `
        <div class="history-item">
          <strong>${song}</strong>
          <span>${dj}</span>
          <small>${ts}</small>
        </div>
      `;
    }).join("");
  }

  class AudioReactiveEngine {
    constructor(audio, eqCanvas, meterLCanvas, meterRCanvas) {
      this.audio = audio;
      this.eqCanvas = eqCanvas;
      this.meterLCanvas = meterLCanvas;
      this.meterRCanvas = meterRCanvas;

      this.audioCtx = null;
      this.sourceNode = null;
      this.splitter = null;
      this.analyserMix = null;
      this.analyserL = null;
      this.analyserR = null;

      this.mixData = null;
      this.leftData = null;
      this.rightData = null;

      this.running = false;
      this.left = 0;
      this.right = 0;
      this.mix = 0;
      this.lastPeak = 0;
      this.raf = 0;

      this.eqCtx = this.eqCanvas ? this.eqCanvas.getContext("2d") : null;
      this.meterLCtx = this.meterLCanvas ? this.meterLCanvas.getContext("2d") : null;
      this.meterRCtx = this.meterRCanvas ? this.meterRCanvas.getContext("2d") : null;

      this.handleResize = this.handleResize.bind(this);
      this.frame = this.frame.bind(this);
    }

    ensureCanvasSize(canvas, ctx) {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    }

    handleResize() {
      this.ensureCanvasSize(this.eqCanvas, this.eqCtx);
      this.ensureCanvasSize(this.meterLCanvas, this.meterLCtx);
      this.ensureCanvasSize(this.meterRCanvas, this.meterRCtx);
    }

    async init() {
      if (!this.audio || this.audioCtx) return;

      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      this.audioCtx = new Ctx();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      this.splitter = this.audioCtx.createChannelSplitter(2);

      this.analyserMix = this.audioCtx.createAnalyser();
      this.analyserL = this.audioCtx.createAnalyser();
      this.analyserR = this.audioCtx.createAnalyser();

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const fftSize = isMobile ? 256 : 512;
      const smoothing = isMobile ? 0.78 : 0.84;

      [this.analyserMix, this.analyserL, this.analyserR].forEach((a) => {
        a.fftSize = fftSize;
        a.smoothingTimeConstant = smoothing;
      });

      this.sourceNode.connect(this.splitter);
      this.splitter.connect(this.analyserL, 0);
      this.splitter.connect(this.analyserR, 1);
      this.sourceNode.connect(this.analyserMix);
      this.sourceNode.connect(this.audioCtx.destination);

      this.mixData = new Uint8Array(this.analyserMix.frequencyBinCount);
      this.leftData = new Uint8Array(this.analyserL.fftSize);
      this.rightData = new Uint8Array(this.analyserR.fftSize);

      this.handleResize();
      window.addEventListener("resize", this.handleResize, { passive: true });
    }

    async resume() {
      await this.init();
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      if (!this.running) {
        this.running = true;
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
    }

    calculateRms(buffer) {
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const centered = (buffer[i] - 128) / 128;
        sum += centered * centered;
      }
      return Math.sqrt(sum / buffer.length);
    }

    smooth(prev, next, alpha = 0.82) {
      return prev * alpha + next * (1 - alpha);
    }

    drawMeter(ctx, canvas, value, side) {
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 22;
      const gap = 4;
      const barH = (h - gap * (bars - 1)) / bars;
      const active = Math.max(1, Math.round(value * bars));

      for (let i = 0; i < bars; i += 1) {
        const y = h - (i + 1) * barH - i * gap;
        const isActive = i < active;
        ctx.globalAlpha = isActive ? 0.95 : 0.14;
        const grad = ctx.createLinearGradient(0, y, w, y + barH);
        grad.addColorStop(0, "#00e5ff");
        grad.addColorStop(1, "#ff2fd1");
        ctx.fillStyle = grad;
        const inset = isActive ? 0 : 6;
        const drawX = side === "left" ? inset : 0;
        const drawW = side === "left" ? w - inset : w - inset;
        ctx.fillRect(drawX, y, drawW, barH);
      }
      ctx.globalAlpha = 1;
    }

    drawEq() {
      if (!this.eqCtx || !this.eqCanvas || !this.mixData) return;

      const ctx = this.eqCtx;
      const rect = this.eqCanvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.17;
      const outerRadius = Math.min(w, h) * 0.34;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);

      const bins = this.mixData.length;
      const usedBins = Math.min(bins, 96);

      for (let i = 0; i < usedBins; i += 1) {
        const val = this.mixData[i] / 255;
        const angle = (i / usedBins) * Math.PI * 2 - Math.PI / 2;
        const len = baseRadius + val * (outerRadius - baseRadius);

        const x1 = Math.cos(angle) * baseRadius;
        const y1 = Math.sin(angle) * baseRadius;
        const x2 = Math.cos(angle) * len;
        const y2 = Math.sin(angle) * len;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2 + val * 2.5;
        ctx.strokeStyle = i % 2 === 0 ? "#00e5ff" : "#ff2fd1";
        ctx.globalAlpha = 0.22 + val * 0.9;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.04 + this.mix * 12, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 47, 209, 0.32)";
      ctx.stroke();

      ctx.restore();
    }

    frame() {
      if (!this.running) return;

      if (this.analyserMix && this.analyserL && this.analyserR) {
        this.analyserMix.getByteFrequencyData(this.mixData);
        this.analyserL.getByteTimeDomainData(this.leftData);
        this.analyserR.getByteTimeDomainData(this.rightData);

        const nextLeft = this.calculateRms(this.leftData);
        const nextRight = this.calculateRms(this.rightData);

        let sum = 0;
        for (let i = 0; i < this.mixData.length; i += 1) sum += this.mixData[i];
        const nextMix = sum / (this.mixData.length * 255);

        this.left = this.smooth(this.left, nextLeft);
        this.right = this.smooth(this.right, nextRight);
        this.mix = this.smooth(this.mix, nextMix);
        this.lastPeak = Math.max(this.lastPeak * 0.94, this.mix);

        this.drawMeter(this.meterLCtx, this.meterLCanvas, this.left, "left");
        this.drawMeter(this.meterRCtx, this.meterRCanvas, this.right, "right");
        this.drawEq();

        document.documentElement.style.setProperty("--reactive-mix", String(this.mix.toFixed(4)));
        document.documentElement.style.setProperty("--reactive-peak", String(this.lastPeak.toFixed(4)));
      }

      this.raf = requestAnimationFrame(this.frame);
    }
  }

  const engine = new AudioReactiveEngine(
    dom.audio,
    dom.eqCanvas,
    dom.meterLCanvas,
    dom.meterRCanvas
  );

  async function updateMeta() {
    try {
      const raw = await fetchJson(META_URL, 5000);
      applyMeta(normalizeMeta(raw));
    } catch (err) {
      applyMeta(normalizeMeta({ stream: "offline", song: "Offline" }));
      console.error("Metadata failed:", err);
    }
  }

  async function updateHistory() {
    try {
      const raw = await fetchJson(HISTORY_URL, 5000);
      renderHistory(raw.history || []);
    } catch (err) {
      renderHistory([]);
      console.error("History failed:", err);
    }
  }

  async function updateAll() {
    await Promise.all([updateMeta(), updateHistory()]);
  }

  async function safePlay() {
    if (!dom.audio) return;
    try {
      await engine.resume();
      if (!dom.audio.src) dom.audio.src = STREAM_URL;
      await dom.audio.play();
    } catch (err) {
      console.error("Play failed:", err);
    }
  }

  function safePause() {
    if (!dom.audio) return;
    dom.audio.pause();
  }

  function safeStop() {
    if (!dom.audio) return;
    dom.audio.pause();
    try { dom.audio.currentTime = 0; } catch (_) {}
  }

  function bind() {
    if (!dom.audio) return;

    dom.audio.crossOrigin = "anonymous";
    dom.audio.preload = "none";
    dom.audio.setAttribute("playsinline", "true");
    dom.audio.setAttribute("webkit-playsinline", "true");
    dom.audio.src = STREAM_URL;

    dom.playBtn?.addEventListener("click", safePlay);
    dom.pauseBtn?.addEventListener("click", safePause);
    dom.stopBtn?.addEventListener("click", safeStop);

    ["touchstart", "pointerdown"].forEach((evt) => {
      window.addEventListener(evt, () => {
        engine.resume().catch(() => {});
      }, { passive: true, once: true });
    });

    dom.audio.addEventListener("play", () => {
      engine.resume().catch(() => {});
    });
  }

  function init() {
    bind();
    updateAll();
    setInterval(updateAll, META_POLL_MS);
  }

  init();
})();
