# REPORT v92 — Discord Broadcast Embed Rework

Created: 2026-05-08
Modified: 2026-05-08
Project: 666SOUNDsDESIGn WebRadio
Type: Discord Worker/Frontend Add-on repair and payload enhancement

## Scope
Only the Discord posting block was changed. Stream routing, Worker fallback, emergency player, audio recovery and player core were not intentionally modified.

## Changes
- Reworked Discord manual DC post into a structured multi-embed broadcast card.
- Added short radio introduction at the top of the Discord post.
- Added live metadata fields: Now Playing, Listeners, Bitrate, DJ/Status and Source.
- Keeps the branding/skull icon as embed thumbnail via the existing app icon path.
- Uses the current stream artwork as the large Discord embed image when metadata provides artwork/cover/image.
- Added clean grouped stream links, social links and DistroKid release links.
- Updated custom MSG posts to include typed message, metadata and grouped links.
- Now Playing auto-posts keep metadata, branding thumbnail and current artwork image.
- Updated frontend defaults with all social/release URLs.
- Cache tag updated from v91 to v92 for Discord JS/CSS includes.

## Safety
- No webhook URL or secret written to code.
- Gate code behavior remains intact.
- ACCESS DENIED overlay remains intact.
- `/api/discord/*` remains the only Discord route family.
- No stream/fallback/notfallplayer route modifications.

## Validation
- `node --check js/addons/discord-player-addon-v3.js` passed.
- `node --check worker-addons/discord-notify-addon-v3.js` passed.
- `node --check worker.js` passed.
- Root kept clean: only README.md remains as root documentation file.
