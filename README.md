# RADIO_PLAYER_V1_4_RESTORE

Wiederhergestellte Version auf Basis des letzten brauchbaren Looks.

## Wichtig
- Worker ist absichtlich simpel:
  - `/` -> Player
  - `/health` -> OK
  - `/stream` -> Redirect auf Hauptstream
  - `/fallback-stream` -> Redirect auf Fallback
- Kein API-Kram
- Kein Webhook
- Play ist wieder auf Stabilität priorisiert

## Dateien
- `index.html`
- `css/main.css`
- `js/app.js`
- `config/stream.config.js`
- `workers/webradio-666soundsdesign-worker/worker.js`
