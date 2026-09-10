/*
==========================================
DATEI: external-player/js/shared-status.js
GEÄNDERT: 2026-09-10
ZWECK: Zentrale Zustandsumschaltung für Systempanel-LEDs.
ÄNDERUNG: STOP-IDLE-LOCK — wenn data-player-state="stopped" aktiv ist,
          werden alle oberen Cockpit-Status-LEDs neutralisiert. Separate
          Runtime-Owner (z. B. Worker/Watchdog/Govee/Discord/Admin) dürfen
          weiterarbeiten, können aber im STOP-Zustand keine aktive/blinkende
          LED mehr in die Header-Leiste schreiben.
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

const STOP_LOCKED_HEADER_LED_IDS = new Set([
  'statusStream',
  'statusBuffer',
  'statusSource',
  'statusMeta',
  'statusWorker',
  'statusAudio',
  'statusWatchdog',
  'statusReconnect',
  'statusMeter',
  'mainBtn',
  'fallbackBtn',
  'statusDiscord',
  'statusAdmin',
  'statusGovee'
]);

function isTransportStoppedForHeaderLed(el) {
  if (!el || !STOP_LOCKED_HEADER_LED_IDS.has(el.id)) return false;
  const rootState = String(document.documentElement?.getAttribute('data-player-state') || '').toLowerCase();
  const bodyState = String(document.body?.getAttribute('data-player-state') || '').toLowerCase();
  return rootState === 'stopped' || bodyState === 'stopped';
}

export function applyStatusChip(el, state = 'empty', tooltip = '') {
  if (!el) return;
  const requested = String(state || 'empty').toLowerCase();
  const normalized = isTransportStoppedForHeaderLed(el) ? 'empty' : requested;
  const nextClass = STATE_CLASS_MAP.get(normalized) || 'state-empty';

  ALL_STATE_CLASSES.forEach((className) => el.classList.remove(className));
  el.classList.add(nextClass);

  if (nextClass !== 'state-empty' && nextClass !== 'state-off') {
    el.classList.add('is-active');
  }

  el.setAttribute('data-led-state', nextClass.replace(/^state-/, ''));

  if (tooltip) el.title = tooltip;
}
