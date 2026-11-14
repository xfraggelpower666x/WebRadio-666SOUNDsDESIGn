# 666SOUNDsDESIGn — MilkDrop Cyber Studio
## Native placement: 666STREAM / WINDOWS_APP / RADIO WAVE

This is an **additive authoring and diagnostic tool** within `WINDOWS_APP` for
Radio Wave v6.66 / Soundwave Studio. It is **not** a second audio player, renderer,
app authority, or a standalone registered 666STREAM project.

Canonical source workspace:
`windows-app/SoundwaveStudio-666-PC/source-v1.18.2/`
is separately managed on `soundwave-v1-18-2-source-import-20261002`.
The studio lives beside that source. The menu integration bundles the preset authoring runtime as application resources.

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
  authoring and playback are linked by the existing .milk import.
- Do not mutate production playback, audio fallback, or `public/`.
- Use 666STREAM project-scope CodeForge to validate this WINDOWS_APP child tooling.
- No automatic paid inference, SDK reinstall, new deployments or CI runs.
- The original Tkinter studio v0.6.4 is in `preset-studio/`.
- Full real GPU Spout2 + MilkDrop, audio routing and DX shader hot-reload are OPEN.

## Evidence status

The Windows app opens the Python studio from its WINDOWS dock.
Windows GUI/GPU/audio end-to-end: OPEN.
Host acceptance and source-branch promotion: NOT PERFORMED.

Return anchor: `666STREAM WINDOWS_APP / MILKDROP_CYBER_STUDIO / R16`.
Prechange backup: `backup/pre-radio-wave-milkdrop-scope-correction-20261107`.


## Radio Wave · MilkDrop Cyber Studio

Open **WINDOWS → MilkDrop Cyber Studio** in the Radio Wave dock. The same
entry works when the dock is detached. It opens the bundled Preset Studio
v0.6.4 in its own window. Python 3.10+ with Tcl/Tk is required. Optional
Python modules for drag-and-drop, image conversion and device discovery can
be installed separately in that Python environment.

The integrated studio stores its library, settings and startup logs in
Radio Wave's Electron user-data directory under `milkdrop-cyber-studio`.
Use **Choose Library** in the studio to open an existing collection. Use
**MilkDrop Studio → Import .milk** in Radio Wave to load an authored preset.

NSIS, portable and the legacy packager carry the Python studio files as
external application resources so Python can read them from disk.
The original batch entry still opens the command-line effect lab.
