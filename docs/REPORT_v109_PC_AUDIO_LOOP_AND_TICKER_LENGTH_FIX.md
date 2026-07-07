# 666SOUNDsDESIGn v109 — PC Audio Loop + Ticker Length Fix

## Scope
- PC-only Play/Stop/Pause auto-restart loop repair.
- Ticker runtime lengthened on PC + iPhone.

## Changes
- Added canonical `data-player-state` / `data-transport-state` sync for play/pause/stop.
- Desktop recovery hooks no longer run iOS/mobile recovery logic.
- PC stream watchdog now respects `paused` and `stopped` states.
- Watchdog no longer marks `timeupdate/canplay/loadeddata` as user-start intent.
- Mobile ticker animation now travels full text width and runs longer.
- PC ticker animation duration extended without adding a second ticker.

## Not touched
- Worker
- Stream routing
- Discord routing
- EQ/Visualizer
- Layout grid
