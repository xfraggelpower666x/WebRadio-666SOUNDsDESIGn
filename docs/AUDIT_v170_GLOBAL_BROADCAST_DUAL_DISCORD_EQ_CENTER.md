# AUDIT v170 GLOBAL BROADCAST + DUAL DISCORD + PC EQ CENTER

Created/Modified: 2026-05-18

## Basis
Aktuell vom Nutzer hochgeladenes funktionierendes Repo-ZIP.

## Änderungen
- Worker /api/player-alert/* auf v170 erweitert:
  - nutzt PLAYER_ALERT_KV wenn Cloudflare-KV-Binding existiert
  - fallback auf caches.default bleibt erhalten
  - Antwort meldet storage: kv oder cache-edge-fallback
- Player-Broadcast sendet optional zusätzlich an Discord Webhook 1 + 2:
  - DISCORD_WEBHOOK_URL
  - DISCORD_WEBHOOK_URL2
- Discord Add-on selbst kann ebenfalls beide Webhooks bedienen.
- PC grafischer Haupt-EQ / Visualizer wurde nicht verändert.
- Nur unterer realer 10-Band-EQ wird zentriert/skaliert.
- Version sichtbar auf V170 eingefroren, damit alte v162/v164 Styleblöcke nicht optisch zurückschreiben.

## Wichtig
Für echte deutschlandweite Player-zu-Player-Messages muss in Cloudflare ein KV-Namespace als Binding `PLAYER_ALERT_KV` verbunden werden.
Ohne KV bleibt der Fallback `cache-edge-fallback`, der je nach Cloudflare-Edge/Region nur lokal/regional sichtbar sein kann.
