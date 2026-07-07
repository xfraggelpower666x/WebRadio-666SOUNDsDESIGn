# PLAYER ALERT RENDER BACKEND v185

Adds backend-primary WebRadio broadcast routes:

- GET `/api/player-alert/status`
- POST `/api/player-alert/send`
- GET `/api/player-alert/current`
- GET `/api/player-alert/history`

Worker setting:

```txt
PLAYER_ALERT_BACKEND_URL=https://<render-service>.onrender.com
```

The Worker appends `/api/player-alert` automatically if the ENV points to the root URL.

KV remains only Worker fallback.
