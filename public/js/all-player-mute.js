/*
 * 666SOUNDsDESIGn — Shared All-Player Mute Control
 * Scope: Main, mobile, VELUNA and internal fallback player.
 * Contract: toggle only HTMLMediaElement.muted; never rewrite volume, boost, EQ or audio graph.
 */
(() => {
  'use strict';

  if (window.S666AllPlayerMute?.version) return;

  const VERSION = '1.1.0';
  const BUTTON_ID = 's666MuteButton';
  let boundAudio = null;
  let observer = null;

  const findAudio = () => {
    const direct = document.getElementById('radio');
    if (direct instanceof HTMLMediaElement) return direct;
    return document.querySelector('audio,video');
  };

  const isMobilePlayer = () => {
    try { return window.matchMedia('(max-width: 860px)').matches; }
    catch (_) { return window.innerWidth <= 860; }
  };

  const findHost = () => {
    if (isMobilePlayer()) {
      const mobileControls = document.querySelector('#mffApp .mff-controls');
      if (mobileControls) return mobileControls;
    }

    const mainControls = document.querySelector('.player-shell .bottom-console .control-toolbar');
    if (mainControls) return mainControls;

    const selectors = [
      '.tool-strip',
      '.control-strip',
      '[data-transport-controls]',
      '.transport-controls',
      '.player-controls',
      '.bottom-controls',
      '.mobile-controls',
      '.controls',
      '.transport-row',
      '.control-row'
    ];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) return node;
    }
    return document.body || document.documentElement;
  };

  const ensureButton = () => {
    const nativeButton = document.getElementById('muteBtn');
    if (nativeButton) {
      nativeButton.setAttribute('data-s666-mute-control', '1');
      return nativeButton;
    }

    const host = findHost();
    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 's666-mute-button';
      button.setAttribute('data-s666-mute-control', '1');
      button.setAttribute('aria-label', 'Mute audio');
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<span class="s666-mute-icon" aria-hidden="true">🔊</span><span class="s666-mute-label">MUTE</span>';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const audio = bindAudio();
        if (!audio) return;
        audio.muted = !audio.muted;
        syncButton(audio);
      });
    }

    if (host && button.parentElement !== host) host.appendChild(button);
    return button;
  };

  const syncButton = (audio = boundAudio) => {
    const button = ensureButton();
    const muted = !!audio?.muted;
    button.classList.toggle('is-muted', muted);
    button.setAttribute('aria-pressed', muted ? 'true' : 'false');
    button.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
    const icon = button.querySelector('.s666-mute-icon');
    const label = button.querySelector('.s666-mute-label');
    if (icon) icon.textContent = muted ? '🔇' : '🔊';
    if (label) label.textContent = muted ? 'SOUND' : 'MUTE';
    document.documentElement.toggleAttribute('data-s666-muted', muted);
  };

  const onVolumeChange = () => syncButton(boundAudio);

  function bindAudio() {
    const audio = findAudio();
    if (!audio) {
      ensureButton().disabled = true;
      return null;
    }

    const button = ensureButton();
    button.disabled = false;

    if (audio !== boundAudio) {
      boundAudio?.removeEventListener?.('volumechange', onVolumeChange);
      boundAudio = audio;
      boundAudio.addEventListener('volumechange', onVolumeChange);
    }
    syncButton(boundAudio);
    return boundAudio;
  }

  const mount = () => {
    ensureButton();
    bindAudio();
    if (!observer && document.documentElement) {
      observer = new MutationObserver(() => {
        ensureButton();
        if (findAudio() !== boundAudio) bindAudio();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  window.S666AllPlayerMute = Object.freeze({
    version: VERSION,
    get muted() { return !!boundAudio?.muted; },
    toggle() {
      const audio = bindAudio();
      if (!audio) return false;
      audio.muted = !audio.muted;
      syncButton(audio);
      return audio.muted;
    },
    sync: bindAudio
  });
})();
