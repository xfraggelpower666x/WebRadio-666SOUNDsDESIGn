/* VELUNA stable iPhone fullscreen geometry lock v1.3.0 */
(() => {
  'use strict';

  const root = document.documentElement;
  const state = { width: 0, height: 0, cssHeight: '', orientation: '', locked: false };
  let orientationTimer = 0;
  let layoutObserver = null;

  const isMobileViewport = () =>
    matchMedia('(max-width: 768px)').matches ||
    (matchMedia('(pointer: coarse)').matches && Math.min(screen.width || 0, screen.height || 0) <= 768);

  const orientationKey = () => {
    const type = screen.orientation && screen.orientation.type;
    if (type) return type.startsWith('landscape') ? 'landscape' : 'portrait';
    return innerWidth > innerHeight ? 'landscape' : 'portrait';
  };

  const readStableScreen = () => {
    const width = Math.max(1, Math.round(root.clientWidth || innerWidth || screen.width));
    const height = Math.max(1, Math.round(innerHeight || root.clientHeight || screen.height));
    return {
      width,
      height,
      cssHeight: CSS.supports?.('height', '100lvh') ? '100lvh' : `${height}px`
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
    clearStyles(app, ['position','inset','width','height','min-height','max-height','padding','overflow']);
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
      if (relevant) requestAnimationFrame(() => applyStableLayout());
    });
    layoutObserver.observe(card, { childList: true, subtree: true });
  }

  function applyStableLayout() {
    const app = document.querySelector('.app-shell');
    const card = document.querySelector('.player-card');
    if (!app || !card || !isMobileViewport() || !state.locked) return;

    const compact = state.height < 720;
    // Protect the LYVRA artwork/title area; reclaim height from chrome, not from the display row.
    const displayMinimum = compact ? 150 : 188;

    root.setAttribute('data-veluna-iphone-safe','1');
    root.setAttribute('data-veluna-stable-fullscreen','1');
    root.style.setProperty('--veluna-safe-player-top','max(56px, calc(env(safe-area-inset-top) + 10px))');
    root.style.setProperty('--veluna-safe-player-bottom','max(66px, calc(env(safe-area-inset-bottom) + 30px))');
    root.style.setProperty('--veluna-stable-screen-width', `${state.width}px`);
    root.style.setProperty('--veluna-stable-screen-height', `${state.height}px`);

    app.style.setProperty('position','fixed','important');
    app.style.setProperty('inset','0','important');
    app.style.setProperty('width','100vw','important');
    app.style.setProperty('height',state.cssHeight,'important');
    app.style.setProperty('min-height',state.cssHeight,'important');
    app.style.setProperty('max-height',state.cssHeight,'important');
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
      `auto auto auto minmax(${displayMinimum}px,1fr) auto 0px auto auto auto auto auto auto`,
      'important'
    );
    card.style.setProperty('align-content','stretch','important');
    card.style.setProperty('gap',compact ? '3px' : '3px','important');
    card.style.setProperty('padding','5px','important');
    card.style.setProperty('overflow','hidden','important');

    const header = card.querySelector('.veluna-global-header');
    const headerImage = header?.querySelector('img');
    placeInRow(header, 1);
    if (header) {
      header.style.setProperty('height', compact ? 'clamp(94px,13svh,124px)' : 'clamp(104px,14svh,148px)', 'important');
      header.style.setProperty('min-height', compact ? '94px' : '104px', 'important');
      header.style.setProperty('max-height', compact ? '124px' : '148px', 'important');
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
      miniGrid.style.setProperty('min-height',compact ? '38px' : '42px','important');
      miniGrid.style.setProperty('z-index','4','important');
    }
    miniGrid?.querySelectorAll('.mini-box').forEach(node => {
      node.style.setProperty('display','flex','important');
      node.style.setProperty('visibility','visible','important');
      node.style.setProperty('opacity','1','important');
      node.style.setProperty('min-height',compact ? '36px' : '40px','important');
    });
    if (sourceSwitch) {
      sourceSwitch.style.setProperty('display','grid','important');
      sourceSwitch.style.setProperty('visibility','visible','important');
      sourceSwitch.style.setProperty('opacity','1','important');
      sourceSwitch.style.setProperty('z-index','4','important');
      sourceSwitch.style.setProperty('align-self','end','important');
    }
    card.querySelector('.veluna-bottom-brand')?.remove();
    observeInjectedLayout(card);
  }

  function lockGeometry({ reset = false } = {}) {
    if (!isMobileViewport()) {
      state.width = 0;
      state.height = 0;
      state.cssHeight = '';
      state.orientation = '';
      state.locked = false;
      root.removeAttribute('data-veluna-fixed-viewport');
      root.removeAttribute('data-veluna-stable-fullscreen');
      root.removeAttribute('data-veluna-keyboard-open');
      root.style.removeProperty('--veluna-safe-player-top');
      root.style.removeProperty('--veluna-safe-player-bottom');
      root.style.removeProperty('--veluna-stable-screen-width');
      root.style.removeProperty('--veluna-stable-screen-height');
      clearSafeLayout();
      return;
    }
    const orientation = orientationKey();
    if (!reset && state.locked && state.orientation === orientation) {
      applyStableLayout();
      return;
    }
    const screenBox = readStableScreen();
    state.width = screenBox.width;
    state.height = screenBox.height;
    state.cssHeight = screenBox.cssHeight;
    state.orientation = orientation;
    state.locked = true;
    root.setAttribute('data-veluna-fixed-viewport', orientation);
    applyStableLayout();
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function scheduleOrientationLock(delay = 420) {
    clearTimeout(orientationTimer);
    orientationTimer = setTimeout(() => lockGeometry({ reset: true }), delay);
  }

  lockGeometry({ reset: true });
  document.addEventListener('DOMContentLoaded', () => lockGeometry(), { once: true });
  addEventListener('pageshow', () => lockGeometry(), { passive: true });
  addEventListener('orientationchange', () => scheduleOrientationLock(), { passive: true });
  screen.orientation?.addEventListener?.('change', () => scheduleOrientationLock());

  document.addEventListener('focusin', () => root.setAttribute('data-veluna-keyboard-open', '1'), true);
  document.addEventListener('focusout', () => {
    root.removeAttribute('data-veluna-keyboard-open');
    requestAnimationFrame(() => window.scrollTo(0, 0));
    lockGeometry();
  }, true);

  window.VELUNA_FIXED_VIEWPORT = Object.freeze({
    refresh: () => lockGeometry(),
    resetForOrientation: () => lockGeometry({ reset: true }),
    current: () => ({ ...state })
  });
})();
