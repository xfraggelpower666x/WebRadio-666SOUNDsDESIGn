# BROADCAST ALERT v152 CLICK FIX

## Problem

Der SEND-Button war sichtbar, aber auf PC nicht zuverlässig anklickbar.

Wahrscheinliche Ursache:
- Die Broadcast-Box war absolut auf `.now-playing` positioniert.
- Player-/Ticker-/Cover-Layer konnten Klicks überdecken.
- Dadurch war das Element sichtbar, aber pointer/click kam nicht zuverlässig beim Button an.

## Fix

- Broadcast-Box liegt jetzt inline in `.section-topline`, direkt neben History.
- Keine neue Zeile.
- Keine Playerhöhe-Erweiterung.
- Kein neuer Player-Wrapper.
- `z-index` und `pointer-events` explizit gesetzt.
- Zusätzlicher delegierter Click-Fallback im JS:
  - `#playerAlertPcSend`
  - `[data-player-alert-send]`

## Beibehalten

- `/api/player-alert/send`
- `/api/player-alert/current`
- Sender bekommt eigene Nachricht nicht zurück
- Rate Limit
- Plain Text
- 240 Zeichen
