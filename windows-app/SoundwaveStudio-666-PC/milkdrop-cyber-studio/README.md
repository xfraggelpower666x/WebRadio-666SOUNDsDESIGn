# 666SOUNDsDESIGn — MilkDrop Cyber Studio
## Native placement: 666STREAM / WINDOWS_APP / RADIO WAVE

This is an **additive authoring and diagnostic tool** within `WINDOWS_APP` for
Radio Wave v6.66 / Soundwave Studio. It is **not** a second audio player, renderer,
app authority, or a standalone registered 666STREAM project.

Canonical source workspace:
`windows-app/SoundwaveStudio-666-PC/source-v1.18.2/`
is separately managed on `soundwave-v1-18-2-source-import-20261002`.
This directory is kept **adjacent**, not silently bundled into that frozen source.

## Scope and provenance

Previous wrong-scope development:
`projects/666-MILKDROP-CYBER-STUDIO/` (R14-R15 development branch).
The 9 studio-owned files are copied byte-for-byte here after their validated R15
q-variable smoothing repair. Their old namespace will be retired only after
direct GitHub readback. No upstream MilkDrop3, XorDev or projectM code is bundled.

## Windows entry

From this directory run:
`CYBER_EFFECT_LAB_666SD.bat`.
Python 3 is required for the independent preset generator and inventory.
Generated presets are saved under `reports/` with exclusive-create semantics.

## Architecture

- **SOUNDWAVE_ONLY audio owner**, real audio signals only.
- Native MilkDrop controls and Radio Wave overlay remain in `source-v1.18.2`;
  integration with these requires source-version, native app and host validation.
- Do not mutate production playback, audio fallback, or `public/`.
- Use 666STREAM project-scope CodeForge to validate this WINDOWS_APP child tooling.
- No automatic paid inference, SDK reinstall, new deployments or CI runs.
- Python Tkinter studio v0.6.x and repair R11/R12 remain separate local artifacts;
  this is not yet a complete GUI migration.
- Full real GPU Spout2 + MilkDrop, audio routing and DX shader hot-reload are OPEN.

## Evidence status

Migration source readback + project-map correction: expected after git publish.
Native Radio Wave connection: OPEN.
Windows GUI/GPU/audio end-to-end: OPEN.
Host acceptance and source-branch promotion: NOT PERFORMED.

Return anchor: `666STREAM WINDOWS_APP / MILKDROP_CYBER_STUDIO / R16`.
Prechange backup: `backup/pre-radio-wave-milkdrop-scope-correction-20261107`.
