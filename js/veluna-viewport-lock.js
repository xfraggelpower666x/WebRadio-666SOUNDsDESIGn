/* VELUNA iPhone fullscreen geometry lock v1.2.30 */
(() => {
  'use strict';

  const root = document.documentElement;
  const state = { width: 0, height: 0, orientation: '' };
  let resizeTimer = 0;
  let layoutObserver = null;

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

  const clearStyles = (node, properties) => {
    if (!node) return;
    properties.forEach(property => node.style.removeProperty(property));
  };

  const placeInRow = (node, row) => {
    if (!node) return;
    node.style.setProperty('grid-row', String(row), 'important');
    node.style.setProperty('min-width', '0', 'important');
    node.style.setProperty('position', 'relative', 'important');
    node.style.setProperty('inset', 'auto', 'important');
    node.style.setProperty('margin', '0', 'important');
  };

  function clearSafeLayout() {
    const app = document.querySelector('.app-shell');
    const card = document.querySelector('.player-card');
    root.removeAttribute('data-veluna-iphone-safe');
    if (layoutObserver) {
      layoutObserver.disconnect();
      layoutObserver = null;
    }
    clearStyles(app, ['position','inset','width','height','padding','overflow']);
    clearStyles(card, [
      'position','top','right','bottom','left','width','height','min-height','max-height','margin','transform',
      'display','grid-template-columns','grid-template-rows','align-content','gap','padding','overflow'
    ]);
    for (const selector of [
      '.veluna-global-header','.status-grid','.pill-row','.display-block','.mini-grid','.source-switch',
      '.control-strip','.tool-strip','.action-bar','.levelmeter','.footer'
    ]) {
      clearStyles(card?.querySelector(selector), [
        'grid-row','min-width','position','inset','margin','height','min-height','max-height','display',
        'visibility','opacity','z-index','align-self','overflow'
      ]);
    }
    card?.querySelectorAll('.mini-box').forEach(node => clearStyles(node, ['min-height','display','visibility','opacity']));
    clearStyles(card?.querySelector('.display-window'), ['height','min-height','max-height','overflow']);
    clearStyles(card?.querySelector('.veluna-global-header img'), ['width','height','max-height','object-fit','object-position']);
  }

  function observeInjectedLayout(card) {
    if (!card || layoutObserver) return;
    layoutObserver = new MutationObserver(records => {
      if (!isMobileViewport()) return;
      const relevant = records.some(record => [...record.addedNodes].some(node =>
        node instanceof Element && (
          node.matches?.('.veluna-global-header,.veluna-volume-row,.veluna-bottom-brand') ||
          node.querySelector?.('.veluna-global-header,.veluna-volume-row,.veluna-bottom-brand')
        )
      ));
      if (relevant) scheduleApply(0, { force: true });
    });
    layoutObserver.observe(card, { childList: true, subtree: true });
  }

  function applySafeLayout(viewport) {
    const app = document.querySelector('.app-shell');
    const card = document.querySelector('.player-card');
    if (!app || !card || !isMobileViewport()) return;

    const compact = viewport.height < 720;
    const displayMinimum = compact ? 150 : 188;
    const spacerMinimum = 0;

    root.setAttribute('data-veluna-iphone-safe','1');
    root.style.setProperty('--veluna-safe-player-top','max(56px, calc(env(safe-area-inset-top) + 10px))');
    root.style.setProperty('--veluna-safe-player-bottom','max(1px, calc(env(safe-area-inset-bottom) - 12px))');

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
    card.style.setProperty('display','grid','important');
    card.style.setProperty('grid-template-columns','minmax(0,1fr)','important');
    card.style.setProperty(
      'grid-template-rows',
      `auto auto auto minmax(${displayMinimum}px,1fr) auto ${spacerMinimum}px auto auto auto auto auto auto`,
      'important'
    );
    card.style.setProperty('align-content','stretch','important');
    card.style.setProperty('gap',compact ? '3px' : '4px','important');
    card.style.setProperty('padding','6px','important');
    card.style.setProperty('overflow','hidden','important');

    const header = card.querySelector('.veluna-global-header');
    const headerImage = header?.querySelector('img');
    placeInRow(header, 1);
    if (header) {
      header.style.setProperty('height', compact ? 'clamp(94px,13dvh,124px)' : 'clamp(112px,15dvh,158px)', 'important');
      header.style.setProperty('min-height', compact ? '94px' : '112px', 'important');
      header.style.setProperty('max-height', compact ? '124px' : '158px', 'important');
      header.style.setProperty('overflow','hidden','important');
    }
    if (headerImage) {
      headerImage.style.setProperty('width','100%','important');
      headerImage.style.setProperty('height','100%','important');
      headerImage.style.setProperty('max-height','none','important');
      headerImage.style.setProperty('object-fit','contain','important');
      headerImage.style.setProperty('object-position','center','important');
    }

    const statusGrid = card.querySelector('.status-grid');
    const pillRow = card.querySelector('.pill-row');
    const displayBlock = card.querySelector('.display-block');
    const displayWindow = card.querySelector('.display-window');
    const miniGrid = card.querySelector('.mini-grid');
    const sourceSwitch = card.querySelector('.source-switch');
    const controlStrip = card.querySelector('.control-strip');
    const toolStrip = card.querySelector('.tool-strip');
    const actionBar = card.querySelector('.action-bar');
    const levelMeter = card.querySelector('.levelmeter');
    const footer = card.querySelector('.footer');

    placeInRow(statusGrid, 2);
    placeInRow(pillRow, 3);
    placeInRow(displayBlock, 4);
    placeInRow(miniGrid, 5);
    placeInRow(sourceSwitch, 7);
    placeInRow(controlStrip, 8);
    placeInRow(toolStrip, 9);
    placeInRow(actionBar, 10);
    placeInRow(levelMeter, 11);
    placeInRow(footer, 12);

    if (displayBlock) {
      displayBlock.style.setProperty('height','100%','important');
      displayBlock.style.setProperty('min-height',`${displayMinimum}px`,'important');
      displayBlock.style.setProperty('max-height','none','important');
      displayBlock.style.setProperty('overflow','hidden','important');
    }
    if (displayWindow) {
      displayWindow.style.setProperty('height','100%','important');
      displayWindow.style.setProperty('min-height',compact ? '124px' : '158px','important');
      displayWindow.style.setProperty('max-height','none','important');
      displayWindow.style.setProperty('overflow','hidden','important');
    }

    if (miniGrid) {
      miniGrid.style.setProperty('display','grid','important');
      miniGrid.style.setProperty('visibility','visible','important');
      miniGrid.style.setProperty('opacity','1','important');
      miniGrid.style.setProperty('min-height',compact ? '38px' : '44px','important');
      miniGrid.style.setProperty('z-index','4','important');
    }
    miniGrid?.querySelectorAll('.mini-box').forEach(node => {
      node.style.setProperty('display','flex','important');
      node.style.setProperty('visibility','visible','important');
      node.style.setProperty('opacity','1','important');
      node.style.setProperty('min-height',compact ? '36px' : '42px','important');
    });

    if (sourceSwitch) {
      sourceSwitch.style.setProperty('display','grid','important');
      sourceSwitch.style.setProperty('visibility','visible','important');
      sourceSwitch.style.setProperty('opacity','1','important');
      sourceSwitch.style.setProperty('z-index','4','important');
      sourceSwitch.style.setProperty('align-self','end','important');
    }

    const bottomBanner = card.querySelector('.veluna-bottom-brand');
    if (bottomBanner) bottomBanner.remove();
    observeInjectedLayout(card);
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