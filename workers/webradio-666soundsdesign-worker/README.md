# Legacy Cloudflare Build Root Compatibility — v1.1.0

Dieser Spiegel hält bestehende Cloudflare-Build-Einstellungen funktionsfähig, die als Root-Verzeichnis `workers/webradio-666soundsdesign-worker` verwenden.

- Kanonische Bearbeitungsquelle bleibt der Repo-Root.
- `worker.js` und alle `worker-addons/` müssen bytegleich zum Repo-Root sein.
- Browser-Assets werden aus `../../public` geladen.
- Die kanonische Passwort-Worker/Auth-Worker-Architektur gilt auch im Legacy-Build-Root.
- `npm run check` im Repo-Root blockiert bei Mirror-Drift.
- Secrets werden ausschließlich im Cloudflare-Dashboard gesetzt und niemals hier gespeichert.
