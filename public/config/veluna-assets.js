/* Zentrale VELUNA-Asset-, Branding- und Shared-Infrastructure-Quelle. */
window.VELUNA_ASSETS = Object.freeze({
  release: 'FULLVERSION_SHARED_IPHONE_AUDIO_START_v1.2.17',
  version: '1.2.17',
  endpoint: '/veluna',
  background: '/assets/veluna/background/veluna-player-background.webp',
  header: '/assets/veluna/header/veluna-player-header.webp',
  fallbackCover: '/assets/veluna/covers/veluna-stream-fallback.webp',
  appIcon: '/assets/veluna/icons/icon-512x512.png',
  bottomBanner: '/assets/veluna/banner/veluna-bottom-banner.webp',
  splashWebm: '/assets/veluna/splash/veluna-loading-splash.webm',
  splashMp4: '/assets/veluna/splash/veluna-loading-splash.mp4',
  manifest: '/veluna.webmanifest'
});

/*
 * Shared overlay bootstrap v179.
 * Wird von 666 PLAYER, VELUNA und internem Notfallplayer geladen.
 * Lädt nur den bestehenden designneutralen Overlay-Core; erzeugt kein eigenes Menü oder Theme.
 */
(() => {
  'use strict';
  const version = '2026-07-20-safe-area-v179';
  const head = document.head || document.documentElement;
  if (!head) return;

  if (!document.querySelector('link[href*="/core/overlay/overlay-core.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/core/overlay/overlay-core.css?v=${version}`;
    link.dataset.smfpOverlayCore = 'css';
    head.appendChild(link);
  }

  const activate = () => {
    try {
      window.SMFPOverlayCore?.updateViewport?.();
      window.SMFPOverlayCore?.scanOverlays?.(document);
    } catch (_) {}
  };

  if (window.SMFPOverlayCore) {
    activate();
    return;
  }
  if (document.querySelector('script[src*="/core/overlay/overlay-core.js"],script[src*="/js/overlay-core.js"]')) return;

  const script = document.createElement('script');
  script.src = `/core/overlay/overlay-core.js?v=${version}`;
  script.defer = true;
  script.dataset.smfpOverlayCore = 'js';
  script.addEventListener('load', activate, { once:true });
  head.appendChild(script);
})();
