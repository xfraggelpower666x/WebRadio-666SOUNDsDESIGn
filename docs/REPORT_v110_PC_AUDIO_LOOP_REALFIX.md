# v110 PC Audio Loop Real Fix

## Basis
- Source: v109 PC audio loop/ticker length full build
- Reference: older working GitHub ZIP was used as behavioural reference only

## Fixed scope
1. PC Play/Stop one-second loop
2. PC auto-replay after Stop

## Exact cause found
The current PC player still contained old recovery/watchdog blocks from earlier PC fixes:

- `v77 PC Boost Meta Glow Ticker Fix`
- `v80 Stream Stability MB LED Repair`

Those blocks were still allowed to call:

- `audio.pause()`
- `audio.src = ...`
- `audio.load()`
- `audio.play()`

outside the canonical Play/Stop/Pause transport path.

That created a second PC audio controller beside the main player transport. This matched the visible defect: playback starts briefly, then a watchdog/recovery path interrupts/restarts it.

## What was changed
- v77 `recover()` no longer reloads/replays audio.
- v77 `audioWatchdog()` no longer performs playback recovery.
- v80 `safePlay()` no longer calls `audio.play()`.
- v80 `rareReconnect()` no longer pauses/reloads/replays audio.
- v80 watchdog no longer starts playback or reconnects.
- Broken duplicate nested `addEventListener` in the v80 boot block was corrected.

## What was not changed
- No layout change
- No ticker change
- No EQ/visualizer change
- No Discord change
- No Worker/stream routing change
- No mobile/iPhone ticker change

## Transport rule after v110
Only the canonical transport functions may control PC audio playback:

- Play button / `playCurrent()`
- Pause button
- Stop button / `stopPlayback()`
- Reconnect button
- Main/Backup buttons when the user has not stopped playback

Old PC watchdogs may still update status/ticker/LED state, but they must not start, stop, reload, or reconnect audio.
