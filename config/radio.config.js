window.RADIO_CONFIG = {
  radioBase: "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev",
  soundcloudBase: "https://soundcloud-hybrid-worker.fraggelpower666.workers.dev/",

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

  soundcloudFallbackSources: [
  "https://soundcloud.com/DEIN-ALBUM-1",
  "https://soundcloud.com/DEIN-ALBUM-2",
  "https://soundcloud.com/DEIN-ALBUM-3"
],
};
