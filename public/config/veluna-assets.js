/* Zentrale VELUNA-Asset-, Branding- und Shared-Infrastructure-Quelle. */
window.VELUNA_ASSETS = Object.freeze({
  release: 'FULLVERSION_CENTRAL_AUDIO_ARTWORK_POLICY_v1.2.29',
  version: '1.2.29',
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
 * Shared infrastructure bootstrap v180.
 * Wird von 666 PLAYER, VELUNA und internem Notfallplayer geladen.
 * Lädt designneutral: Overlay-Safe-Area, zentrale Audio-/Gerätepolicy und Artwork-Priorität.
 */
(() => {
  'use strict';
  const version = '2026-07-22-central-audio-artwork-v180';
  const head = document.head || document.documentElement;
  if (!head) return;

  const loadStyle = (href, marker) => {
    if (document.querySelector(`link[href*="${href.split('?')[0]}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[marker] = 'css';
    head.appendChild(link);
  };

  const loadScript = (src, marker, ready) => new Promise((resolve, reject) => {
    if (typeof ready === 'function' && ready()) { resolve(); return; }
    const base = src.split('?')[0];
    const existing = Array.from(document.scripts).find(script => script.src && script.src.includes(base));
    if (existing) {
      if (typeof ready === 'function' && ready()) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once:true });
      existing.addEventListener('error', reject, { once:true });
      setTimeout(resolve, 1200);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset[marker] = 'js';
    script.addEventListener('load', () => resolve(), { once:true });
    script.addEventListener('error', reject, { once:true });
    head.appendChild(script);
  });

  loadStyle(`/core/overlay/overlay-core.css?v=${version}`, 'smfpOverlayCore');
  loadStyle(`/css/audio-policy-core.css?v=${version}`, 'smfpAudioPolicy');

  const activateOverlay = () => {
    try {
      window.SMFPOverlayCore?.updateViewport?.();
      window.SMFPOverlayCore?.scanOverlays?.(document);
    } catch (_) {}
  };

  void loadScript(
    `/core/overlay/overlay-core.js?v=${version}`,
    'smfpOverlayCore',
    () => !!window.SMFPOverlayCore
  ).then(activateOverlay).catch(() => {});

  const audioReady = () => !!window.SMFPBoostCore?.centralPolicyVersion;
  const policyReady = () => !!window.SMFPAudioPolicyUI;
  const artworkReady = () => !!window.SMFPArtworkCore;

  void loadScript(`/js/boost-core.js?v=${version}`, 'smfpBoostCore', audioReady)
    .then(() => loadScript(`/js/audio-policy-core.js?v=${version}`, 'smfpAudioPolicy', policyReady))
    .then(() => {
      try { window.SMFPAudioPolicyUI?.activate?.(); } catch (_) {}
    })
    .catch(() => {});

  void loadScript(`/js/artwork-core.js?v=${version}`, 'smfpArtworkCore', artworkReady)
    .then(() => {
      try { window.SMFPArtworkCore?.enforce?.(); } catch (_) {}
    })
    .catch(() => {});
})();
