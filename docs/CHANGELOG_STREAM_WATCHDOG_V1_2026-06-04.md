# CHANGELOG STREAM WATCHDOG V1

**Projekt:** 666SOUNDsDESIGn WebRadio  
**Dokumenttyp:** Changelog  
**Version:** v2026.06.04-stream-watchdog-v1-patch2  
**Erstellt am:** 2026-06-04  
**Geändert am:** 2026-06-04  
**Owner:** xfraggelpower666x  
**Repo:** WebRadio-666SOUNDsDESIGn  
**Branch:** WebRadio-666SOUNDsDESIGn  
**Arbeitsmodus:** LOKAL / ZIP-Lieferung  
**Status:** PASS  
**Änderungsgrund:** Additiver STREAM WATCHDOG V1.  
**Änderungsumfang:** Diagnosemodul, Version, Cachebuster, Audit.  
**Nicht betroffen:** Worker, Cloudflare, Secrets, Discord, GOVEE, Dark Dancer, Chaos Engine.  
**Secrets:** Keine Secrets/Tokens in diesem Dokument.

## Neu

- `js/stream-watchdog-v1.js` ergaenzt.
- Watchdog-DOM-Werte fuer Stall-, readyState-, Netzwerk- und Recovery-Diagnose ergaenzt.
- Recovery-Zaehler und Recovery-Historie ergaenzt.
- HUD-Diagnose ueber vorhandene Titel-/Data-Attribute ergaenzt.

## Geaendert

- Build auf `v2026.06.04-stream-watchdog-v1-patch2` gesetzt.
- Cachebuster auf `stream-watchdog-v1-patch2-20260604` gesetzt.
- `index.html` laedt STREAM WATCHDOG V1 nach Phase 10/Central Guard.
- `core/version/version-core.js`, `js/version-state-guard-v1.js`, `config/radio-runtime.json` und `package-manifest.full-integration.json` aktualisiert.
- Patch2: `player-core.js` erzeugt ein fehlendes `#radio` defensiv, damit der Boot nicht an einem entfernten/umgebauten DOM-Audioelement stoppt.
- Patch2: Phase-10-Legacy-Hardfix-Aufrufe werden nur ausgefuehrt, wenn die jeweilige Funktion existiert.
- Patch2: GOVEE-Dateien werden als ES-Module geladen, passend zu vorhandenen `import`/`export`-Anweisungen.

## Erhalten

- Central Audio Stability Guard V2 bleibt aktiv.
- Main Only Lock bleibt aktiv.
- Backup bleibt manuell.
- Bestehende Stream-Routen bleiben unveraendert.
- Worker/Discord/GOVEE/Dark Dancer/Chaos Engine bleiben unveraendert.

## Pruefung

- `node --check js/stream-watchdog-v1.js`: PASS
- `node --check js/phase10-stability-iphone-panel-hud.js`: PASS
- `node --check core/version/version-core.js`: PASS
- `node --check js/version-state-guard-v1.js`: PASS
- `node --check js/player-core.js`: PASS
- JSON-Pruefung `config/radio-runtime.json`: PASS
- JSON-Pruefung `package-manifest.full-integration.json`: PASS
- HTTP-Pruefung Root und Watchdog-Script: PASS
- VM-DOM-Smoke-Check Watchdog-Attribute/API: PASS
- In-App-Browser-Pruefung: PASS nach Quarantaene der defekten temporaeren lokalen `package.json`; Patch2-Reload ohne frische Console-Errors.
