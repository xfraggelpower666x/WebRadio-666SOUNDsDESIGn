# WebRadio 666SOUNDsDESIGn - Stabilized Build

## Applied fixes
- safer stream switching to reduce `play()` / `pause()` race conditions
- fallback handling for `error`, `ended`, `waiting`, `stalled`, `abort`
- status endpoint timeout handling in frontend and worker
- worker URL unified in frontend display
- safer stop behavior for live streams (clears `src` instead of forcing `currentTime = 0`)
- DJ name normalization fixes:
  - `Radio Luxury` -> `Web.Radio Luxury`
  - `diablovimay` -> `Diablo Wee Mai`
- improved worker `/health` JSON response and `/stream` headers

## Notes
This build is stabilized, not fully redesigned. It focuses on playback robustness and cleaner failover behavior.
