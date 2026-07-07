# REPORT v89 — Discord Mobile Overlay Visibility Repair

## Scope
- Repair only Discord Gate frontend visibility/click path.
- No stream route changes.
- No worker streaming changes.
- No player layout rebuild.

## Fixed
- iPhone mobile runtime hides direct body children while `body[data-smfp-active="1"]` is active.
- Discord access overlays are appended to `body`, so the mobile hide rule made the access dialog invisible.
- Added a runtime style patch so `#s666DiscordGateOverlay` and `#s666DiscordDeniedOverlay` remain visible above the mobile player when opened.
- Preserved hidden state when overlays are closed.

## Files changed
- `js/addons/discord-player-addon-v3.js`
- `index.html` cache-bust version only
- `docs/REPORT_v89_DISCORD_MOBILE_OVERLAY_VISIBILITY_REPAIR.md`

## Not changed
- Worker stream routing
- Emergency player
- Metadata routes
- Audio playback core
- Boost / recovery code
