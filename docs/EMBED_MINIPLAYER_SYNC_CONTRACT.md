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

## Embed code and height contract

```html
<iframe src="https://webradio.666soundsdesign-broadcaster.com/embed/miniplayer.html"
  title="666SOUNDsDESIGn WebRadio" loading="lazy" allow="autoplay"
  width="100%" height="365"
  style="display:block;max-width:680px;border:0;border-radius:18px"></iframe>
```

Because EQ and Broadcast panels expand **inside** an iframe, reserve at least 365px height on narrow layouts; 165px is insufficient for the expanded controls. The embed never requests or stores the AutoDJ Worker secret: authentication is through the canonical player admin service. The iframe must be hosted on the **radio domain** so relative authenticated endpoints remain same-origin. If a deployment has restrictive `Content-Security-Policy: frame-ancestors` or `X-Frame-Options`, configure explicit trusted embedding origins; do not disable the radio's security policy globally.

## Limitations
- The Discord control currently opens the full player; this is not an embedded Discord panel.
- Existing changes to full-player-only markup/CSS do not automatically update MiniPlayer markup.
- The MiniPlayer's separate Broadcast composer calls the same backend but does not reuse the full player's UI component.
- Live production CORS, iframe and server responses remain to be verified.
- After activating WebAudio, cross-origin fallback audio is blocked when CORS support is unknown, rather than claiming playback success.
