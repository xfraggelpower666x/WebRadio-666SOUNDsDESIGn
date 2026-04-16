// ==========================================
// DATEI: external-player/js/app.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16 | AUDIO PRO + AUTO CHAIN HOT DEFAULT
// STATUS: AUDIO PRO AKTIV
// ZWECK: Startet den externen Standard-Player mit eigenem Audio-Pro-Modul.
// ÄNDERUNG: Echter Web-Audio-Signalweg mit Hot-Default-Auto-Chain, Boost-Reserve, GR-/Peak-/Limit-HUD.
// ==========================================

import { STREAM_CONFIG } from '../config/stream.config.js';
import { UI_CONFIG } from '../../config/ui.config.js';
import { initExternalAudioProPlayer } from './player-ui-audio-pro.js';

initExternalAudioProPlayer({
  streamConfig: STREAM_CONFIG,
  uiConfig: UI_CONFIG,
  mode: 'external',
  assetPrefix: '.'
});
