# v7 FULL REPO SAFE ROOT REPLACE — 2026-06-07

## Zweck
Vollständiger, root-replace-sicherer Projektstand auf Basis der hochgeladenen vollständigen Repo-ZIP mit 526 Dateien.

## Änderungen
- Neue Headergrafik als `assets/images/player-header-banner.png` integriert.
- Bestehender Hero-/Logo-Header im Root-Player gezielt durch Headergrafik ersetzt.
- `css/player-header-banner-v7.css` ergänzt.
- GOVEE als ES-Modul korrekt über `js/system-extra/govee/govee-init.js` geladen.
- Analyzer-Events aus `js/equalizer.js` für GOVEE Scene Sync ergänzt, ohne Player-Boot zu blockieren.
- PC Responsive Stage Lock in `js/responsive-ui.js` und `css/desktop.css` ergänzt.
- Main-Only-Lock: `/stream` bleibt Mainstream; Backup bleibt manuell über `/fallback-stream` / B-Button.
- Admin-Login öffnet nicht mehr direkt per Browsernavigation `/login`; Login wird lokal angestoßen und gegen Authority Core geprüft.

## Geschützte Systeme erhalten
- `CHAOS_ENGINE/`
- `666SOUNDsDESIGn/The-Dark-Dancer.html`
- `worker-addons/`
- `js/player-admin-overlay.js`
- `js/stream-watchdog-v1.js`
- `js/system-extra/govee/`
- `docs/`
- `config/`
- `assets/`
- Worker-interner Notfallplayer
- Discord Addon
- Broadcast / Message APIs

## Upload-Hinweis
Diese ZIP ist für Scriptable v3.3 SAFE ROOT REPLACE vorgesehen.
Nach dem Entpacken muss der gewählte Ordner direkt `index.html`, `worker.js`, `css/`, `js/`, `assets/`, `docs/`, `config/`, `worker-addons/`, `CHAOS_ENGINE/` enthalten.
