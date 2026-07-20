/* VELUNA iPhone fullscreen geometry lock v1.2.27 */
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
    return {
      width: Math.max(1, Math.round(visual?.width || root.clientWidth || innerWidth || screen.width)),
      height: Math.max(1, Math.round(visual?.height || root.clientHeight || innerHeight || screen.height)),
      left: Math.max(0, Math.round(visual?.offsetLeft || 0)),
      top: Math.max(0, Math.round(visual?.offsetTop || 0))
    };
  };

  function clearSafeLayout() {
    const app = document.querySelector('.app-shell');
    const card = document.querySelector('.player-card');
    root.removeAttribute('data-veluna-iphone-safe');
    if (app) ['position','inset','width','height','padding','overflow'].forEach(property => app.style.removeProperty(property));
    if (card) ['position','top','right','bottom','left','width','height','min-height','max-height','margin','transform'].forEach(property => card.style.removeProperty(property));
  }

  function applySafeLayout(viewport) {
    const app = document.querySelector('.app-shell');
    const card = document.querySelector('.player-card');
    if (!app || !card || !isMobileViewport()) return;

    root.setAttribute('data-veluna-iphone-safe','1');
    root.style.setProperty('--veluna-safe-player-top','max(56px, calc(env(safe-area-inset-top) + 10px))');
    root.style.setProperty('--veluna-safe-player-bottom','max(7px, env(safe-area-inset-bottom))');

    app.style.setProperty('position','fixed','important');
    app.style.setProperty('inset','0','important');
    app.style.setProperty('width',`${viewport.width}px`,'important');
    app.style.setProperty('height',`${viewport.height}px`,'important');
    app.style.setProperty('padding','0','important');
    app.style.setProperty('overflow','hidden','important');

    card.style.setProperty('position','absolute','important');
    card.style.setProperty('top','var(--veluna-safe-player-top)','important');
    card.style.setProperty('right','max(5px, env(safe-area-inset-right))','important');
    card.style.setProperty('bottom','var(--veluna-safe-player-bottom)','important');
    card.style.setProperty('left','max(5px, env(safe-area-inset-left))','important');
    card.style.setProperty('width','auto','important');
    card.style.setProperty('height','auto','important');
    card.style.setProperty('min-height','0','important');
    card.style.setProperty('max-height','none','important');
    card.style.setProperty('margin','0','important');
    card.style.setProperty('transform','none','important');

    const header = card.querySelector('.veluna-global-header');
    const headerImage = header?.querySelector('img');
    if (header) {
      header.style.setProperty('height','clamp(108px, 18dvh, 188px)','important');
      header.style.setProperty('min-height','108px','important');
      header.style.setProperty('max-height','188px','important');
      header.style.setProperty('margin','0 auto 5px','important');
    }
    if (headerImage) {
      headerImage.style.setProperty('width','100%','important');
      headerImage.style.setProperty('height','100%','important');
      headerImage.style.setProperty('max-height','none','important');
      headerImage.style.setProperty('object-fit','contain','important');
      headerImage.style.setProperty('object-position','center','important');
    }

    const displayBlock = card.querySelector('.display-block');
    const displayWindow = card.querySelector('.display-window');
    if (displayBlock) {
      displayBlock.style.setProperty('min-height','clamp(170px, 27dvh, 280px)','important');
      displayBlock.style.setProperty('height','auto','important');
    }
    if (displayWindow) {
      displayWindow.style.setProperty('min-height','clamp(138px, 23dvh, 238px)','important');
      displayWindow.style.setProperty('height','100%','important');
      displayWindow.style.setProperty('max-height','none','important');
    }
  }

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
    root.style.removeProperty('--veluna-safe-player-top');
    root.style.removeProperty('--veluna-safe-player-bottom');
    clearSafeLayout();
  }

  function writeGeometry(viewport, orientation) {
    state.width = viewport.width;
    state.height = viewport.height;
    state.orientation = orientation;
    root.style.setProperty('--veluna-fixed-vw', `${viewport.width}px`);
    root.style.setProperty('--veluna-fixed-vh', `${viewport.height}px`);
    root.style.setProperty('--veluna-fixed-left', `${viewport.left}px`);
    root.style.setProperty('--veluna-fixed-top', `${viewport.top}px`);
    root.setAttribute('data-veluna-fixed-viewport', orientation);
    applySafeLayout(viewport);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function apply({ force = false } = {}) {
    if (!isMobileViewport()) {
      clearDesktopLock();
      return;
    }

    const orientation = orientationKey();
    const viewport = readViewport();
    const orientationChanged = state.orientation && state.orientation !== orientation;
    if (keyboardOpen() && !orientationChanged && !force) return;

    if (!state.width || !state.height || orientationChanged || force) {
      writeGeometry(viewport, orientation);
      return;
    }

    if (Math.abs(viewport.width - state.width) >= 2 || Math.abs(viewport.height - state.height) >= 2) {
      writeGeometry(viewport, orientation);
    } else {
      applySafeLayout(viewport);
    }
  }

  function scheduleApply(delay = 80, options = {}) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => apply(options), delay);
  }

  apply({ force: true });
  document.addEventListener('DOMContentLoaded', () => apply({ force:true }), { once: true });
  addEventListener('pageshow', event => apply({ force: Boolean(event.persisted) }), { passive: true });
  addEventListener('orientationchange', () => scheduleApply(420, { force: true }), { passive: true });
  screen.orientation?.addEventListener?.('change', () => scheduleApply(420, { force: true }));
  addEventListener('resize', () => scheduleApply(80), { passive: true });
  window.visualViewport?.addEventListener('resize', () => scheduleApply(80), { passive: true });
  window.visualViewport?.addEventListener('scroll', () => scheduleApply(120), { passive: true });

  document.addEventListener('focusin', () => root.setAttribute('data-veluna-keyboard-open', '1'), true);
  document.addEventListener('focusout', () => {
    root.removeAttribute('data-veluna-keyboard-open');
    requestAnimationFrame(() => window.scrollTo(0, 0));
    scheduleApply(260, { force:true });
  }, true);

  window.VELUNA_FIXED_VIEWPORT = Object.freeze({
    refresh: () => apply({ force: true }),
    current: () => ({ ...state })
  });
})();
