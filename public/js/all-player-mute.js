/*
 * 666SOUNDsDESIGn — Shared All-Player Mute Control
 * Scope: Main, mobile, VELUNA and internal fallback player.
 * Contract: toggle only HTMLMediaElement.muted; never rewrite volume, boost, EQ or audio graph.
 */
(() => {
  'use strict';

  if (window.S666AllPlayerMute?.version) return;

  const VERSION = '1.0.0';
  const BUTTON_ID = 's666MuteButton';
  let boundAudio = null;
  let observer = null;

  const findAudio = () => {
    const direct = document.getElementById('radio');
    if (direct instanceof HTMLMediaElement) return direct;
    return document.querySelector('audio,video');
  };

  const findHost = () => {
    const selectors = [
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
    let button = document.getElementById(BUTTON_ID);
    if (button) return button;

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

    findHost().appendChild(button);
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
        if (!document.getElementById(BUTTON_ID) || findAudio() !== boundAudio) bindAudio();
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
