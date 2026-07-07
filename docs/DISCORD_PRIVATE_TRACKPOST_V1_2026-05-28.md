# DISCORD PRIVATE TRACKPOST V1 — 2026-05-28

## Zweck

Trackwechsel-/Now-Playing-Posts sollen zusätzlich in einen privaten Discord-Kanal gehen.

## Umsetzung

Die bestehende Route bleibt:

```text
/api/discord/nowplaying
```

Sie sendet weiterhin an den normalen Haupt-Webhook.

Zusätzlich wird derselbe Trackwechsel-Post an einen privaten Webhook gespiegelt, wenn eines dieser Worker-Secrets gesetzt ist:

```text
DISCORD_PRIVATE_TRACK_WEBHOOK_URL
DISCORD_PRIVATE_WEBHOOK_URL
DISCORD_RUBY_TRACK_WEBHOOK_URL
DISCORD_TRACK_PRIVATE_WEBHOOK
PRIVATE_DISCORD_WEBHOOK_URL
```

## Empfohlenes Secret

```text
DISCORD_PRIVATE_TRACK_WEBHOOK_URL
```

## Wichtig

Kein Webhook wird ins Frontend geschrieben.
Kein Token wird in GitHub gespeichert.
Backup/Stream/Audio/Player wurden nicht geändert.
