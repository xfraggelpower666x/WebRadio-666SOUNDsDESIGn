WORKERS.DEV RESET

Ziel:
- absolut minimaler Reset-Worker
- kein Domain-/Route-Zwang
- keine ENV nötig
- kein Weißbild mehr
- /health, /debug, /metadata, /stream müssen antworten

Upload:
1. ZIP entpacken
2. Ordnerinhalt mit Scriptable nach GitHub hochladen
3. Cloudflare Deploy abwarten
4. Testen über workers.dev

Tests:
https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev/health
https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev/debug
https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev/metadata
https://webradio-666soundsdesign-worker.digital-underground-connected.workers.dev/stream
