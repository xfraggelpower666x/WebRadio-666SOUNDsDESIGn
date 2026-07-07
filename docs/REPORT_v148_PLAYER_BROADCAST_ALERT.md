# v148 PLAYER BROADCAST ALERT

- Basis: v147.
- Added public one-way player broadcast message system.
- PC: SEND button + short text box next to History / now-playing zone.
- iPhone: SEND MESSAGE button opens composer overlay.
- Receiving players show an overlay with OK / CLOSE.
- Sender does not receive their own message overlay.
- Server-side rate limit: one message every 180 seconds.
- Max text length: 240 characters.
- No transport, ticker, EQ, Discord, worker stream routing or player-core changes beyond /api/player-alert/* route.
