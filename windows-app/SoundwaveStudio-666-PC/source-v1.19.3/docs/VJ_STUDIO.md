# Local VJ Studio

This is an independently authored local-video feature inspired by Light Wave,
not a copy of its source, shaders, media or datasets.

Open **VJ STUDIO** from the window dock or preview, choose up to 100 local
MP4/WebM files, and enable VJ. The control window can be resized, dragged or
detached to another monitor.
The pool is ordered by the file picker; choose an item or press **NEXT VIDEO**.
The first pane drives the sequence; the second and third panes show subsequent
items and loop independently. Sequence looping can be switched off. Opacity
and pane count affect the main visualizer canvas and its video export. Video
is always muted; the existing shared player is the only audio source. Changing
the pane count keeps existing panes at their current playback positions.

VJ playback follows actual shared audio playback, buffering, pause and seek.
A new audio source resets video positions; microphone-only recording also
drives VJ playback. The video clock is not frame-locked to audio and seek uses
the video duration modulo the audio position. Files/codecs unsupported by
Electron show an error. A pool is session-only and must be selected again after
restart. Invalid picker selections are rejected without replacing the pool.
Live radio metadata changes do not reset video unless the media source reloads.
No video media,
external dataset, third-party VJ source or runtime service is bundled.

The VJ layer is drawn above the selected visualizer engine and below its text
overlay; lower opacity to see more of the visualization. Separate monitor and
detached visualizer outputs follow the primary VJ clip, pane layout, opacity,
effective reactive bands and playback position. They decode muted video locally;
they do not start a second audio player. Snapshots are sent every 500 ms while
a pool is loaded and immediately for playback and selection changes. Followers
seek when drift exceeds 300 ms and pause after 2.5 seconds without a playing
snapshot; decoding and display timing are not frame-accurate. Desktop window
overlays are not part of canvas export.

The main process keeps at most 100 picker-approved file paths and exposes
unguessable session-only IDs through `swvj://video/<id>`. The renderer cannot
submit a file path; replacing or clearing the pool revokes previous IDs.
Requests are restricted to approved files, GET/HEAD and single byte ranges.
The pool is not persisted. Local-file reading is streamed; no network access
or FFmpeg is required in the distributed application.

## Audio sync and parity controls

Select CSV files independently for bass, snare and hi-hat and explicitly enable
audio sync. Each CSV needs `Time_ms` and `Bass_Amplitude` columns; amplitudes
are clamped to 0–1 for the visual effect. Missing bands use live analysis.
These settings affect the VJ image, not playback audio or other engines.
Sync is disabled when the media source changes; select matching files and
re-enable it. Radio track changes on the same stream do not change the media
source, so matching and enabling CSVs remains the user's responsibility.
The files and video pool are session-only.

Parity JSON imports accept up to 16 selected files, with records containing a
binary `dst` string. **APPLY PARITY ORDER** randomly chooses up to the number
of odd-parity records, the requested limit and the pool size. **RESTORE FULL
ORDER** recovers the original pool. Alternatively, the classical 24-bit
simulation accepts up to 64 input bit strings and 10,000 measurements per
input, with progress and cancellation. It is not a Qiskit run or quantum
hardware. Imports are limited to 2 MiB in total per selection; no external
data, media or original shaders are included.

## Optional integration hooks

`window.vjStudio.getState()` returns `{items: [{id, name}], currentId, sequence,
enabled, layout, opacity, loop, envelopeProviderActive}`. IDs are opaque and change when
the pool is replaced. `select(id)` and `next()` return a boolean;
`subscribe(callback)` receives state snapshots and returns an unsubscribe
function, without emitting an initial snapshot. `items` remains the full pool;
`sequence` is the current playback order. `setSequence(ids)` applies a
nonempty array of unique IDs from that pool, retaining the current clip if
possible, and returns true; it throws on invalid IDs or duplicates without
changing the order. `setSequence(null)` restores the full pool. `select(id)`
returns false when the ID is outside the active sequence; `next()` wraps
regardless of the automatic-loop setting. Selections do not start a separate
audio player.

`setEnvelopeProvider(fn)` optionally supplies audio-reactive bands; use `null`
to restore live analysis. On each enabled, visible VJ frame `fn` receives
`{timeMs, bass, snare, hihat}`: milliseconds on the shared media clock (or
elapsed time for microphone-only recording), and normalized live bass,
midrange and treble levels respectively. Return any subset of the same three
band names as numbers; values are clamped to 0–1 and missing, nonfinite or
throwing values fall back to live levels. Bands affect VJ brightness and
saturation, not the underlying audio or other visualization engines. The
caller owns track matching, source-change handling, data parsing and
normalization. Do not register an asynchronous provider. Invalid provider
results are reported in VJ status and the console, with repeated warnings
suppressed until the provider recovers or changes. Only the resulting bounded
band values are forwarded to follower outputs; no CSV or file path is sent.

## Offline validation

Run `node --test tests\vj-studio.test.cjs tests\vj-follower.test.cjs` for behavioral tests. With local
FFmpeg and the project's installed Electron, run `node tests\vj-electron-smoke.cjs`.
The latter generates synthetic media and an isolated profile inside the project,
blocks network requests, decodes generated MP4 and WebM on primary and follower
canvases, exercises the actual CSV/parity controls with mocked dialog data,
records WebM with a fake approved picker and write destination, checks the
exported frames, and removes its files. The smoke fails on the previously
observed inline-script CSP or `syncVisual` initialization errors. It does not
exercise native dialogs, physical displays, every codec, or a packaged installer.
FFmpeg and the smoke harness are test-only, not packaged app runtime requirements.
