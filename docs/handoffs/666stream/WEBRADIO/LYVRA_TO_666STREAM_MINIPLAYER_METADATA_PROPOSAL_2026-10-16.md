# LYVRA → 666STREAM / WEBRADIO — MiniPlayer Metadata Repair Proposal

Status: PROPOSED_INBOX_ONLY · NOT_ADOPTED · NOT_DEPLOYED
Date: 2026-10-16
Source: direct creator request to LYVRA to communicate via repository
Target native system: 666STREAM, project ID WEBRADIO
Target production branch: `WebRadio-666SOUNDsDESIGn`
Verified base before this proposal: `58af826e2a8287b44dcdfcbddcc4ba62880402df`
Pre-change recovery branch: `backup/pre-lyvra-metadata-proposal-20261016-0119`
Origin system: LYVRA (separate authority; no cross-system update authorization)
Target file: `public/embed/miniplayer.html`
Observed file blob: `6000ee483269955df9cb46cbb2e8cd68d663a10e`
Target Worker contract: `worker.js` (`/api/nowplaying`)

## Reproducible source finding

The embedded MiniPlayer polls `https://webradio.666soundsdesign-broadcaster.com/api/nowplaying` every 12 seconds. It currently selects `now_playing.song.text`, `songtitle`, `title`, etc., but omits the Worker-normalized first-choice fields `display_title` and `normalized_title`. It selects `dj.name` and legacy variants, but omits `dj_display`. The Worker normalization produces `display_title`, `normalized_title`, `dj_display`, `dj_mode` and `raw_title`. On metadata request errors the player swallows the error and retains stale title/DJ/listener/quality values.

This is verified source incompatibility; live API misbehavior, deployed asset parity and browser results have NOT been independently verified.

## Requested narrowly scoped 666STREAM-native work

1. Rehydrate fresh 666STREAM Structure Control CURRENT, then bind explicitly to the WEBRADIO project. Verify latest HEAD, current file blob, available write authority, backups/concurrency and any newer work before mutation.
2. Preserve complete MiniPlayer functionality, including audio sources and fallback, play/pause, visualization, EQ, booster, secure skip, Messenger, Discord, embed, styling, stream-supplied cover priority and responsive layout.
3. In the existing `metadata()` path prefer `display_title` then `normalized_title`, fall back to existing title fields; prefer `dj_display` then existing DJ fields. Preserve normalizer output; do not reintroduce double-branding. Parse listener counts and bitrate defensively. Respect actual artwork and use fallback only if metadata artwork absent/invalid.
4. Never present stale metadata as current; after a bounded duration of unsuccessful metadata refreshes, show honest unavailable placeholders without interrupting playback. Consider visibility resume refresh; keep poll request/abort safeguards.
5. Add regression tests for normal title and DJ priority, valid zero listeners, malformed API/timeout/stale state, stream art persistence, and preserved controls. Run against exact checked-out current source, then real API/iframe/browser separately.
6. Pre-change recovery; no cross-project mutations; governed code/CI review; direct source readback; native plugin impact only if applicable; pointer-last if 666STREAM governance requires a Current mutation; no mutations after pointer publication.
7. Report separately SOURCE_PASS, TEST_PASS, DEPLOYMENT_PASS, BROWSER_PASS and upstream API evidence. No invented tests, delivery/adoption or production claims.

## Existing offline handoff artifact

In the originating LYVRA conversation a ZIP named `LYVRA_WEBRADIO_MINIPLAYER_METADATA_REPAIR_20261016.zip` was created with an offline patcher and six local structural regression tests. It has **not** been uploaded into this repository; a separate ChatGPT conversation sandbox file is not a GitHub artifact. Do not assume the ZIP is accessible from 666STREAM. This proposal is self-contained enough to reproduce the scoped repair from the named repository file and worker API contract.

## Ownership and communication boundary

This is a **repository-persisted proposal**, not a 666STREAM direct trigger, update, approval, deployment, or runtime adoption. Reading this file must NOT automatically activate LYVRA, CLIC, PFS or another project. 666STREAM retains native authority over WEBRADIO writes. The creator may subsequently request a direct `666STREAM UPDATE` in a 666STREAM chat to evaluate/adopt/implement it. No source file, runtime pointer, playlist or deployed asset is modified by this handoff.
