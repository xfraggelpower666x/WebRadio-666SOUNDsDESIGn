# V87 Discord Gate Repair Report

## Status
FULL repo build. No stream, metadata, notfallplayer, or audio routing changes.

## Fixed
1. Discord panel mounting repaired for PC and iPhone slots.
2. Worker accepts multiple webhook secret names: `DISCORD_WEBHOOK_URL`, `DISCORD_WEBHOOK`, `DISCORD_WEBHOOK_URI`, `DISCORD_WEBHOOK_ENDPOINT`, `WEBHOOK_URL`.
3. Discord payload simplified for maximum webhook compatibility.
4. SVG preview replaced with PNG icon fallback for Discord embed reliability.
5. Access gate remains English-only.
6. Wrong code still triggers pink blinking `ACCESS DENIED` overlay.

## Gate Code
The fallback gate hash matches the provided access code. The raw code is not stored in frontend JavaScript.

## Verification
- Edited frontend addon syntax check: passed.
- Edited worker addon syntax check: passed.
- Worker import syntax check: passed.
- Local route test: status, denied, valid-code mock send passed.
