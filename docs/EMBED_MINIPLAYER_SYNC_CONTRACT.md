# 666STREAM — Embedded MiniPlayer Synchronization Contract v1.0

## Ownership
The full WebRadio remains the production authority. The MiniPlayer at `public/embed/miniplayer.html` is a small, separately rendered client of the same public radio services.

## Shared live dependencies (no copied secrets or independent business logic)
- `/stream` for primary playback; upstream fallbacks as defined in the existing player.
- `/api/nowplaying` for metadata, artwork, DJ, listeners and bitrate (only when present).
- `/api/player-alert/send` for Broadcast Messenger.
- `/js/admin-auth-client.js` and `/js/skip-control.js` for server-authorized AutoDJ Skip.
- `/js/boost-core.js` as the **single owner** of the EQ/boost audio graph and device policy.

The embedded player does not store credentials in markup, expose Worker secrets, or bypass same-origin protected actions. Its Discord control links to the official player until a verified standalone integration exists.

## Automatic propagation
When a shared backend endpoint or one of the shared JavaScript modules changes, both players consume the new deployed implementation upon normal page refresh/cache expiry. Metadata updates are polled every 12 seconds while visible. Changes to full-player-only HTML, CSS, or private modules do **not** automatically modify MiniPlayer layout or behavior.

## Change management
Any release changing stream routing, nowplaying schema, shared EQ/boost, admin auth, skip, Broadcast Messenger, or Discord integration must review the embed integration. Run `node --test tests/embed-miniplayer-contract.test.mjs` in CI. If incompatible, update the MiniPlayer within the same release PR; do not silently ship broken embed support.

## Production gates
Development branch and draft PR are not deployment. Verify embedded audio playback, WebAudio/CORS behavior, mobile controls, server authorization, messenger feedback, cache behavior and frame-ancestor embedding before merging. Preserve the normal 666PFS source → tests → deploy → live readback → backup → registry → CURRENT-pointer order.
