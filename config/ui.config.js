// ==========================================
// DATEI: config/ui.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Zentrale UI-/Theme-Konfiguration für internen und externen WebRadio-Player.
// ÄNDERUNG: Cyber-Header, Lampen-Tap-Infos, neon-türkise Info-Panels und Laser-Outlines ergänzt.
// ==========================================

export const UI_CONFIG = {
  theme: {
    backgroundBase: '#1c1f24',
    backgroundDeep: '#11141a',
    neonPink: '#ff3fb7',
    neonTurquoise: '#00f5df',
    okGreen: '#53ff98',
    errorRed: '#ff557d',
    textMain: '#eef7ff',
    textMuted: '#8ea2b3',
    panelBorder: 'rgba(0,245,223,0.24)',
    panelGlass: 'rgba(255,255,255,0.04)',
    panelSolid: '#00f5df',
    panelText: '#1c1f24'
  },
  labels: {
    metadata: 'Meta',
    audio: 'Audio',
    source: 'Source',
    health: 'Health',
    player: 'Player',
    nowPlaying: 'Now Playing',
    listeners: 'Listeners',
    bitrate: 'Bitrate',
    djStatus: 'DJ / Status',
    stream: 'Stream',
    genre: 'Genre',
    serverInfo: 'Server / Info',
    modeExternal: 'External',
    modeInternal: 'Internal',
    sourcePrimary: 'Main',
    sourceFallback: 'Fallback',
    healthReady: 'Ready',
    healthOnline: 'Online',
    healthOffline: 'Offline',
    audioPlaying: 'Playing',
    audioPaused: 'Paused',
    audioError: 'Error'
  },
  infoTexts: {
    playerExternal: 'Externer Haupt-Player aktiv. Türkis bedeutet: Standard-Player läuft.',
    playerInternal: 'Interner Worker-Fallback aktiv. Pink bedeutet: Notfall-Player läuft.',
    sourcePrimary: 'Main-Stream aktiv. Aktuell läuft der Hauptstream.',
    sourceFallback: 'Fallback-Stream aktiv. Der Hauptstream war nicht erreichbar.',
    healthReady: 'Health wird gerade geprüft.',
    healthOnline: 'Health ist online. Worker und Stream-Antwort sind erreichbar.',
    healthOffline: 'Health ist offline oder liefert gerade keine saubere Antwort.',
    metadataOnline: 'Metadaten werden sauber aus dem Worker gelesen und angezeigt.',
    metadataOffline: 'Metadaten konnten gerade nicht geladen werden.',
    audioPlaying: 'Audio läuft. Der Player gibt Ton aus.',
    audioPaused: 'Audio ist pausiert.',
    audioError: 'Audio konnte nicht abgespielt werden.'
  },
  defaults: {
    djName: 'LYVRA DJ',
    stationName: '666SOUNDsDESIGn Radio'
  }
};
