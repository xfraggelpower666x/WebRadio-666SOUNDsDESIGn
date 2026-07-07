# BROADCAST MESSAGE HISTORY V189

Ziel: Player-zu-Player Broadcast bekommt eine History wie die Track-History, aber getrennt für Nachrichten.

Umsetzung:
- PC und iPhone bekommen einen kleinen `LOG` Button neben dem bestehenden SEND Bereich.
- Das Overlay lädt `GET /api/player-alert/history?limit=20`.
- Es werden maximal 20 Nachrichten angezeigt.
- SEND, Worker-Routen, Discord, Backend, Audio und EQ wurden nicht verändert.
- Verstecktes Overlay blockiert keine Klicks (`pointer-events:none`).

