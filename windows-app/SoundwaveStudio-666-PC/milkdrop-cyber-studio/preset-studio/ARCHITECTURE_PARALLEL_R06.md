# 666SD MilkDrop Cyber Studio – Parallel R06

## Preservation

v0.5.0 is the baseline; all original preset-generation/import/export/assets/UI/launch code is carried forward. The v0.6.0 settings module is additive. Preset files are not migrated or overwritten.

## Verified vs not yet integrated

- VERIFIED: JSON settings schema, explicit save, atomic replacement, validation, GUI dialogs and display-geometry test. Python tests run in Linux CI-like environment.
- PARTIAL: device enumeration through optional `sounddevice`; no actual audio capture/bridge in the current release.
- PROPOSED: native Windows WASAPI capture service with endpoint-level loopback, process tree capture, and audio band / PCM bridge to native renderer.
- PROPOSED: Chromium browser extension (Chrome, Edge) using `chrome.tabCapture` on explicit user action plus an opt-in loopback/PCM transport to local studio. Maintain audio output to the browser user.
- OPEN: Firefox separately supported tab API or constrained capture strategy (no guarantee of parity).
- BLOCKED: Safari per-tab Windows capture. No modern Windows Safari support.
- OPEN: Native renderer configuration / GPU adapter enumeration, external window placement, transparent GPU overlay, cross-monitor DPI policy, renderer shader settings readback, fullscreen/overlay behavior.

## Architecture – separate return anchors

1. SETTINGS: `src/studio_settings.py` → GUI settings dialog → persisted `gui_settings.json`.
2. DISPLAY: user preferences and geometry test work; GPU window needs a native renderer adapter (not a Tkinter mock).
3. AUDIO: source presets and capability stage; native audio service not integrated.
4. BROWSER: consent-based Chrome/Edge tabCapture extension; Firefox research; Safari Windows blocked.
5. VARIABLES: q1..q32 from preset init into per-frame, per-vertex, wave, shape and shaders. Per-frame q reset to init defaults each frame; not persistent across frames except persistent custom values in init/per-frame pool. t1..t8 init/per-frame separate per each custom wave and shape. Do not share custom pools automatically.
6. HOST/LICENSE: renderer EXE selected explicitly, not bundled, and Windows GPU/audio parity untested. Uploaded `LICENSE.txt` says MilkDrop3 free for personal use only; professional/commercial use requires an appropriate license. Independent renderer source components may have their own license terms.

## Key design limits

- No automatic write to Windows system audio configuration or browser permissions.
- No automatic update of installed GPU drivers, browsers, or MilkDrop EXEs.
- No guessing GPU adapter indexes; selection requires native discovery and readback.
- For direct 3D in MilkDrop, the provided 2009 Martin tutorial demonstrates inverse projection via shader uv to uv2 mapping; this is not a general 3D object renderer. Near-horizon divisions need guarding in production shaders.
- Existing `START_STUDIO.bat`, `CHECK_TOOLS.bat`, `MAKE_EXE.bat` stay in place, using project-local venv.
- Actual Windows build and GPU renderer tests need Windows host execution.

## Next integration gates

- [ ] Native Windows audio endpoint enumeration and stream callback actually feeding a renderer.
- [ ] Process loopback per Microsoft Windows sample on supported OS builds.
- [ ] Chrome/Edge extension permission + streaming bridge + user-initiated capture and audio playback.
- [ ] Native renderer protocol / renderer config controlled with readback.
- [ ] User-selectable monitor resolution and GPU window placement applied to real HWND.
- [ ] FPS / shader / texture / GPU settings readback on real device.
- [ ] Windows host smoke tests, portable EXE build, second-device EXE launch.


## R07 / v0.6.3 — Shader-Palette
- Native Shader-Farbbearbeitung als Preset-Arbeitskopie: implementiert; alle fremden HLSL-Blöcke geschützt.
- C-Taste und Button im Editor: implementiert, C greift nicht in Textfelder ein.
- Echtzeit GPU Shader-Recompile: OFFEN (keine verifizierte Renderer-API).
- Vorhandene R06-Arbeitsstränge bleiben erhalten.
