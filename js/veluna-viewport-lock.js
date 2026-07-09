/* VELUNA iPhone fixed fullscreen geometry lock v1.2.10 */
(() => {
  'use strict';
  const root = document.documentElement;
  const state = { width: 0, height: 0, orientation: '' };
  const isMobileViewport = () => matchMedia('(max-width: 768px)').matches || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width || 0, screen.height || 0) <= 768);
  const orientationKey = () => {
    const type = screen.orientation && screen.orientation.type;
    if (type) return type.startsWith('landscape') ? 'landscape' : 'portrait';
    return innerWidth > innerHeight ? 'landscape' : 'portrait';
  };
  const readViewport = () => {
    const width = Math.max(1, Math.round(document.documentElement.clientWidth || window.innerWidth || screen.width));
    const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || screen.height));
    return { width, height };
  };
  function apply(force = false) {
    if (!isMobileViewport()) {
      root.removeAttribute('data-veluna-fixed-viewport');
      root.style.removeProperty('--veluna-fixed-vw');
      root.style.removeProperty('--veluna-fixed-vh');
      return;
    }
    const orientation = orientationKey();
    if (!force && state.width && state.orientation === orientation) return;
    const viewport = readViewport();
    state.width = viewport.width;
    state.height = viewport.height;
    state.orientation = orientation;
    root.style.setProperty('--veluna-fixed-vw', `${state.width}px`);
    root.style.setProperty('--veluna-fixed-vh', `${state.height}px`);
    root.style.setProperty('--veluna-fixed-left', '0px');
    root.style.setProperty('--veluna-fixed-top', '0px');
    root.setAttribute('data-veluna-fixed-viewport', orientation);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  apply(true);
  document.addEventListener('DOMContentLoaded', () => apply(false), { once: true });
  addEventListener('pageshow', event => { if (event.persisted) apply(true); else apply(false); }, { passive: true });
  addEventListener('orientationchange', () => setTimeout(() => apply(true), 420), { passive: true });
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(() => apply(true), 420));
  addEventListener('resize', () => {
    if (!isMobileViewport()) apply(true);
    else if (orientationKey() !== state.orientation) setTimeout(() => apply(true), 220);
  }, { passive: true });
  document.addEventListener('focusin', () => root.setAttribute('data-veluna-keyboard-open', '1'), true);
  document.addEventListener('focusout', () => { root.removeAttribute('data-veluna-keyboard-open'); requestAnimationFrame(() => window.scrollTo(0, 0)); }, true);
  window.VELUNA_FIXED_VIEWPORT = Object.freeze({ refresh: () => apply(true), current: () => ({...state}) });
})();
