// ==========================================
// DATEI: config/ui.config.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Zentrale UI-/Theme-Konfiguration für externen Player und internen Fallback-Player.
// ÄNDERUNG: Neue zentrale Farb-, Label- und Layoutwerte für One-Page-Cyber-Player hinzugefügt.
// ==========================================

export const UI_CONFIG = {
  theme: {
    backgroundBase: '#191c22',
    backgroundDeep: '#101319',
    neonPink: '#ff4db8',
    neonTurquoise: '#1ef2ff',
    okGreen: '#48ff8f',
    errorRed: '#ff5876',
    textMain: '#eef7ff',
    textMuted: '#9fb1c0',
    panelBorder: 'rgba(30,242,255,0.24)',
    panelGlass: 'rgba(255,255,255,0.05)'
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
    healthOffline: 'Offline'
  },
  layout: {
    mobileCoverMaxHeightVh: 22,
    desktopCoverMaxHeightPx: 240,
    meterWidthPx: 14,
    meterInsetPx: 6,
    topBadgeOffsetPx: 12
  },
  defaults: {
    djName: '666SOUNDsDESIGn DJ',
    stationName: '666SOUNDsDESIGn Radio'
  }
};
