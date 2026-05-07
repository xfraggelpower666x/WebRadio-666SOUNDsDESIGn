# 666SOUNDsDESIGn — v88 Discord Click Bridge Repair

Created: 2026-05-07
Modified: 2026-05-07
Type: Full repo repair build

## Scope
- Repairs only the Discord frontend trigger behavior.
- Does not touch stream routes, metadata routes, emergency player routing, or Discord webhook secrets.

## Fixed
- Added a delegated global click/touch bridge for Discord panels.
- Makes the whole Discord panel clickable, not only the inner button.
- Re-mounts the Discord panel later as well, because the iPhone player can rebuild its DOM after initial load.
- Forces pointer-events on for the Discord panel and button.

## Expected behavior
- Tap/click Discord panel on PC or iPhone.
- English access-code overlay opens.
- Wrong code shows pink blinking ACCESS DENIED.
- Correct code posts to Discord through the Worker endpoint.
