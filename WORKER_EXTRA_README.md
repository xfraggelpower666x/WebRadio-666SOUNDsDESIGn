# WORKER EXTRA README

## Zweck
Der Worker ist die sichere Mittelschicht für Audio-Metadaten, OpenAI-API, Auth, Passwortlogik und Transkription.

## In diesem Build geänderte Worker-Dateien
- `worker/cors-proxy-worker.js`
- `cors-proxy-worker.js`
- `worker/songlab-api-worker.js`

## Aktive Endpunkte
### Radio
- `/api/radio/metadata`
- `/api/radio/listeners`
- `/api/radio/history`
- `/cors?u=...`

### SongLab / OpenAI
- `/api/songlab/auth`
- `/api/songlab/generate`
- `/api/songlab/save`
- `/api/songlab/load`
- `/api/songlab/project/list`
- `/api/songlab/health`
- `/api/songlab/transcribe`

## Secrets
- `OPENAI_API_KEY`
- `SONGLAB_PASSWORD`
- optional: `SONGLAB_SESSION_SECRET`
- optional: KV binding `SONGLAB_DRAFTS`

## Integrationsregel
Wenn der Worker geändert wird, muss das Frontend nur dann mitgeändert werden, wenn sich Endpunktnamen oder Rückgabeformate ändern. Sonst bleibt das Hauptsystem unangetastet.

## Sicherheitsregel
Keine Secrets in `js/*.js`, `html` oder statische JSON-Dateien schreiben.
