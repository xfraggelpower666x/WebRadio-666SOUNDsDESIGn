// ==========================================
// DATEI: external-player/js/app.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Startet den externen Standard-Player mit gemeinsamer Player-Logik.
// ÄNDERUNG: Auf das gemeinsame One-Page-Cyber-Frontend mit Health-/Source-/Player-Lampen umgestellt.
// ==========================================

import { STREAM_CONFIG } from '../config/stream.config.js';
import { UI_CONFIG } from '../../config/ui.config.js';
import { initPlayer } from '../../js/player-ui-core.js';

initPlayer({
  streamConfig: STREAM_CONFIG,
  uiConfig: UI_CONFIG,
  mode: 'external',
  assetPrefix: '.'
});
