# REPORT v90 — Discord iPhone Body-Hide Whitelist Repair

Created: 2026-05-07  
Modified: 2026-05-07  
Project: 666SOUNDsDESIGn WebRadio  
Type: Full repo repair build

## Scope

Only the iPhone Discord Gate frontend path was repaired.

## Changes

- PC Discord behavior left untouched.
- iPhone mobile body-hide selector now explicitly whitelists:
  - `#s666DiscordGateOverlay`
  - `#s666DiscordDeniedOverlay`
- iPhone `killOldDom()` now also preserves those overlays.
- Discord addon version bumped to `V3.5-20260507-IPHONE-BODY-HIDE-WHITELIST-REPAIR`.

## Not changed

- Stream routing
- Worker stream/fallback routes
- Metadata routes
- Audio recovery / boost logic
- PC player layout
- iPhone layout outside Discord Gate visibility

## Reason

PC Discord Gate worked, proving Discord Worker/Webhook flow is valid. The remaining failure was isolated to iPhone mobile DOM/CSS hiding/removal behavior.
