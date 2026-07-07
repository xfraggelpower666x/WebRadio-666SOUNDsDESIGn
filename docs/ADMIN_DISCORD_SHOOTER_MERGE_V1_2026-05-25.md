# ADMIN DISCORD SHOOTER MERGE V1 — 2026-05-25

## Built

```text
- Discord Shooter moved into Admin Overlay
- Admin tab: Discord
- SEND / CLEAR / TEST / STATUS
- SENT / FAILED / READY LED
- Discord webhook stays server-side in Worker secrets
- Legacy Discord gate remains as fallback compatibility
- Admin Auth cookie can now authorize Discord sends
```

## Security flow

```text
ADMIN Button
→ /api/admin/auth-check
→ Admin Overlay
→ Discord Shooter
→ /api/discord/manual
→ Discord Addon verifies Admin Auth or legacy gate
→ Worker Secret Webhook
```

## Important

The public separate Discord password prompt should no longer be used as primary control.
