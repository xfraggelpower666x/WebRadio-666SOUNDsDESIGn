window.RADIO_CONFIG = {
  radioBase: "https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev",
  endpoints: {
    stream: "/stream",
    backup: "/backup",
    metadata: "/metadata",
    status: "/status",
    listeners: "/listeners",
    history: "/history",
    health: "/health",
    debug: "/debug"
  },
  ui: {
    pollMs: 7000,
    requestTimeoutMs: 4500,
    stallTimeoutMs: 18000,
    fallbackCover: "assets/fallback.jpg"
  }
};
