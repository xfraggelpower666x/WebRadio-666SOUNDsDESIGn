# Dashboard Endpoint Contract v1.0.1

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Dokumenttyp:** API-Kontrakt / Dashboard-Integration  
**Status:** PASS mit Fallback  
**Secrets:** Keine Secrets im Frontend.

## GET /api/nowplaying

Erwartete mögliche Felder. Das Dashboard ist tolerant und akzeptiert mehrere Namen.

```json
{
  "nowplaying": "Artist - Title",
  "artist": "Artist",
  "title": "Title",
  "dj": "666 DJ",
  "listeners": 12,
  "maxlisteners": 100,
  "bitrate": 320,
  "status": "online"
}
```

Unterstützte Alternativfelder:

```text
nowPlaying, song, songtitle, track, current_song,
servertitle, current_artist, listener_count,
currentlisteners, peaklisteners, kbps, stream_bitrate,
djusername, djstatus, client, streamer
```

## GET /api/discord/status

```json
{
  "enabled": true,
  "configured": true,
  "channel": "radio-log"
}
```

## POST /api/discord/message

Request:

```json
{
  "message": "Text für Discord",
  "gateCode": "optional"
}
```

Response:

```json
{
  "ok": true,
  "message": "sent"
}
```

## POST /api/discord/nowplaying

Request:

```json
{
  "gateCode": "optional"
}
```

Response:

```json
{
  "ok": true,
  "message": "nowplaying sent"
}
```

## Security

- Keine Webhook-URL im Browser.
- Keine Tokens in `dashboard.html` oder `radio-dashboard-addon.js`.
- Auth/Gate/Secrets nur im Worker/Backend.
