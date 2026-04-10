window.RADIO_CONFIG = {
  radioBase: "https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev",
  soundcloudBase: "https://666-soundcloud-hybrid-pro.digital-underground-connected.workers.dev",

  endpoints: {
    stream: "/stream",
    backup: "/backup",
    metadata: "/meta",
    status: "/status",
    history: "/history",
    listeners: "/listeners",
    nowplaying: "/nowplaying",
    health: "/health",
    resolve: "/resolve"
  },

  directBackupUrl: "https://my.idjstream.com/8686/stream",
  sunshineUrl: "https://stream.sunshine-live.de/live/aac-64/utm_source=radio.menu/",
  soundcloudFallbackUrl: "https://soundcloud.com/DEIN-ALBUM-ODER-PROFIL",
  djFallbackName: "666SOUNDsDESIGn DJ",

  metadataPollMs: 7000,
  historyPollMs: 10000,
  retryCooldownMs: 2500
};
