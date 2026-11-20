# SoundwaveStudio 666 Integration Architecture

## Ownership hierarchy
0. SOUNDWAVE CORE — UI, local playback, classic canvas renderer, export. PRESERVE.
1. SOURCE ARBITER — LOCAL / 666 RADIO / SOUNDCLOUD.
2. SHARED AUDIO PIPELINE — one Web Audio analysis path for every playable source.
3. VISUAL ENGINES — Soundwave Classic plus additive CaYaDev-derived Analyzer/Spectrum/Shader/3D/MilkDrop modules.
4. PRESENTATION — responsive viewport, fullscreen and selectable display output.
5. 666 RADIO SERVICES — NowPlaying, admin auth, AutoDJ Skip, Player Messenger, Discord.

## Hard locks
- Production WebRadio is never mutated by this desktop application.
- Soundwave UI/offline player are owners, not donor modules.
- CaYaDev code is a module donor under its MIT notice; no CAYADEV UI replacement.
- Radio credentials/tokens must remain main-process only.
- SoundCloud is a source adapter; OBS is not a dependency.
- Multi-display must be additive and recover safely when a display is removed.

## Integration gates
- Phase A: source arbitration + responsive/fullscreen shell + display discovery.
- Phase B: 666 main-process remote adapters and radio controls.
- Phase C: Analyzer/Spectrum activation.
- Phase D: WebGL Shader/3D and complete MilkDrop dependency closure.
- Phase E: synchronized second-display visual output and performance soak tests.

The donor MilkDrop/3D files are intentionally staged but MUST NOT be declared runtime-active until their dependency closure and render tests pass.

## v1.2 hierarchy promotion
- Presentation owner: Soundwave Studio.
- Audio source owner: Source Arbiter (Local / 666 Radio / SoundCloud adapter).
- Local file bytes stay in main-process file transport; output renderers consume the internal `swmedia` bridge rather than duplicated base64.
- Visual engines are plugins over Soundwave's shared audio frame: Classic, Spectrum, Analysis, ShaderHost, Geometry3D. MilkDrop remains gated.
- Output windows are presentation replicas only. They do not own radio credentials, admin state or production mutation authority.
- Multi-display topology changes are runtime events, not restart-only configuration.

## Pass-2 status
Promoted in v1.2.0: local streamed media bridge, Local dual-output source sync, display hotplug refresh, selectable 3D geometry, selectable ShaderHost scenes, renderer security hardening. MilkDrop and SoundCloud resolver remain gated.

## Pass-2 status
Promoted in v1.2.0: local streamed media bridge, Local dual-output source sync, display hotplug refresh, selectable 3D geometry, selectable ShaderHost scenes, renderer security hardening. MilkDrop and SoundCloud resolver remain gated.

## v1.4.0 controlled extensions
- SoundCloud uses a main-process confidential-client adapter; secrets never enter renderer/preload.
- `swsc://audio/current` keeps SoundCloud playback inside Soundwave's existing audio/analyser ownership model.
- Output windows are followers for both source state and visual state; the main Soundwave window is leader.
- Imported `.milk` source is bounded and propagated as visual state only after explicit user selection.
