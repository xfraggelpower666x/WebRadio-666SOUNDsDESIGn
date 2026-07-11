(() => {
  'use strict';

  const DESKTOP_MIN = 761;
  const CANVAS_WIDTH = 1720;
  const CANVAS_HEIGHT = 980;
  const EDGE_X = 18;
  const EDGE_Y = 18;
  const MAX_SCALE = 1.08;

  let raf = 0;

  function isDesktop() {
    return window.matchMedia(`(min-width:${DESKTOP_MIN}px)`).matches;
  }

  function applyFixedCanvas() {
    const root = document.documentElement;
    if (!isDesktop()) {
      root.classList.remove('pc-fixed-canvas');
      root.style.removeProperty('--pc-canvas-scale');
      document.body?.style.removeProperty('--pc-scaled-height');
      return;
    }

    const viewportWidth = Math.max(320, window.innerWidth || root.clientWidth || CANVAS_WIDTH);
    const viewportHeight = Math.max(320, window.innerHeight || root.clientHeight || CANVAS_HEIGHT);
    const widthScale = (viewportWidth - EDGE_X * 2) / CANVAS_WIDTH;
    const heightScale = (viewportHeight - EDGE_Y * 2) / CANVAS_HEIGHT;
    const scale = Math.max(0.42, Math.min(MAX_SCALE, widthScale, heightScale));

    root.classList.add('pc-fixed-canvas');
    root.style.setProperty('--pc-canvas-scale', scale.toFixed(5));
    document.body?.style.setProperty('--pc-scaled-height', `${Math.ceil(CANVAS_HEIGHT * scale + 24)}px`);
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyFixedCanvas);
  }

  document.addEventListener('DOMContentLoaded', applyFixedCanvas, { once: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  applyFixedCanvas();
})();
