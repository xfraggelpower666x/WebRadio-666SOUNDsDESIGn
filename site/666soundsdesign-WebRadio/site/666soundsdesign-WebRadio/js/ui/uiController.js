
window.RadioUI = (() => {
  function buildDots(target, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("div");
      dot.className = "dot";
      target.appendChild(dot);
      out.push(dot);
    }
    return out;
  }

  function buildBars(target, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const bar = document.createElement("div");
      bar.className = "eq-bar";
      bar.style.height = "12px";
      target.appendChild(bar);
      out.push(bar);
    }
    return out;
  }

  function renderMeter(dots, value) {
    const active = Math.round(value * dots.length);
    dots.forEach((dot, index) => {
      dot.className = "dot";
      if (index < active) {
        if (index < dots.length * 0.45) dot.classList.add("on-low");
        else if (index < dots.length * 0.8) dot.classList.add("on-mid");
        else dot.classList.add("on-high");
      }
    });
  }

  function renderSpectrum(bars, freqData) {
    for (let i = 0; i < bars.length; i++) {
      const idx = Math.floor((i / bars.length) * freqData.length);
      const height = Math.max(12, (freqData[idx] / 255) * 120);
      bars[i].style.height = `${height}px`;
    }
  }

  function setLed(el, mode) {
    el.className = "led";
    if (mode === "off") el.classList.add("led-off");
    if (mode === "turquoise") el.classList.add("led-turquoise");
    if (mode === "green") el.classList.add("led-green");
  }

  return { buildDots, buildBars, renderMeter, renderSpectrum, setLed };
})();
