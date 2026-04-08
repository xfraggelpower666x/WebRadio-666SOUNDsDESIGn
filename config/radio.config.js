window.RADIO_CONFIG = {
  radioBase: "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev",
  soundcloudBase: "https://soundcloud-hybrid-worker.fraggelpower666.workers.dev",
  endpoints: {
    stream: "/api/radio/stream",
    backup: "/api/radio/backup",
    metadata: "/api/radio/metadata",
    status: "/api/radio/status",
    history: "/api/radio/history",
    listeners: "/api/radio/listeners",
    health: "/health",
    resolve: "/resolve"
  },
  soundcloudFallbackUrl: "https://soundcloud.com/fraggelpower666",
  soundcloudFallbackSources: ["https://soundcloud.com/fraggelpower666"],
  djFallbackName: "666SOUNDsDESIGn DJ",
  metadataPollMs: 5000,
  healthPollMs: 7000,
  retryCooldownMs: 2500,
  streamTitleMaxLength: 72,
  boostDefault: 1,
  boostGainLevels: [1.0, 1.12, 1.28, 1.45]
};