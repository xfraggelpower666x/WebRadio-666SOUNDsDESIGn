# Audit — v161 iPhone Width / Meter / Broadcast

## Geprüfte Problemstellen
1. Mobile Shell war zu breit und drückte die Außenmeter an/über den Viewport-Rand.
2. Seitliche Meter waren zwar vorhanden, aber optisch nur noch angeschnitten sichtbar.
3. Reaktivität der Meter war durch mehrere historische Override-Blöcke abgeschwächt.
4. Mobile SEND/Broadcasterposter brauchte denselben harten POST-Pfad wie PC: `/api/player-alert/send`.

## Nicht verändert
- Keine PC-Layout-Geometrie geändert.
- Keine neue Topbar erzeugt.
- Keine neuen Buttons erzeugt, außer wenn der bestehende `#mffAlertOpen` aus irgendeinem Grund fehlt.
- Keine neue Boost-Engine.
- Keine Worker-Secrets oder Webhook-Werte ausgegeben.
