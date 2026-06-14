# PLAYER REPO STRUCTURE AWARENESS

This renderer/backend repo is separate from the Player repo.

It must be aware that the Player repo may contain:

```text
worker.js
index.html
assets/
css/
js/
config/
worker-addons/
CHAOS_ENGINE/
```

## New Admin Runtime Config

```text
config/radio-runtime.json
config/backups/
config/admin-runtime.env.example
```

## New Admin API Endpoints

```text
GET  /api/admin/config/current
GET  /api/admin/config/backups
POST /api/admin/config/update
POST /api/admin/config/rollback
```

## Renderer endpoints added

```text
GET /player-structure
GET /deploy-manifest
```

## Rule

Renderer and Player stay separate.
Renderer must not assume Chaos Engine belongs to Renderer repo.
