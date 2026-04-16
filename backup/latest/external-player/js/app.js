// ==========================================
// DATEI: external-player/js/app.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// ZWECK: Startet den externen Haupt-Player mit gemeinsamer Player-Logik.
// ÄNDERUNG: Auf kompaktes One-Page-Cyber-Frontend mit Tap-Infos und iPhone-Touch-Fix umgestellt.
// ==========================================

import { STREAM_CONFIG } from '../config/stream.config.js';
import { UI_CONFIG } from '../../config/ui.config.js';
import { initPlayer } from './player-ui-core.js';

initPlayer({
  streamConfig: STREAM_CONFIG,
  uiConfig: UI_CONFIG,
  mode: 'external',
  assetPrefix: '.'
});
