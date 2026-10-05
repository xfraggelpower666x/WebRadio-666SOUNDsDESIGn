# SoundwaveStudio 666 v1.16.0 — FORCE GO FULL PYTHON HOST HARDENING

STATUS=SOURCE_CANDIDATE
FREEZE=NO
PRODUCTION_WEBRADIO_MUTATION=NONE
SOUNDWAVE_UI_OWNER=PRESERVED
PYTHON_HOST=ADDITIVE_WINDOWS_ORCHESTRATOR

VERIFIED_SOURCE_STATIC:
- v1.15.0 baseline rehydrated: 101/101 gates + release integrity PASS before mutation.
- Critical Python-host build defect repaired: BUILD PORTABLE now calls the existing release-gated `npm run package`, not nonexistent `npm run build`.
- Python host now performs Node/npm/package preflight before start/check/build.
- Electron dependency readiness is checked before START/BUILD; dependency installation is an explicit `INSTALL DEPS` user action only.
- Optional SoundCloud client ID/secret can be entered in the host and are handed to Electron through the child-process environment only; Python host never persists them.
- Tkinter background maintenance output/status is marshalled onto the UI event loop.
- Concurrent maintenance tasks are blocked to prevent overlapping integrity/build jobs.
- Windows STOP terminates the Electron child process tree via taskkill /T /F.
- OPEN DIST control added.
- Explicit optional PyInstaller one-file host EXE builder added; it never installs dependencies automatically.
- Existing Messenger/Discord/SoundCloud/radio-resilience v1.15 logic preserved.
- Production WebRadio mutation remains NONE.
- 109/109 static integration gates PASS.
- 22/22 JS/CJS syntax PASS.
- Python py_compile PASS.
- release secret/mutation scan PASS.
- release integrity PASS.

READBACK_PENDING:
- Real Windows Python-host GUI launch/readback.
- Optional PyInstaller host EXE build/readback (PyInstaller unavailable in current Linux audit environment).
- Windows Portable Electron EXE build/readback.
- Forced MAIN→FALLBACK→DEGRADED→MAIN network test.
- Player Messenger live current/history/status provider-shape readback.
- Discord live auto track-change after authenticated login.
- SoundCloud live credentials/playlist/bad-track recovery.
- GPU/WebGL2 Shader/3D/MilkDrop, mixed-DPI/hotplug, long GPU/RAM soak and measured dual-display drift.

FREEZE=NO
