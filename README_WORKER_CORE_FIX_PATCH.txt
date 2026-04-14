WORKER CORE FIX PATCH

Dieses Patch-Paket ändert NUR:
- workers/webradio-666soundsdesign-worker/worker.js
- js/app.js
- config/stream.config.js

Fixes:
- /health hinzugefügt
- /debug hinzugefügt
- /metadata liefert echtes JSON
- Frontend holt Metadaten NUR noch vom Worker
- Fallback-Stream nutzt die ORIGINAL-URL:
  https://my.idjstream.com:8686/stream

Kein Umbau der Struktur.
Kein neuer Worker-Ordner.
Kein Root-Worker.
