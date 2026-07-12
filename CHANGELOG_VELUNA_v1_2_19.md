# VELUNA / 666 PLAYER v1.2.19

## Shared Auth and Messaging Repair

- Removed the duplicate password gate from `player-stage-v2.js`.
- All protected player actions now use `S666AdminAuth.ensure()` as the single interactive owner.
- Discord message and manual-send actions now initiate the shared Password Worker -> Auth Worker flow themselves.
- Existing same-origin Bearer API contract retained.
- Worker and backend route contracts unchanged.
- No audio, layout, stream, EQ, booster or limiter changes.
