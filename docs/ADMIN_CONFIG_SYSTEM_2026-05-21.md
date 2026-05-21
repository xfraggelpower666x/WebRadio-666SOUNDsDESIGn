# ADMIN CONFIG SYSTEM — 2026-05-21

## Flow

```text
Radio-System bleibt stabil
↓
zentraler Auth/PW-Worker
↓
Admin-Overlay
↓
GitHub API Config-System
↓
Auto-Backup
↓
GitHub Commit
↓
Cloudflare Auto-Deploy
```

## Endpunkte

```text
GET  /api/admin/config/current
GET  /api/admin/config/backups
POST /api/admin/config/update
POST /api/admin/config/rollback
GET  /api/admin/auth-check
GET  /api/admin/debug
```

## Config

```text
config/radio-runtime.json
config/backups/radio-runtime.<timestamp>.back.json
config/backups/radio-runtime.latest.back.json
```

## ENV

```text
ADMIN_AUTH_VERIFY_URL
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_CONFIG_PATH
GITHUB_BACKUP_DIR
```

## Schutz

- Kein KV
- Kein D1
- Keine Secrets im Repo
- Kein Cloudflare-Dashboard-Gefummel für normale Stream-Änderungen
- Radio-Worker bleibt im Root
- Root-Struktur bleibt erhalten
