// ==========================================
// DATEI: external-player/config/stream.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Stream-Konfiguration des externen Players.
// ÄNDERUNG: Kopfzeile ergänzt für bessere Nachvollziehbarkeit im Projekt.
// ==========================================

export const STREAM_CONFIG = {
  stream_url: "https://webradio.666soundsdesign-broadcaster.com/stream",
  fallback_stream_url: "https://webradio.666soundsdesign-broadcaster.com/fallback-stream",
  metadata_url: "https://webradio.666soundsdesign-broadcaster.com/api/nowplaying",
  poll_interval_ms: 8000,
  listener_capacity: 250,
  use_webhook: false,
  primary_upstream: "https://my.idjstream.com/666soundsdesign/stream",
  fallback_upstream: "https://my.idjstream.com:8686/stream"
};
