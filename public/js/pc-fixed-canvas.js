(() => {
  'use strict';

  /*
   * 666SOUNDsDESIGn — PC layout continuity controller.
   *
   * The former fixed 1720x980 canvas activated late in boot and replaced the
   * already rendered responsive player with a second geometry system. Keep the
   * existing file/loader as the canonical PC layout owner, but do not create a
   * fixed canvas anymore. This controller now only restores the documented
   * L-FX/R-FX state and lets the existing responsive CSS remain authoritative.
   */
  const DESKTOP_MIN = 761;
  const ADDON_LAYOUT_MIN = 1221;
  const STORAGE_KEY = 's666_pc_addon_fx_v128';

  let raf = 0;
  let fxState = readStoredState();

  function clamp(min, value, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isDesktop() {
    return window.matchMedia(`(min-width:${DESKTOP_MIN}px)`).matches;
  }

  function readStoredState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        left: parsed.left !== false,
        right: parsed.right !== false
      };
    } catch (_) {
      return { left: true, right: true };
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fxState));
    } catch (_) {}
  }

  function clearFixedCanvasState() {
    const root = document.documentElement;
    root.classList.remove('pc-fixed-canvas');
    root.style.removeProperty('--pc-canvas-scale');
    document.body?.style.removeProperty('--pc-scaled-height');
  }

  function addonNodes(side) {
    const left = side === 'left';
    return {
      panel: document.getElementById(left ? 'pcLeftFxAddon' : 'pcRightFxAddon'),
      button: document.getElementById(left ? 'pcLeftFxToggle' : 'pcRightFxToggle'),
      label: document.getElementById(left ? 'pcLeftFxState' : 'pcRightFxState')
    };
  }

  function applyAddonVisualState(side) {
    const enabled = fxState[side] !== false;
    const nodes = addonNodes(side);
    const body = document.body;

    body?.classList.toggle(`pc-${side}-addon-off`, !enabled);

    if (nodes.button) {
      nodes.button.classList.toggle('is-on', enabled);
      nodes.button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      nodes.button.dataset.state = enabled ? 'on' : 'off';
      nodes.button.title = `${side === 'left' ? 'Linke' : 'Rechte'} Add-on FX ${enabled ? 'ausblenden' : 'einblenden'}`;
    }

    if (nodes.label) nodes.label.textContent = enabled ? 'ON' : 'OFF';

    if (nodes.panel) {
      if (enabled) nodes.panel.style.removeProperty('display');
      else nodes.panel.style.setProperty('display', 'none', 'important');
      nodes.panel.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    }
  }

  function applyResponsivePlayerExpansion() {
    const player = document.querySelector('body[data-veluna-page="main"] .frame-stage .player-shell');
    if (!player) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const canExpand = isDesktop() && viewportWidth >= ADDON_LAYOUT_MIN;
    const leftOff = fxState.left === false;
    const rightOff = fxState.right === false;

    if (!canExpand || (!leftOff && !rightOff)) {
      player.style.removeProperty('width');
      player.style.removeProperty('max-width');
      player.style.removeProperty('transform');
      return;
    }

    const baseWidth = Math.min(viewportWidth * 0.56, 1080);
    const panelWidth = clamp(220, viewportWidth * 0.19 - 16, 300);
    const panelGap = clamp(7, viewportWidth * 0.0065, 12);
    const freedSide = panelWidth + panelGap;
    const meterWidth = clamp(54, viewportWidth * 0.037, 72);
    const viewportMax = Math.max(baseWidth, viewportWidth - meterWidth * 2 - 32);
    const requestedWidth = baseWidth + (leftOff ? freedSide : 0) + (rightOff ? freedSide : 0);
    const width = Math.min(requestedWidth, viewportMax);

    /* Shift by half of the one-sided expansion so the still-active side keeps
       its original edge. With both sides off the player remains centered. */
    let shift = 0;
    if (leftOff !== rightOff) {
      const actualExpansion = Math.max(0, width - baseWidth);
      shift = (rightOff ? 1 : -1) * actualExpansion / 2;
    }

    player.style.setProperty('width', `${width.toFixed(2)}px`, 'important');
    player.style.setProperty('max-width', `${width.toFixed(2)}px`, 'important');
    player.style.setProperty('transform', shift ? `translateX(${shift.toFixed(2)}px)` : 'none', 'important');
  }

  function applyLayout() {
    clearFixedCanvasState();
    applyAddonVisualState('left');
    applyAddonVisualState('right');
    applyResponsivePlayerExpansion();
  }

  function toggleAddon(side) {
    fxState = { ...fxState, [side]: fxState[side] === false };
    persistState();
    applyLayout();
  }

  function bindToggle(side) {
    const { button } = addonNodes(side);
    if (!button || button.dataset.s666FxBound === '1') return;
    button.dataset.s666FxBound = '1';
    button.addEventListener('click', () => toggleAddon(side));
  }

  function bind() {
    bindToggle('left');
    bindToggle('right');
    applyLayout();
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyLayout);
  }

  clearFixedCanvasState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
})();
