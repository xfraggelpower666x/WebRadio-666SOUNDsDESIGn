// ==========================================
// DATEI: config/stream.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Basis-Stream-Konfiguration für den internen Player.
// ÄNDERUNG: Kopfzeile ergänzt für bessere Nachvollziehbarkeit im Projekt.
// ==========================================

export const STREAM_CONFIG = {
  stream_url: "/stream",
  fallback_stream_url: "/fallback-stream",
  metadata_url: "/api/nowplaying",
  poll_interval_ms: 8000,
  listener_capacity: 250,
  use_webhook: false
};
