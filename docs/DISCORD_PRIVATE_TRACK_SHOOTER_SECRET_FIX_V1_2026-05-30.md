# DISCORD PRIVATE TRACK SHOOTER SECRET FIX V1 — 2026-05-30

## Änderung

Der Discord-Private-Trackpost-Build akzeptiert jetzt zusätzlich dein bereits vorhandenes Cloudflare Secret:

```text
PRIVATE_TRACK_SHOOTER
```

## Wirkung

Kein neues Secret nötig.

Der Worker sucht jetzt private Track-Webhooks unter:

```text
DISCORD_PRIVATE_TRACK_WEBHOOK_URL
DISCORD_PRIVATE_WEBHOOK_URL
DISCORD_RUBY_TRACK_WEBHOOK_URL
DISCORD_TRACK_PRIVATE_WEBHOOK
PRIVATE_DISCORD_WEBHOOK_URL
PRIVATE_TRACK_SHOOTER
```

## Wichtig

Die Webhook-URL bleibt als Cloudflare Secret gespeichert.
Nichts wird ins Frontend oder GitHub geschrieben.
