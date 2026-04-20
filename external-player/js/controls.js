/*
==========================================
DATEI: external-player/js/controls.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-20
ZWECK: Text- und Button-Helfer für den externen Player.
ÄNDERUNG: Quellbuttons auf kompakte M/B-Buttons umgestellt.
==========================================
*/
export function setText(el, text) {
  if (el) el.textContent = text;
}

export function markSourceButtons(mainBtn, fallbackBtn, source) {
  mainBtn?.classList.toggle('is-active', source === 'main');
  fallbackBtn?.classList.toggle('is-active', source === 'fallback');
}
