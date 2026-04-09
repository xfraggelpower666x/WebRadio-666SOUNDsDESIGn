window.RADIO_CONFIG = {
  radioBase: "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev",
  endpoints: {
    stream: "/api/radio/stream",
    backup: "/api/radio/backup",
    metadata: "/api/radio/metadata",
    health: "/health"
  },
  metadataPollMs: 5000,
  djFallbackName: "666SOUNDsDESIGn DJ",
  boostDefault: 1,
  boostGainLevels: [1.0, 1.12, 1.28, 1.45]
};
