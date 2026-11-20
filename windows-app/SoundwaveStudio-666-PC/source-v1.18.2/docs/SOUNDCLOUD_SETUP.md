# SoundCloud source setup

Soundwave Studio 666 uses the current SoundCloud API through the Electron main process. No SoundCloud client secret is exposed to the renderer.

Required environment variables before startup:

- `SOUNDCLOUD_CLIENT_ID`
- `SOUNDCLOUD_CLIENT_SECRET`

The application exchanges these credentials using the client-credentials flow, caches the access token in process memory, resolves a SoundCloud track/playlist URL, and proxies playback through the internal `swsc://audio/current` protocol so the existing Soundwave AudioContext/Analyser pipeline remains the audio owner.

The application does not ship credentials. SoundCloud application registration and API terms remain the operator's responsibility. The UI exposes creator/title attribution and an OPEN ON SOUNDCLOUD action for the current resolved work.

Blocked or otherwise non-streamable tracks are rejected. Playlist URLs currently select the first non-blocked track returned by the resolve resource; full playlist queue navigation is a later gate.
