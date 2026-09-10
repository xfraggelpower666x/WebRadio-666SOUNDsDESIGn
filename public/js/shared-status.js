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
ÄNDERUNG: SOURCE-LABEL-LOCK — Main/Backup-Chips besitzen hier die kanonische
          sichtbare Bezeichnung M / B. Alte Legacy-Owner dürfen H/Hauptstream
          nicht mehr dauerhaft zurückschreiben.
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

const CANONICAL_SOURCE_LABELS = Object.freeze({
  mainBtn: { code: 'M', title: 'Main Stream' },
  fallbackBtn: { code: 'B', title: 'Backup Stream' }
});

function enforceCanonicalSourceLabel(el) {
  if (!el) return;
  const canonical = CANONICAL_SOURCE_LABELS[el.id];
  if (!canonical) return;
  const code = el.querySelector?.('.status-code') || el;
  if (code && code.textContent !== canonical.code) code.textContent = canonical.code;
  if (el.title !== canonical.title) el.title = canonical.title;
  if (el.getAttribute('aria-label') !== canonical.title) el.setAttribute('aria-label', canonical.title);
}

function installCanonicalSourceLabelLock() {
  const bind = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    enforceCanonicalSourceLabel(el);
    const target = el.querySelector?.('.status-code') || el;
    if (!target || typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver(() => enforceCanonicalSourceLabel(el));
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  };
  bind('mainBtn');
  bind('fallbackBtn');
}

function isTransportStoppedForHeaderLed(el) {
  if (!el || !STOP_LOCKED_HEADER_LED_IDS.has(el.id)) return false;
  const rootState = String(document.documentElement?.getAttribute('data-player-state') || '').toLowerCase();
  const bodyState = String(document.body?.getAttribute('data-player-state') || '').toLowerCase();
  return rootState === 'stopped' || bodyState === 'stopped';
}

export function applyStatusChip(el, state = 'empty', tooltip = '') {
  if (!el) return;
  enforceCanonicalSourceLabel(el);
  const requested = String(state || 'empty').toLowerCase();
  const normalized = isTransportStoppedForHeaderLed(el) ? 'empty' : requested;
  const nextClass = STATE_CLASS_MAP.get(normalized) || 'state-empty';

  ALL_STATE_CLASSES.forEach((className) => el.classList.remove(className));
  el.classList.add(nextClass);

  if (nextClass !== 'state-empty' && nextClass !== 'state-off') {
    el.classList.add('is-active');
  }

  el.setAttribute('data-led-state', nextClass.replace(/^state-/, ''));

  if (tooltip && !CANONICAL_SOURCE_LABELS[el.id]) el.title = tooltip;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installCanonicalSourceLabelLock, { once: true });
} else {
  installCanonicalSourceLabelLock();
}
