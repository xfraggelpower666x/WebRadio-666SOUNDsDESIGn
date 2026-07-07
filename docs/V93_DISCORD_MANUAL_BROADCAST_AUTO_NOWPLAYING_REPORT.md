# 666SOUNDsDESIGn — v93 Discord Manual Broadcast + Auto Now Playing

Created: 2026-05-08  
Type: controlled Discord add-on repair/extension  
Scope: Discord add-on only

## Changed

1. The large broadcast post remains manually triggered by the DC button.
2. Automatic track-change posts are compact Now Playing embeds.
3. Automatic posts are armed only after a valid Discord access-code unlock in the browser session.
4. Track-change dedupe remains active in the Worker to reduce duplicate spam.
5. Metadata/artwork extraction now also accepts `icon`, `logo`, `cover_url`, station images and nested song artwork.
6. Stream/Worker audio routing, fallback streaming and notfallplayer logic were not modified.

## Safety

- No webhook URL in frontend.
- No public unauthenticated auto-posting from random visitors.
- Existing `/api/discord/nowplaying` still requires the gate code.
- Manual big post and automatic song-change post are separated.
