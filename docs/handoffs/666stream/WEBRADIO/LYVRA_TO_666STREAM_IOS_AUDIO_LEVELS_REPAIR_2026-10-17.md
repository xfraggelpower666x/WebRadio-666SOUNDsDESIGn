# LYVRA → 666STREAM / WEBRADIO — iPhone iOS Audio-Level Bridge Repair

STATUS: PROPOSED_INBOX_ONLY · REPOSITORY_DELIVERY_PENDING_READBACK · NOT_ADOPTED · NOT_REPAIRED · NOT_DEPLOYED
DATE: 2026-10-17
SOURCE: Direct creator instruction in LYVRA / WEBLyvra chat; this document is **not** a 666STREAM trigger.
TARGET: 666STREAM native system, WEBRADIO project. Repository `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`; branch `WebRadio-666SOUNDsDESIGn`.
RECOVERY: `backup/pre-lyvra-ios-audio-handoff-20261017`.
SCOPE: Existing embedded MiniPlayer audio-level analysis/bridge, no redesign or independent player.

## Real cross-device evidence, reported by creator
2026-10-17: WEBLyvra audio-reactive neon effects work on PC browsers and Android with the existing embedded player, but fail on **iPhone both Microsoft Edge and Safari**. User supplied a real screenshot in the originating LYVRA ChatGPT conversation. Original screenshot is **not embedded in this repository file**; binary delivery must not be inferred. Screenshot: PNG 1290×1922, SHA256 `08f063a26e2e24610cc4ac66003f2f6bbef29f511bab59e8618a3177c3c82e9e`. Ask originating user/chat for exact original bytes if repository-hosted binary evidence is required.

## What screenshot visibly establishes
- Embedded player shows pause icon and `LIVE · Verbunden`, track `fraggelpower666 - HORST SAGA`, DJ LYVRA DJ, bitrate 320 kbps and listener count 4/500. These are UI observations, **not** an independent proof that WebAudio frequency analysis succeeds.
- Website shows `Klang wird Licht.`, button `Neon-Effekte ausschalten` (effects enabled) but status `Kein aktuelles Audiosignal`; BASS/MITTEN/HÖHEN meters show only minimal colored stubs. No meaningful reactive viewport lighting seen.
- The iPhone browser choice does not resolve problem. Full output volume does not imply analyser data.
- Screenshot disproves the hypothesis that reduced-motion alone is responsible: toggle is enabled and not displayed as disabled; confirm setting separately if necessary.

## Source reviewed (READ, not mobile runtime proof)
LYVRA: `WEBLyvra/live/dist/audio-neon.js` blob `55255a307bacb3c24d74b7bbffd8c2283164deac`.
LYVRA: `WEBLyvra/live/dist/audio-neon.css` blob `c5542b3bcbc73619223df2cc53986a1e407e2167`.
666STREAM: `public/embed/miniplayer.html` blob `72949e53d410c03890711b0852599250584cc9c7`.
666STREAM: `public/js/audio-levels.js` blob `16f1d60b91e74ecb00693fc85b3488b4389a6700`.

## Concrete suspected failure chain to test (not yet root-cause verified)
1. MiniPlayer `play()` calls `enableVisualizer()` only when `sourceIndex===0`. Streaming can succeed without a live analyzer if graph creation, CORS, suspended AudioContext or backup source blocks analyzer setup.
2. `visualizer()` publishes real frequency levels only if `visualActive && analyser`; `S666AudioLevels.publish()` otherwise cannot produce live `playing:true` real bands.
3. `S666AudioLevels` sends a `playing:false` all-zero handshake on `lyvra:audio:subscribe`. The LYVRA parent receives only validated iframe messages and needs continuing real data for `active`, otherwise shows `Kein aktuelles Audiosignal`. Investigate iframe load/subscription ordering, `visibilitychange`, postMessage origin, frame instance, sequence, iOS WebKit AudioContext resume and CORS/analyser.
4. iOS WebKit may handle MediaElementAudioSource + streamed audio differently. Do not infer failure solely from playback being active; inspect actual audio context state, analyser fresh timestamps, readyState, and selected source under iOS.

## Native 666STREAM scoped work request
- Rehydrate **fresh 666STREAM native CURRENT**, select WEBRADIO explicitly, check newer evolution; no foreign activation.
- Instrument **privacy-safe**, temporary source/meter diagnostics (graph available, AudioContext running/suspended, sourceIndex, meterAvailable, last genuine publish, subscription state, received messages). No user secrets, no microphone and no simulated audio levels.
- Reproduce on iPhone Safari and Edge, then repair proven failure **within existing player/analyser/bridge**. Preserve one stream, all existing controls, metadata/artwork, volume, EQ/boost, skip security, messaging, fallback and WebRadio visual identity. Do not solve by spawning a second player or oscillator.
- If CORS or iOS analyser is unavailable for a source, report the limitation and propose a properly authorized same-stream, real-level alternative. No fake beat/animation.
- Verify existing `lyvra:audio:subscribe` / `lyvra:audio:levels` v1 origin, sequence, freshness and 0..1 bands. Coordinate any parent-side change by a separate LYVRA peer proposal (not a foreign write).
- Add focused tests for true signal, missing analyser, AudioContext suspended, iframe subscription/race, fallback stream, visibility resume and explicit user neon-off. Verify PC/Android regression.
- Pre-change recovery, repository concurrency/readback, scoped tests, deployment readback, **real iPhone host test** and pointer-last for any governance mutation.
- Return receipt to LYVRA with source commit/blob, tests, deployment SHA, actual iPhone validation, and unresolved blockers. Distinguish SOURCE / DELIVERY / ADOPTION / HOST; do not invent PASS.

## Ownership / receipt semantics
This file is additive inbox evidence ONLY. Publishing it is not implementation, deployment, native adoption, or automatic trigger execution. 666STREAM alone controls its native project changes; LYVRA keeps WEBLyvra authority. Screenshot binary is known to the originating conversation, not presumed uploaded to GitHub. Do not overwrite the earlier 2026-10-16 MiniPlayer metadata proposal or modify 666STREAM runtime/pointers as a side-effect.
