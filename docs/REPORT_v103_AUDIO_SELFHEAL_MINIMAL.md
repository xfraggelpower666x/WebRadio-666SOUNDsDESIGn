# 666SOUNDsDESIGn — v103 Audio Self-Heal Minimal

## Scope

Only the agreed audio-recovery block was changed.

## Tasks

1. Stop→Play artifact recovery
   - Media element is prepared with a controlled hard reset after a user stop or dirty audio state.
   - Visualizer is stopped before reset and restarted through the existing play path.

2. iPhone/Systemsound interruption recovery
   - Unexpected pause/stalled/suspend/error/focus/pageshow/visibility return marks audio dirty and attempts a controlled replay only when playback was expected.
   - User Stop remains a real stop and is not auto-restarted.

## Explicitly untouched

- No layout rebuild.
- No EQ/Reactor replacement.
- No Discord routing changes.
- No Worker/stream routing changes.
- No additional polling loop or new RAF visualizer loop.

## Version

PC and iPhone visible version updated to v103.
