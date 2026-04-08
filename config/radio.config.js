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
  soundcloudFallbackSources: [
    "https://soundcloud.com/fraggelpower666"
  ],

  djFallbackName: "666SOUNDsDESIGn DJ",

  signature: {
    name: "DJ Fraggel\nAka\nDJ Fraggelpower666",
    radio: "666SOUNDsDESIGn - Digital underground…\nconnected…",
    manifesto: `Freak DJs believe:
better to die standing —
with music in our ears
and dancing souls before our eyes —
than to live on our knees
and submit to the system.`
  },

  youtubeVideoId: "ZuRYHrYBB-4",
  mixcloudFeed: "https://www.mixcloud.com/Fraggelpower666/",

  metadataPollMs: 5000,
  historyPollMs: 10000,
  healthPollMs: 7000,
  retryCooldownMs: 2500,
  streamTitleMaxLength: 72,

  boostDefault: 1,
  boostGainLevels: [1.0, 1.12, 1.28, 1.45],

  failover: {
    desktopStallMs: 7000,
    androidStallMs: 10000,
    iphoneStallMs: 15000
  }
};
