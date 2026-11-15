# RADIO WAVE v6.66 — Stage 2 Branding + Cyber Intro

DATE=2026-10-10
SYSTEM=666STREAM
PROJECT=WINDOWS_APP
STATUS=STAGE2_IMPLEMENTED_FOCUSED_READBACK_PASS

BASE_SOURCE_HEAD=8d0d943b0a0e79ca4f903947d2b283c0ecaa4ce9
PRECHANGE_RECOVERY_BRANCH=backup/pre-radio-wave-branding-intro-stage2-20261010

BRANDING:
- Supplied RADIO WAVE banner embedded in repository package data.
- Supplied app-icon artwork embedded.
- Supplied in-app logo embedded.
- Supplied stage artwork embedded.
- Branding images use proportional contain fitting.
- Important motif cropping remains forbidden.
- Missing optional branding fails soft and never breaks Soundwave playback.
- Stream artwork remains authoritative.
- Stream artwork is never replaced by branding when supplied.
- Branding fallback is used only when stream artwork is absent or unavailable.
- HD/high-resolution stream artwork remains preferred.
- Radio stream artwork is displayed in an enlarged contain-fitted status panel rather than stretched behind the visualizer.

WINDOWS ICON:
- Windows ICO is embedded as base64 build data.
- prepare-radio-wave-branding.cjs decodes the ICO before build.
- Readback verifies decoded icon bytes.
- Electron/NSIS use build/radio-wave-v6.66.ico.
- Main BrowserWindow uses the same generated icon when present.

CYBER INTRO:
- Dedicated lightweight intro BrowserWindow.
- Main RADIO WAVE/Soundwave window loads hidden in parallel.
- Phase 1 initializing.
- Phase 2 Soundwave Core loading.
- Phase 2 synchronization.
- SYSTEM ONLINE blinks/fades exactly three times.
- SYSTEM ONLINE remains visible for two seconds.
- Intro is one-shot; no loop.
- Renderer calls intro:complete once.
- Main process hands off lyvra:system-start.
- Main window maximizes and becomes visible only after main-ready + intro-complete.
- Intro BrowserWindow is destroyed after handoff to release memory.
- 14-second fail-safe prevents startup deadlock.
- Renderer receives and dispatches lyvra:system-start as a CustomEvent.

FOCUSED_READBACK:
- main.js syntax PASS
- intro-preload.js syntax PASS
- src/intro.js syntax PASS
- src/integration/666-integration.js syntax PASS
- scripts/prepare-radio-wave-branding.cjs syntax PASS
- build/windowsIconBase64.cjs syntax PASS
- package.json parse PASS
- NSIS target PASS
- RADIO WAVE icon path PASS
- intro-preload packaging PASS
- intro HTML SYSTEM ONLINE PASS

NO_BROAD_SOUNDWAVE_RETEST=TRUE
PRODUCTION_WEBRADIO_MUTATION=NONE
SOUNDWAVE_CORE=PRESERVE
RADIO=ADDITIVE_ADDON
