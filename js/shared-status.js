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

const STATE_CLASS_MAP = new Map([
  ['ok', 'state-main'],
  ['main', 'state-main'],
  ['live', 'state-main'],
  ['playing', 'state-main'],
  ['ready', 'state-main'],
  ['online', 'state-main'],
  ['active', 'state-main'],
  ['good', 'state-main'],
  ['stable', 'state-main'],
  ['backup', 'state-backup'],
  ['fallback', 'state-fallback'],
  ['api', 'state-api'],
  ['external', 'state-external'],
  ['internal', 'state-internal'],
  ['aux', 'state-api'],
  ['source', 'state-external'],
  ['warn', 'state-warn'],
  ['warning', 'state-warn'],
  ['buffer', 'state-warn'],
  ['degraded', 'state-warn'],
  ['paused', 'state-paused'],
  ['stopped', 'state-stopped'],
  ['error', 'state-error'],
  ['offline', 'state-error'],
  ['bad', 'state-error'],
  ['failed', 'state-error'],
  ['red', 'state-error'],
  ['empty', 'state-empty'],
  ['off', 'state-off'],
  ['idle', 'state-empty'],
  ['inactive', 'state-empty'],
  ['standby', 'state-empty']
]);

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
  const nextClass = STATE_CLASS_MAP.get(normalized) || 'state-empty';

  ALL_STATE_CLASSES.forEach((className) => el.classList.remove(className));
  el.classList.add(nextClass);

  if (nextClass !== 'state-empty' && nextClass !== 'state-off') {
    el.classList.add('is-active');
  }

  el.setAttribute('data-led-state', nextClass.replace(/^state-/, ''));

  if (tooltip) el.title = tooltip;
}
