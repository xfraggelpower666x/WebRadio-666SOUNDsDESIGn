# REPORT v114 — Ticker Idle/Play State

## Scope
Only ticker state logic was changed.

## Changes
- PC ticker shows `666SOUNDsDESIGn WebRadio` on initial load, Stop, and Pause.
- PC ticker switches to live metadata only after Play.
- iPhone ticker shows `666SOUNDsDESIGn WebRadio` on initial load, Stop, and Pause.
- iPhone ticker switches to live metadata only after Play.
- No new ticker layer was added.
- No layout, EQ, Discord, Worker, or stream routing changes were made.

## Validation
- `node --check js/player-core.js` passed.
- Inline scripts extracted from `index.html` and checked with `node --check` passed.
- Version set to v114.
