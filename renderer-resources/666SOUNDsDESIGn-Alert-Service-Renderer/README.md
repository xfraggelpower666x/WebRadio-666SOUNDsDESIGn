# 666SOUNDsDESIGn Alert Service Renderer

FastAPI-Service für Player-Alerts und den optionalen Audio-Prozess-Endpunkt.

## Authentifizierung

- Browser-Adminlogin findet nicht in diesem Service statt.
- `POST /process` ist ausschließlich Service-zu-Service und benötigt `x-player-alert-service-token`.
- Das Secret wird als `PLAYER_ALERT_SERVICE_TOKEN` in Render und im aufrufenden WebRadio-Worker identisch gesetzt.
- Es gibt keinen direkten Passwortheader und keinen lokalen Admin-Passwortcache.
- `GET /health` meldet nur Erreichbarkeit.

## Start

```text
pip install -r requirements.txt
uvicorn src.server:app --host 0.0.0.0 --port $PORT
```

## Runtime

`ffmpeg` und `ffprobe` müssen verfügbar sein. Ohne `DATABASE_URL` wird SQLite verwendet.
