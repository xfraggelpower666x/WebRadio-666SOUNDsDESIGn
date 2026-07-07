# AUDIT v171 — KV / Dual Discord / Manual EQ Nudge

Basis: v170 / aktueller Root-Player-Stand.

Geändert:
- Keine Player-Skalierung.
- Grafischer Haupt-EQ / Visualizer nicht angefasst.
- Nur unterer manueller PC-EQ `#pcRealEqPanel` per finalem CSS-Override ca. 2.4 cm nach rechts verschoben.
- Doppelte Mirror-EQ-Instanz `#pcRealEqPanelMirror` wird entfernt/verborgen.
- sichtbare Version auf V171 eingefroren.
- Worker nutzt weiterhin `PLAYER_ALERT_KV` wenn als Cloudflare-Binding vorhanden.
- Dual Discord bleibt über Secrets `DISCORD_WEBHOOK_URL` und `DISCORD_WEBHOOK_URL2`.

Nicht geändert:
- Seitliche Add-on-Panels.
- großer grafischer EQ.
- Stream-/Audio-Engine.
- echte Webhook-URLs werden nicht ins Repo geschrieben.
