# BROADCAST ALERT V181 FINAL FIX — 2026-05-21

## Fixed

1. CSS positioning
- PC controls forced inline in NOW PLAYING topline.
- Order: metadata → History → SEND → text field.
- No new row, no player height growth, no wrapper rebuild.

2. Mobile trigger
- iPhone/mobile SEND opens composer overlay.
- Permanent PC text field hidden on mobile.
- Delegated click/touch fallback added for `#playerAlertPcSend`.

3. Backend relay / polling mismatch
- Send now writes local KV/cache even when external backend succeeds.
- Current now reads local KV/cache first when active, then backend.
- `clientId`, `senderId`, `timestamp` preserved.

4. Cache/stale endpoint
- Polling uses `?t=Date.now()`.
- Worker JSON responses hardened with no-cache/no-store.

## Not touched

- Audio engine
- Notfallplayer
- Stream proxy
- Discord addon
- Admin config system
- Chaos Engine
