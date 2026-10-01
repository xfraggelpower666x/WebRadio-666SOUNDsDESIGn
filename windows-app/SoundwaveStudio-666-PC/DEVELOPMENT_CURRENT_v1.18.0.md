# Soundwave Studio 666 PC — development mirror

Canonical development directory at repository root: `windows-app/SoundwaveStudio-666-PC/`.

## Current source candidate
- Version: 1.18.0
- State: SOURCE_CANDIDATE; FREEZE=NO
- Original Soundwave Studio master is the UI, offline playback and visualizer base.
- 666 Radio, SoundCloud catalog, Python orchestration and CaYatur/MilkDrop modules are additive.
- Production WebRadio mutation: NONE.
- PFS child: SOUNDWAVE-34001 / 666PFS-SOUNDWAVE-PC-001.
- Local candidate SHA-256: `69264f9bc65e079987de29d56ff02ccffc96ce91d0b35363943c9b0416f7957c`.

## Preservation / remaining work
The existing v1.16 README and manifest are historical and not the current development baseline. Full v1.18 source ZIP and unpacked source have not yet been committed into this GitHub directory. Real Windows EXE build, audio/GPU tests, SoundCloud credentials and remote service readbacks remain pending.

## Isolation
This is a development mirror. Do not alter production WebRadio paths, Cloudflare Worker or STREAM-5001 from here. Never commit secrets, credentials, .env, node_modules or build caches.
