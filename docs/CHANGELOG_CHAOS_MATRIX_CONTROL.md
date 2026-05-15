# CHANGELOG — CHAOS MATRIX CONTROL FULL REPO

## 2026-05-15

### Added
- Full CHAOS MATRIX SAGA control HTML page.
- Public Worker endpoint `/chaos-system`.
- Alias endpoint `/chaos`.
- Safe API test endpoint `/api/suno-test`.
- Safe prompt receive endpoint `/api/suno-generate`.
- Repo-root file `chaos-matrix-control.html`.
- Documentation in `docs/`.

### Security
- No secrets stored in repo.
- ENV/Secrets expected via Cloudflare.
- API generate endpoint is dry-run/safe-mode by default.

### Preservation
- Existing Worker/player architecture preserved.
- Add-only route integration.
- Existing `/health` and `/debug` behavior intended to remain untouched.


## 2026-05-15 — ENV / Secrets Deploy Integration

### Added
- Wrangler JSONC secret-name declaration for `SUNO_API_KEY` and `SUNO_API_BASE`.
- `keep_vars: true` to preserve dashboard-managed variables during deploy.
- `.dev.vars.example` for local-only Wrangler testing.
- `docs/CLOUDFLARE_ENV_SECRET_DEPLOY_RULES.md`.

### Safety
- No secret values added to repo.
- No existing secrets deleted.
- No destructive secret commands included.


## 2026-05-15 — Deploy-Safe Secret Config Correction

### Changed
- Active `wrangler.jsonc` now uses `keep_vars: true` only.
- Removed active `secrets.required` from live config to prevent auto-deploy failure when SUNO secrets are not yet configured.
- Added `wrangler.secrets.required.example.jsonc` as optional later-use helper.

### Reason
- `secrets.required` is valid Wrangler syntax, but Cloudflare can fail deployment if required secrets are missing.
- Existing Worker, emergency player, stream routes and Discord routes remain untouched except for additive Chaos routes.
