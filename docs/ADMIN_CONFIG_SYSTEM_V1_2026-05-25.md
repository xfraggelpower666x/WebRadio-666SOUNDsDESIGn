# ADMIN CONFIG SYSTEM V1 — 2026-05-25

## Status

The protected Admin Config system is active in this package.

## Worker routes

```text
GET  /api/admin/config/current
GET  /api/admin/config/backups
POST /api/admin/config/update
POST /api/admin/config/rollback
GET  /api/admin/auth-check
GET  /api/admin/debug
```

## Runtime config

```text
config/radio-runtime.json
```

Contains stream URLs, Chaos/Dark-Dancer links, status endpoints and cache-burst marker.

No secrets belong in this JSON.

## Backup / commit workflow

```text
Admin Overlay
→ /api/admin/config/current
→ edit config
→ /api/admin/config/update
→ write backup:
   config/backups/radio-runtime.<timestamp>.back.json
→ write latest backup:
   config/backups/radio-runtime.latest.back.json
→ commit config/radio-runtime.json through GitHub API
→ Cloudflare auto-deploy starts
```

## Rollback workflow

```text
Admin Overlay
→ /api/admin/config/rollback
→ restore config/backups/radio-runtime.latest.back.json
→ commit restored config
→ Cloudflare auto-deploy starts
```

## Required ENV / Secrets

```text
ADMIN_AUTH_VERIFY_URL
ADMIN_AUTH_LOGIN_URL
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_CONFIG_PATH
GITHUB_BACKUP_DIR
```

## Safety

```text
- GitHub token must be Worker secret only.
- No frontend secrets.
- No secrets in radio-runtime.json.
- Backup is written before update.
- Rollback uses latest backup.
```
