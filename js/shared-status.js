/*
==========================================
DATEI: external-player/js/shared-status.js
GEÄNDERT: 2026-04-30
ZWECK: Zentrale Zustandsumschaltung für STR/META/SRC/H/B-Chips.
ÄNDERUNG: v59 PC LED STATE LOGIC FIX REPAIRED.
FARBLOGIK:
- ok / main / api / external / active / playing / ready / online = türkis
- warn / error / stopped / paused / offline / bad = pink
- empty / off / idle / inactive / standby = leerer weißer Kreis
==========================================
*/

const OK_STATES = new Set(['ok', 'main', 'api', 'external', 'active', 'playing', 'ready', 'online']);
const WARN_STATES = new Set(['warn', 'error', 'stopped', 'paused', 'offline', 'bad']);
const EMPTY_STATES = new Set(['empty', 'off', 'idle', 'inactive', 'standby']);

const ALL_STATE_CLASSES = [
  'state-main',
  'state-backup',
  'state-api',
  'state-fallback',
  'state-external',
  'state-internal',
  'state-error',
  'state-ok',
  'state-warn',
  'state-empty',
  'state-stopped',
  'state-paused',
  'state-off',
  'is-active'
];

export function applyStatusChip(el, state = 'empty', tooltip = '') {
  if (!el) return;
  const normalized = String(state || 'empty').toLowerCase();
  const nextTooltip = String(tooltip || '');
  if (el.getAttribute('data-status-chip-state-v120') === normalized &&
      el.getAttribute('data-status-chip-tooltip-v120') === nextTooltip) {
    return;
  }
  el.setAttribute('data-status-chip-state-v120', normalized);
  el.setAttribute('data-status-chip-tooltip-v120', nextTooltip);

  ALL_STATE_CLASSES.forEach((className) => el.classList.remove(className));

  if (OK_STATES.has(normalized)) {
    el.classList.add('state-ok', 'is-active');
    el.setAttribute('data-led-state', 'ok');
  } else if (WARN_STATES.has(normalized)) {
    el.classList.add(normalized === 'stopped' ? 'state-stopped' : normalized === 'paused' ? 'state-paused' : 'state-warn');
    el.setAttribute('data-led-state', 'warn');
  } else if (EMPTY_STATES.has(normalized)) {
    el.classList.add('state-empty');
    el.setAttribute('data-led-state', 'empty');
  } else {
    el.classList.add('state-empty');
    el.setAttribute('data-led-state', 'empty');
  }

  if (tooltip) el.title = tooltip;
}
