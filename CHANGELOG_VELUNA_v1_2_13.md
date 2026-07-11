# VELUNA v1.2.13

## Critical repair

- Fixed the malformed inline JavaScript that prevented the VELUNA player runtime from loading.
- Removed the blocking `START AUDIO` overlay from VELUNA.
- Desktop now attempts stream playback immediately.
- iPhone also attempts playback immediately; when Safari blocks autoplay, the first normal interaction anywhere in the player unlocks audio without a separate gate window.
- Preserved the central animated splash as a visual, non-interactive layer.
- Preserved fixed iPhone fullscreen geometry and EQ → Boost → Limiter chain.
