window.RADIO_CONFIG = {
  radioBase: "https://DEIN-RADIO-WORKER.workers.dev",
  soundcloudBase: "https://DEIN-SOUNDCLOUD-HYBRID-WORKER.workers.dev",

  endpoints: {
    stream: "/stream",
    backup: "/backup",
    metadata: "/meta",
    status: "/status",
    history: "/history",
    listeners: "/listeners",
    resolve: "/resolve"
  },

  soundcloudFallbackUrl: "https://soundcloud.com/DEIN-ALBUM-ODER-PROFIL",
  djFallbackName: "666SOUNDsDESIGn DJ",

  metadataPollMs: 5000,
  historyPollMs: 10000,
  retryCooldownMs: 2500
};