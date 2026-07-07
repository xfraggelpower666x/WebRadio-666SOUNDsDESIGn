# v172 — SEND STATUS / VERSION / MANUAL EQ NUDGE FIX

Created: 2026-05-18

## Änderungen
- Unterer manueller PC-EQ nur weiter nach rechts verschoben: `left: calc(50% + 3.7cm)`.
- Grafischer Haupt-EQ wurde nicht angefasst.
- Player-Sendestatus zeigt nicht mehr vorrangig Discord-Erfolg, sondern Player-Broadcast-Ergebnis (`SENT GLOBAL`, `SENT LOCAL EDGE`, `FAILED`).
- Discord Dual-Webhook bleibt Worker-seitig aktiv.
- Versionsanzeige auf PC/iPhone stabil auf `V172`; doppelte iPhone-Version-Badges werden im bestehenden DOM bereinigt, ohne neuen sichtbaren Layer.
- Keine Webhook-URLs im Code/ZIP.

## Cloudflare Bindings
- `PLAYER_ALERT_KV` muss als KV Binding am Worker hängen.
- `DISCORD_WEBHOOK_URL` und `DISCORD_WEBHOOK_URL2` bleiben Secrets.
