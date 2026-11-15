# SoundCloud source setup

RADIO WAVE uses the SoundCloud API through the Electron main process. In the
SoundCloud source panel, enter the Client ID and Client Secret and select
**SAVE SECURELY**. Windows encrypts the saved credentials for the current
account using Electron `safeStorage`; the app never returns the saved secret to
the renderer. **TEST CONNECTION** checks authentication and public API access;
**REMOVE SAVED** deletes the encrypted local file.
Windows DPAPI protects it from other Windows accounts, not from other programs
running under the same account.

Alternatively, set these environment variables before startup:

- `SOUNDCLOUD_CLIENT_ID`
- `SOUNDCLOUD_CLIENT_SECRET`

Saved credentials take priority over environment variables. If secure storage
is unavailable, saving fails explicitly; environment credentials can still be
used. The client-credentials flow accesses public resources, not private account
content. Access tokens stay in memory and playback uses `swsc://audio/current`.

The application does not ship credentials. SoundCloud application registration and API terms remain the operator's responsibility. The UI exposes creator/title attribution and an OPEN ON SOUNDCLOUD action for the current resolved work.

Blocked or otherwise non-streamable tracks are rejected. Resolved playlists
populate the playback queue. At the end of a video export, playback stops
instead of automatically starting the next SoundCloud track. A stream error
during export aborts the recording without automatically skipping to another
track; fatal HLS playback errors also abort the incomplete export. The official OpenAPI documents authenticated
`GET /tracks/{track_urn}/streams` returning JSON, despite the guide's legacy
singular `/stream` example. The app plays the supplied AAC or MP3 HLS stream
with hls.js on the existing audio element; if only a preview is provided, the
UI labels it **PREVIEW ONLY**. Track restrictions, region, account permissions,
network errors and lack of an HLS-capable runtime can prevent playback.

Stream URLs and tokens stay in the main process. The internal media bridge
rewrites HLS resources to revision-bound, opaque URLs and only follows HTTPS
SoundCloud API and `sndcdn.com` media hosts. If SoundCloud changes its CDN host
policy, playback fails closed until the allowed hosts are reviewed.

References: [OpenAPI](https://developers.soundcloud.com/docs/api/explorer/api.json)
and [API guide](https://developers.soundcloud.com/docs/api/guide#streaming-tracks).

## Optional offline Electron smoke test

From the project directory, set `FFMPEG_PATH` to an existing `ffmpeg.exe` and
run `node tests\soundcloud-electron-hls-smoke.cjs`. On this Windows machine the
test also defaults to the locally installed FFmpeg path. It generates a short
AAC HLS sine wave in a uniquely named project-local scratch directory, uses an
isolated Electron profile and mocked SoundCloud fetches, blocks external
renderer requests, and removes only that directory afterward. The real
Electron `swsc:` protocol, hls.js, application audio element and analyser are
exercised. This does not test live SoundCloud or real credentials.
