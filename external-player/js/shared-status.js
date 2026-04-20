/*
==========================================
DATEI: external-player/js/shared-status.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Zentrale Zustandsumschaltung für STR/META/SRC-Chips.
ÄNDERUNG: Tooltip- und Farbzustände für Main/Backup/API/Error/External zentral gehalten.
==========================================
*/
const STATE_CLASS_MAP = {
  main: 'state-main',
  backup: 'state-backup',
  api: 'state-api',
  fallback: 'state-fallback',
  external: 'state-external',
  internal: 'state-internal',
  error: 'state-error'
};

export function applyStatusChip(el, state, tooltip) {
  if (!el) return;
  Object.values(STATE_CLASS_MAP).forEach((className) => el.classList.remove(className));
  el.classList.add(STATE_CLASS_MAP[state] || STATE_CLASS_MAP.error);
  if (tooltip) el.title = tooltip;
}
