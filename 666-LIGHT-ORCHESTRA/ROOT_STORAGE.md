# ROOT STORAGE / DEV MIRROR — 666 LIGHT ORCHESTRA

STATUS: DEVELOPMENT MIRROR (not production release).

This top-level directory was requested as an **additional** home for the complete Python app and development files. The existing `tools/666-light-orchestra/` and `docs/` originals remain unmodified.

- Python app, GUI, device registry, Windows BAT files, dependencies and tests are copied byte-for-byte using the same Git blob SHAs.
- Historical research reports live under `docs/` in this directory, alongside their original copies at repository `docs/`.
- To avoid divergent edits, **treat `tools/666-light-orchestra/` as the current development authority for now** and synchronize changes to this root mirror as part of each review/hand-off. Do not automatically switch runtime paths or web-radio startup to this root directory.
- No production deployment, BLE writes, local network/device tests or pointer changes are implied by this duplication.
- Keep `config.json`, credentials, device secrets and live logs out of Git. Only `config.example.json` is versioned.
- Draft PR #231 is the review and integration route.
