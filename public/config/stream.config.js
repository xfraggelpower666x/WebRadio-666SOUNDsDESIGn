// ==========================================
// DATEI: config/stream.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-08-17
// ZWECK: Stream-Konfiguration des internen Fallback-Players.
// ÄNDERUNG: Listener-Kapazität wird ausschließlich live über /api/nowplaying geliefert.
// ==========================================

export const STREAM_CONFIG = {
  stream_url: "/stream",
  fallback_stream_url: "/fallback-stream",
  metadata_url: "/api/nowplaying",
  health_url: "/health",
  poll_interval_ms: 8000,
  use_webhook: false,
  primary_upstream: "https://my.idjstream.com/666soundsdesign/stream",
  fallback_upstream: "https://my.idjstream.com:8686/stream"
};
