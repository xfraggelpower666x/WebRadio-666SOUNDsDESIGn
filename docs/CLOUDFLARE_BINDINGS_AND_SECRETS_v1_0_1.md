# Cloudflare Bindings und Secrets – v1.0.1

## Root-Worker

Pflicht bzw. produktiv relevant:

- `ADMIN_AUTH_URL`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `PLAYER_ALERT_SERVICE_TOKEN`
- `PLAYER_ALERT_WRITE_TOKEN` – optional für vertrauenswürdige Maschinen-Clients; Browser-SEND kann die Same-Origin-Admin-Sitzung verwenden
- `SKIP_TARGET_URL`
- `SKIP_API_TOKEN` oder `SKIP_API_KEY`

Optional:

- `DEBUG_TOKEN`
- `RADIO_CONFIG_KV` – sofortiger Runtime-Read-back der Admin-Konfiguration
- `PLAYER_ALERT_KV` – zusätzlicher Worker-seitiger Alert-Cache

`ENABLE_PUBLIC_DEBUG` bleibt im Produktivbetrieb auf `false`.

## Render-Service

- `MASTER_ADMIN_PASSWORD`
- `PLAYER_ALERT_SERVICE_TOKEN` – muss mit dem Root-Worker-Secret übereinstimmen
- `DATABASE_URL` – optional PostgreSQL; ohne Wert nutzt der Dienst lokale SQLite-Ablage
- `ALLOWED_ORIGINS`

## Externer Chaos-Worker

- `ADMIN_AUTH_URL`
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS`
- optional `DEBUG_TOKEN`

## Externer Suno-Worker

- `ADMIN_AUTH_URL`
- `SUNO_API_KEY`
- `SUNO_API_BASE_URL`
- Provider-Pfade und Feldnamen gemäß `.dev.vars.example`
- optional `SUNO_JOBS_KV`
- `ALLOWED_ORIGINS`
- optional `DEBUG_TOKEN`

Keine echten Secrets in GitHub committen.
