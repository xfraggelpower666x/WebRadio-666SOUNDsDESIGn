window.RADIO_CONFIG = {
  // corrected host: fragglepower666
  radioBase: "https://webradio-666soundsdesign-worker.fragglepower666.workers.dev",
  backupDirect: "https://my.idjstream.com/8686/stream",
  metadataCandidates: [
    "/api/radio/metadata",
    "/meta",
    "/streammeta",
    "/api/radio/status",
    "/status"
  ],
  healthCandidates: [
    "/health",
    "/api/radio/status",
    "/status"
  ],
  streamCandidates: [
    "/api/radio/stream",
    "/stream"
  ],
  backupCandidates: [
    "/api/radio/backup",
    "/backup"
  ],
  metadataPollMs: 5000,
  djFallbackName: "666SOUNDsDESIGn DJ",
  boostDefault: 1,
  boostGainLevels: [1.0, 1.12, 1.28, 1.45]
};
