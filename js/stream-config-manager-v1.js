/*
  666SOUNDsDESIGn — STREAM CONFIG MANAGER V1
  Build: v35.7.0
  Zweck:
  - Player lädt aktive Stream-Konfiguration aus config/radio-runtime.json.
  - Main bleibt Main, Backup bleibt manuell, Fallback bleibt vorhanden.
  - Keine Secrets. Kein Worker-Eingriff. Keine Shooter-Änderung.
*/
const DEFAULT_ENDPOINTS = Object.freeze({
  main: '/stream',
  fallback: '/fallback-stream',
  emergency: '',
  metadata: '/api/nowplaying',
  health: '/health'
});
const CONFIG_URL = '/config/radio-runtime.json';
const BUILD = (window.SMFP_VERSION && (window.SMFP_VERSION.cacheBust || window.SMFP_VERSION.build)) || window.__S666_CACHE_BURST__ || 'v35.7.0-2026-06-04-task7-stream-config-manager';
let runtimeConfig = null;
let activeEndpoints = { ...DEFAULT_ENDPOINTS };
let lastLoad = { ok: false, source: 'default', error: null, loadedAt: 0 };

function safeString(value) {
  return String(value || '').trim();
}

function isAllowedStreamUrl(value) {
  const v = safeString(value);
  if (!v) return false;
  if (v.startsWith('/')) return true;
  try {
    const url = new URL(v, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function pickUrl(value, fallback) {
  const v = safeString(value);
  return isAllowedStreamUrl(v) ? v : fallback;
}

function normalizeConfig(config) {
  const cfg = config && typeof config === 'object' ? config : {};
  const next = {
    main: pickUrl(cfg.primaryStream || cfg.mainStream || cfg.streamUrl || cfg.stream_url, DEFAULT_ENDPOINTS.main),
    fallback: pickUrl(cfg.backupStream || cfg.fallbackStream || cfg.backupUrl || cfg.fallback_stream_url, DEFAULT_ENDPOINTS.fallback),
    emergency: pickUrl(cfg.emergencyStream || cfg.emergencyUrl, DEFAULT_ENDPOINTS.emergency),
    metadata: pickUrl(cfg.metadataUrl || cfg.metadata_url, DEFAULT_ENDPOINTS.metadata),
    health: pickUrl(cfg.healthUrl || cfg.health_url, DEFAULT_ENDPOINTS.health)
  };

  // Main darf niemals leer werden. Backup bleibt mindestens der bestehende Worker-Fallback.
  if (!next.main) next.main = DEFAULT_ENDPOINTS.main;
  if (!next.fallback) next.fallback = DEFAULT_ENDPOINTS.fallback;
  return next;
}

function applyDomState() {
  try {
    const root = document.documentElement;
    root.setAttribute('data-stream-config-manager-v1', lastLoad.ok ? 'active' : 'default');
    root.setAttribute('data-stream-config-source', lastLoad.source || 'default');
    root.setAttribute('data-stream-config-main', activeEndpoints.main || DEFAULT_ENDPOINTS.main);
    root.setAttribute('data-stream-config-backup', activeEndpoints.fallback || DEFAULT_ENDPOINTS.fallback);
    root.setAttribute('data-stream-config-metadata', activeEndpoints.metadata || DEFAULT_ENDPOINTS.metadata);
    root.setAttribute('data-stream-config-health', activeEndpoints.health || DEFAULT_ENDPOINTS.health);
    root.setAttribute('data-stream-config-loaded-at', String(lastLoad.loadedAt || 0));
    if (lastLoad.error) root.setAttribute('data-stream-config-error', String(lastLoad.error));
    else root.removeAttribute('data-stream-config-error');
  } catch (err) {}
}

async function loadStreamConfig(options = {}) {
  const force = !!options.force;
  if (!force && lastLoad.loadedAt && Date.now() - lastLoad.loadedAt < 30000) return getState();
  const url = `${CONFIG_URL}?cb=${encodeURIComponent(BUILD)}&t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`config_http_${res.status}`);
    const cfg = await res.json();
    runtimeConfig = cfg;
    activeEndpoints = normalizeConfig(cfg);
    lastLoad = { ok: true, source: 'config/radio-runtime.json', error: null, loadedAt: Date.now() };
  } catch (err) {
    runtimeConfig = null;
    activeEndpoints = { ...DEFAULT_ENDPOINTS };
    lastLoad = { ok: false, source: 'default-endpoints', error: err && err.message ? err.message : String(err), loadedAt: Date.now() };
  }
  applyDomState();
  try { window.dispatchEvent(new CustomEvent('smfp:stream-config-ready', { detail: getState() })); } catch (err) {}
  return getState();
}

function getEndpoints() {
  return { ...activeEndpoints };
}

function getEndpoint(name) {
  const key = name === 'backup' ? 'fallback' : name;
  return activeEndpoints[key] || DEFAULT_ENDPOINTS[key] || '';
}

function getState() {
  return {
    ok: !!lastLoad.ok,
    source: lastLoad.source,
    error: lastLoad.error,
    loadedAt: lastLoad.loadedAt,
    config: runtimeConfig,
    endpoints: getEndpoints(),
    defaults: { ...DEFAULT_ENDPOINTS }
  };
}

const api = { load: loadStreamConfig, reload: () => loadStreamConfig({ force: true }), getState, getEndpoints, getEndpoint, defaults: { ...DEFAULT_ENDPOINTS } };
window.SMFPStreamConfigManagerV1 = api;
window.SMFPStreamConfigManager = api;
applyDomState();

export { DEFAULT_ENDPOINTS, loadStreamConfig, getEndpoints, getEndpoint, getState };
