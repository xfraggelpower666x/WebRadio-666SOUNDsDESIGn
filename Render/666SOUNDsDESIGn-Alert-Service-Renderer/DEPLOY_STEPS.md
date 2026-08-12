# Deploy Steps — Current Player Alert Backend

## Authority
- This `Render/666SOUNDsDESIGn-Alert-Service-Renderer/` folder is the canonical backend source.
- Do **not** create a parallel Player Alert backend or a new WebRadio Worker.
- The production WebRadio Worker remains the public bridge and keeps Render primary with the existing global Durable Object fallback.

## Render service
Use the existing/current Player Alert backend service identity:
`666soundsdesign-audio-player-alert-backend`

Build command:
`pip install -r requirements.txt`

Start command:
`uvicorn src.server:app --host 0.0.0.0 --port $PORT`

Health check:
`/health`

## Required production environment
Set these values in the Render dashboard/service environment. Never commit their secret values.

- `PLAYER_ALERT_SERVICE_TOKEN` — required; must match the server-side Worker secret used for authenticated writes.
- `DATABASE_URL` — required for production release readiness; must point to shared PostgreSQL storage.
- `REQUIRE_SHARED_PERSISTENCE=true`
- `MASTER_ADMIN_PASSWORD` — required only for protected admin/audio-processing routes that use it.

Non-secret defaults are documented in `.env.example` and `render.yaml`.

## Release-ready verification
`GET /health` must report all of the following:

- `ok: true`
- `database_backend: "postgres"`
- `database_ok: true`
- `shared_persistence: true`
- `shared_persistence_required: true`
- `player_alert_write_auth_configured: true`
- `release_ready: true`

Then verify:

- `GET /api/player-alert/status`
- `GET /api/player-alert/current`
- `GET /api/player-alert/history`
- OpenAPI contains `POST /api/player-alert/send`

Do not perform a synthetic production `POST /api/player-alert/send` unless a user-visible live alert is intended.

## WebRadio integration
The WebRadio production Worker already owns the bridge. Keep its existing `PLAYER_ALERT_BACKEND_URL`, server-controlled rate identity, Durable Object global fallback and cache-tertiary safety path. Do not add a second Worker or browser-side secret.
