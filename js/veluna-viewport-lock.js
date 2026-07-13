/* VELUNA iPhone fullscreen geometry lock v1.2.20 */
(() => {
  'use strict';

  const root = document.documentElement;
  const state = { width: 0, height: 0, orientation: '' };
  let resizeTimer = 0;

  const isMobileViewport = () =>
    matchMedia('(max-width: 768px)').matches ||
    (matchMedia('(pointer: coarse)').matches && Math.min(screen.width || 0, screen.height || 0) <= 768);

  const orientationKey = () => {
    const type = screen.orientation && screen.orientation.type;
    if (type) return type.startsWith('landscape') ? 'landscape' : 'portrait';
    return innerWidth > innerHeight ? 'landscape' : 'portrait';
  };

  const keyboardOpen = () => {
    const active = document.activeElement;
    return Boolean(active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
  };

  const readViewport = () => {
    const visual = window.visualViewport;
    const width = Math.max(
      1,
      Math.round(
        document.documentElement.clientWidth ||
        window.innerWidth ||
        visual?.width ||
        screen.width
      )
    );
    const height = Math.max(
      1,
      Math.round(
        window.innerHeight ||
        document.documentElement.clientHeight ||
        visual?.height ||
        screen.height
      )
    );
    return { width, height };
  };

  function clearDesktopLock() {
    state.width = 0;
    state.height = 0;
    state.orientation = '';
    root.removeAttribute('data-veluna-fixed-viewport');
    root.removeAttribute('data-veluna-keyboard-open');
    root.style.removeProperty('--veluna-fixed-vw');
    root.style.removeProperty('--veluna-fixed-vh');
    root.style.removeProperty('--veluna-fixed-left');
    root.style.removeProperty('--veluna-fixed-top');
  }

  function writeGeometry(width, height, orientation) {
    state.width = width;
    state.height = height;
    state.orientation = orientation;
    root.style.setProperty('--veluna-fixed-vw', `${width}px`);
    root.style.setProperty('--veluna-fixed-vh', `${height}px`);
    root.style.setProperty('--veluna-fixed-left', '0px');
    root.style.setProperty('--veluna-fixed-top', '0px');
    root.setAttribute('data-veluna-fixed-viewport', orientation);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function apply({ force = false, allowGrow = true } = {}) {
    if (!isMobileViewport()) {
      clearDesktopLock();
      return;
    }

    const orientation = orientationKey();
    const viewport = readViewport();
    const orientationChanged = state.orientation && state.orientation !== orientation;

    if (keyboardOpen() && !orientationChanged && !force) return;

    if (!state.width || !state.height || orientationChanged || force) {
      writeGeometry(viewport.width, viewport.height, orientation);
      return;
    }

    /*
     * Safari verändert die nutzbare Höhe, wenn Adress-/Werkzeugleisten ein- oder
     * ausgeblendet werden. Der alte Lock ignorierte diese Vergrößerung vollständig
     * und ließ unten einen schwarzen Restbereich. Innerhalb derselben Ausrichtung
     * übernehmen wir deshalb jede echte Vergrößerung, schrumpfen aber nicht bei
     * Tastatur oder wieder eingeblendeten Browserleisten.
     */
    const nextWidth = Math.max(state.width, viewport.width);
    const nextHeight = allowGrow ? Math.max(state.height, viewport.height) : viewport.height;
    if (Math.abs(nextWidth - state.width) >= 2 || Math.abs(nextHeight - state.height) >= 2) {
      writeGeometry(nextWidth, nextHeight, orientation);
    }
  }

  function scheduleApply(delay = 80, options = {}) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => apply(options), delay);
  }

  apply({ force: true });
  document.addEventListener('DOMContentLoaded', () => apply(), { once: true });
  addEventListener('pageshow', event => apply({ force: Boolean(event.persisted) }), { passive: true });

  addEventListener('orientationchange', () => scheduleApply(420, { force: true, allowGrow: false }), { passive: true });
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', () => scheduleApply(420, { force: true, allowGrow: false }));
  }

  addEventListener('resize', () => scheduleApply(80), { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => scheduleApply(80), { passive: true });
    window.visualViewport.addEventListener('scroll', () => scheduleApply(120), { passive: true });
  }

  document.addEventListener('focusin', () => root.setAttribute('data-veluna-keyboard-open', '1'), true);
  document.addEventListener('focusout', () => {
    root.removeAttribute('data-veluna-keyboard-open');
    requestAnimationFrame(() => window.scrollTo(0, 0));
    scheduleApply(260);
  }, true);

  window.VELUNA_FIXED_VIEWPORT = Object.freeze({
    refresh: () => apply({ force: true, allowGrow: false }),
    current: () => ({ ...state })
  });
})();
