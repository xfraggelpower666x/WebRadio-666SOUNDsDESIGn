/*
==========================================
DATEI: external-player/js/controls.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Text- und Button-Helfer.
ÄNDERUNG: M/B-Steuerung und kleine Text-Updates unverändert zentral gehalten.
==========================================
*/
export function setText(el, text) {
  if (el) el.textContent = text;
}

export function markSourceButtons(mainBtn, fallbackBtn, source) {
  mainBtn?.classList.toggle('is-active', source === 'main');
  fallbackBtn?.classList.toggle('is-active', source === 'fallback');
}
