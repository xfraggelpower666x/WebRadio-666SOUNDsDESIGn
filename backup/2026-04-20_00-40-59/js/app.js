// ==========================================
// DATEI: js/app.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Startet den internen Fallback-Player mit gemeinsamer Player-Logik.
// ÄNDERUNG: Auf das gemeinsame One-Page-Cyber-Frontend umgestellt.
// ==========================================

import { STREAM_CONFIG } from '../config/stream.config.js';
import { UI_CONFIG } from '../config/ui.config.js';
import { initPlayer } from './player-ui-core.js';

initPlayer({
  streamConfig: STREAM_CONFIG,
  uiConfig: UI_CONFIG,
  mode: 'internal',
  assetPrefix: '.'
});
