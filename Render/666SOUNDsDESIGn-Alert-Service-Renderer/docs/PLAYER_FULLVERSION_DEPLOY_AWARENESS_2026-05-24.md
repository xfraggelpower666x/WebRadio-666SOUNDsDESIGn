# PLAYER FULLVERSION DEPLOY AWARENESS — 2026-05-24

This Renderer repo must recognize the new Player full-version structure.

## Preserve these Player paths

```text
worker.js
index.html
wrangler.jsonc
assets/
css/
js/
config/
worker-addons/
CHAOS_ENGINE/
external-workers/
```

## New paths

```text
CHAOS_ENGINE/
├── index.html
├── track-factory.html
├── fraggle-detlef-system.html
└── assets/

external-workers/
├── 666-chaos-ai-track-system/
└── 666-suno-system/
```

## Critical rules

- Do not flatten nested directories.
- Do not remove `external-workers/`.
- Do not mix external worker code into the audio worker root.
- Do not delete `worker.js`, `index.html`, `config/`, `worker-addons/` or `CHAOS_ENGINE/`.
- Do not commit real secrets.
