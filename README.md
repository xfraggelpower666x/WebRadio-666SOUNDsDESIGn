# 666SOUNDsDESIGn — Root Player + Radio Worker

## Produktionsregel
- Frontend / Player liegt im **Repo Root**
- Worker liegt in: `workers/webradio-666soundsdesign-worker/`
- Keine direkten Provider-Streams im Frontend
- Frontend spricht nur mit dem Worker

## Frontend-Endpoints
- `/stream`
- `/metadata`
- `/status`
- `/history`
- `/health`

## Worker ENV
Pflicht:
- `META_JSON_URL`

Optional:
- `STREAM_MAIN`
- `STREAM_BACKUP`
- `WEBHOOK_CACHE_TTL_MS`
- `META_FETCH_CACHE_MS`
- `STREAM_CHECK_TIMEOUT_MS`

## Aktueller Default-Meta-Endpunkt
`https://my.idjstream.com/cp/get_info.php?p=8686`

## Upload
Dieses Paket ist für den GitHub-Scriptable-Upload vorbereitet.
Wähle beim Upload **den Ordner `UPLOAD_PACKAGE_V2_REAL`** aus.
