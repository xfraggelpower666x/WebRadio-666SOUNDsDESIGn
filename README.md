# 666soundsdesign-system

Monorepo-Baustein mit:
- `site/666soundsdesign-WebRadio/` → Cyber Player V1
- `workers/webradio-666soundsdesign-worker/` → RADIO CORE Worker

## Wichtig
- Keine Secrets im Repo speichern
- Worker nutzt ENV / Secrets
- Player soll öffentlich nur über den Worker laufen

## Erwartete Worker-Endpunkte
- `/health`
- `/debug`
- `/stream`
- `/backup`
- `/metadata`
- `/status`
- `/listeners`
- `/history`
- `/api/radio/webhook`
