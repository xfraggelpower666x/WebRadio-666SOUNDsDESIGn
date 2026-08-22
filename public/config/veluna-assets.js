/* Zentrale VELUNA-Asset-, Branding- und Shared-Infrastructure-Quelle. */
window.VELUNA_ASSETS = Object.freeze({
  release: 'FULLVERSION_CENTRAL_REACTIVE_VISUAL_POLICY_v1.2.30',
  version: '1.2.30',
  endpoint: '/veluna',
  background: '/assets/veluna/background/veluna-player-background.webp',
  header: '/assets/veluna/header/veluna-player-header.webp',
  fallbackCover: '/assets/veluna/covers/veluna-stream-fallback.webp',
  appIcon: '/assets/veluna/icons/icon-512x512.png',
  bottomBanner: '/assets/veluna/banner/veluna-bottom-banner.webp',
  splashWebm: '/assets/veluna/splash/veluna-loading-splash.webm',
  splashMp4: '/assets/veluna/splash/veluna-loading-splash.mp4',
  bootBackground: '/assets/boot-screen/lyvra-radio-boot.jpg',
  bootTemplate: '/components/boot-screen/boot-screen.html',
  manifest: '/veluna.webmanifest'
});

/*
 * Shared infrastructure bootstrap v181.
 * Wird von 666 PLAYER, VELUNA und internem Notfallplayer geladen.
 * Lädt designneutral: zentralen Radio-Bootscreen, Overlay-Safe-Area,
 * zentrale Audio-/Gerätepolicy und Artwork-Priorität.
 */
(() => {
  'use strict';
  const version = '2026-08-17-native-mute-ticker-v185';
  const bootVersion = '2026-08-12-unified-lockscreen-boot-v3';
  const discordRecoveryVersion = '2026-08-21-discord-startup-recovery-v1';
  const mainVisualRepairVersion = '2026-08-22-history-panel-anchor-cyan-left-v4';
  const head = document.head || document.documentElement;
  if (!head) return;

  const installAudioGraphBridge = () => {
    if (window.__SMFPAudioGraphBridge) return window.__SMFPAudioGraphBridge;
    const graphs = new WeakMap();
    const graphFor = audio => {
      if (!audio) return null;
      let graph = graphs.get(audio);
      if (!graph) {
        graph = { audio, context:null, source:null, gains:[], filters:[], limiter:null, analyser:null };
        graphs.set(audio, graph);
      }
      return graph;
    };
    const nodeType = node => {
      const name = String(node?.constructor?.name || '');
      if (/BiquadFilter/i.test(name) || (node?.frequency && node?.gain && typeof node.type === 'string')) return 'filter';
      if (/DynamicsCompressor/i.test(name) || (node?.threshold && node?.ratio && node?.attack)) return 'limiter';
      if (/Analyser/i.test(name) || (typeof node?.fftSize === 'number' && typeof node?.getByteFrequencyData === 'function')) return 'analyser';
      if (/GainNode/i.test(name) || (node?.gain && !node?.frequency && !node?.threshold)) return 'gain';
      return 'other';
    };
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const AudioNodeCtor = window.AudioNode;
      if (Ctx?.prototype && AudioNodeCtor?.prototype) {
        const nativeCreateSource = Ctx.prototype.createMediaElementSource;
        if (nativeCreateSource && !nativeCreateSource.__smfpWrapped) {
          const wrappedCreateSource = function(media) {
            const source = nativeCreateSource.call(this, media);
            source.__smfpBridgeAudio = media;
            const graph = graphFor(media);
            graph.context = this;
            graph.source = source;
            return source;
          };
          wrappedCreateSource.__smfpWrapped = true;
          wrappedCreateSource.__smfpBridgeWrapped = true;
          Ctx.prototype.createMediaElementSource = wrappedCreateSource;
        }
        const nativeConnect = AudioNodeCtor.prototype.connect;
        if (nativeConnect && !nativeConnect.__smfpWrapped) {
          const wrappedConnect = function(destination) {
            const result = nativeConnect.apply(this, arguments);
            try {
              const audio = this.__smfpBridgeAudio;
              if (audio && destination) {
                destination.__smfpBridgeAudio = audio;
                const graph = graphFor(audio);
                graph.context = this.context || destination.context || graph.context;
                const type = nodeType(destination);
                if (type === 'gain' && !graph.gains.includes(destination)) graph.gains.push(destination);
                if (type === 'filter' && !graph.filters.includes(destination)) graph.filters.push(destination);
                if (type === 'limiter') graph.limiter = destination;
                if (type === 'analyser') graph.analyser = destination;
              }
            } catch (_) {}
            return result;
          };
          wrappedConnect.__smfpWrapped = true;
          wrappedConnect.__smfpBridgeWrapped = true;
          AudioNodeCtor.prototype.connect = wrappedConnect;
        }
      }
    } catch (_) {}
    window.__SMFPAudioGraphBridge = Object.freeze({ version:'1.0.0', graphFor });
    return window.__SMFPAudioGraphBridge;
  };
  installAudioGraphBridge();

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

  const loadCurrentScript = (src, marker, ready) => new Promise((resolve, reject) => {
    if (typeof ready === 'function' && ready()) { resolve(); return; }
    const pending = Array.from(document.scripts).find(script => script.dataset.smfpCurrentRuntime === marker);
    if (pending) {
      pending.addEventListener('load', () => resolve(), { once:true });
      pending.addEventListener('error', reject, { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = false;
    script.async = false;
    script.dataset[marker] = 'js';
    script.dataset.smfpCurrentRuntime = marker;
    script.addEventListener('load', () => resolve(), { once:true });
    script.addEventListener('error', reject, { once:true });
    head.appendChild(script);
  });

  loadStyle(`/css/central-boot-screen.css?v=${bootVersion}`, 'smfpCentralRadioBoot');
  void loadCurrentScript(`/js/central-boot-screen.js?v=${bootVersion}`,'smfpCentralRadioBoot',() => !!window.S666CentralBootScreen).catch(() => {});
  loadStyle(`/core/overlay/overlay-core.css?v=${version}`, 'smfpOverlayCore');
  loadStyle(`/css/audio-policy-core.css?v=${version}`, 'smfpAudioPolicy');
  loadStyle(`/css/all-player-mute.css?v=${version}`, 's666AllPlayerMute');
  loadStyle(`/css/main-player-visual-repair-20260821.css?v=${mainVisualRepairVersion}`, 's666MainVisualRepair');
  const activateOverlay = () => { try { window.SMFPOverlayCore?.updateViewport?.(); window.SMFPOverlayCore?.scanOverlays?.(document); } catch (_) {} };
  void loadScript(`/core/overlay/overlay-core.js?v=${version}`,'smfpOverlayCore',() => !!window.SMFPOverlayCore).then(activateOverlay).catch(() => {});
  const audioReady = () => !!window.SMFPBoostCore?.centralPolicyVersion;
  const policyReady = () => !!window.SMFPAudioPolicyUI;
  const artworkReady = () => !!window.SMFPArtworkCore;
  const muteReady = () => !!window.S666AllPlayerMute?.version;
  const discordRecoveryReady = () => !!window.S666DiscordStartupRecovery?.version;
  void loadCurrentScript(`/js/boost-core.js?v=${version}`, 'smfpBoostCore', audioReady).then(() => loadScript(`/js/audio-policy-core.js?v=${version}`, 'smfpAudioPolicy', policyReady)).then(() => { try { window.SMFPAudioPolicyUI?.activate?.(); } catch (_) {} }).catch(() => {});
  void loadScript(`/js/all-player-mute.js?v=${version}`, 's666AllPlayerMute', muteReady).then(() => { try { window.S666AllPlayerMute?.sync?.(); } catch (_) {} }).catch(() => {});
  void loadScript(`/js/artwork-core.js?v=${version}`, 'smfpArtworkCore', artworkReady).then(() => { try { window.SMFPArtworkCore?.enforce?.(); } catch (_) {} }).catch(() => {});
  void loadScript(`/js/discord-startup-autopost-recovery.js?v=${discordRecoveryVersion}`,'s666DiscordStartupRecovery',discordRecoveryReady).catch(() => {});
})();
