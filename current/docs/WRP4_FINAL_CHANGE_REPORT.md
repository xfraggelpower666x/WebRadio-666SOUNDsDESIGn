CHANGE REPORT

ÄNDERUNG:
- komplette reparierte Worker-Datei erstellt
- External Player auf GitHub-ROOT umgestellt
- alte /external-player-Unterordnerlogik entfernt
- stabilen Internal-Fallback vom 2026-04-16 als sichere Basis verwendet
- alle 3 Worker-Dateien identisch synchronisiert

WARUM:
- der neuere Worker war durch kaputten Inline-UI-Code nicht deployfähig
- gleichzeitig musste die neue Routing-Idee erhalten bleiben:
  / und /index.html -> externer Player
  bei Fehler -> interner Worker-Fallback
- der externe Player liegt jetzt im GitHub-ROOT, nicht mehr in /external-player/

BETROFFEN:
- /worker.js
- /workers/webradio-666soundsdesign-worker/worker.js
- /recovery/last-known-good/666SOUNDsDESIGn_worker.js

STATUS:
- Datei fertig: JA
- alle 3 Worker identisch: JA
- SHA256: 0fa8de09392b439d84746b25d0afe702884a7e443fd892f1baf6ddb740418ff9
- bereit zum Ersetzen im Repo: JA
