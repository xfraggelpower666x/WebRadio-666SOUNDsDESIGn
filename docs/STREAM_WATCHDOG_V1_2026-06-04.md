# STREAM WATCHDOG V1

**Projekt:** 666SOUNDsDESIGn WebRadio  
**Dokumenttyp:** Modulbericht  
**Version:** v2026.06.04-stream-watchdog-v1-patch2  
**Erstellt am:** 2026-06-04  
**Geändert am:** 2026-06-04  
**Owner:** xfraggelpower666x  
**Repo:** WebRadio-666SOUNDsDESIGn  
**Branch:** WebRadio-666SOUNDsDESIGn  
**Arbeitsmodus:** LOKAL / ZIP-Lieferung  
**Status:** PASS  
**Änderungsgrund:** Umsetzung der naechsten dokumentierten Baustelle STREAM WATCHDOG V1.  
**Änderungsumfang:** Additives Diagnosemodul, Cachebuster/Version, Audit, Changelog, Manifest.  
**Nicht betroffen:** Cloudflare Worker, DNS, Discord-Secrets, GOVEE, Dark Dancer, Chaos Engine, Deploy-Kette.  
**Secrets:** Keine Secrets/Tokens in diesem Dokument.

## Zweck

STREAM WATCHDOG V1 ist eine additive Diagnose- und Support-Schicht fuer den bestehenden Central Audio Stability Guard V2.

Der Watchdog ersetzt den Central Audio Guard nicht. Er beobachtet Audio-, Stream- und Netzwerkzustaende, schreibt DOM-Diagnosewerte, zaehlt Recovery-Ereignisse und dokumentiert eine kurze Recovery-Historie.

## DOM-Statuswerte

- `data-stream-watchdog-v1`
- `data-stream-watchdog-state`
- `data-stream-watchdog-reason`
- `data-stream-watchdog-audio-stall-ms`
- `data-stream-watchdog-ready`
- `data-stream-watchdog-network`
- `data-stream-watchdog-recover-count`
- `data-stream-watchdog-last-step`
- `data-stream-watchdog-build`
- `data-stream-watchdog-recovery-history`

## Recovery-Regel

Der aktive Recovery-Pfad bleibt beim Central Audio Stability Guard V2.

STREAM WATCHDOG V1 zaehlt zentrale Recovery-Ereignisse ueber `data-central-audio-reason`:

- `central-play`
- `central-load-play`
- `central-main-rebind`

Nur wenn der Central Audio Guard nach dem Boot nicht aktiv ist, darf der Watchdog eine lokale Fallback-Recovery ausloesen:

1. `play()`
2. `load()+play()`
3. Rebind auf die aktuell erkennbare Stream-Route

Der Watchdog schaltet nicht automatisch auf Backup. Backup bleibt manuell.

## HUD-Diagnose

Der Watchdog schreibt Diagnose-Titel und `data-stream-watchdog-diagnostic` auf vorhandene HUD-Elemente:

- `#streamState`
- `#statusStream`
- `#statusSource`

Es werden keine neuen sichtbaren HUD-Layer erzeugt.

## Geaenderte Dateien

- `index.html`
- `js/stream-watchdog-v1.js`
- `core/version/version-core.js`
- `js/version-state-guard-v1.js`
- `css/phase10-stability-iphone-panel-hud.css`
- `config/radio-runtime.json`
- `package-manifest.full-integration.json`
- `MANIFEST.json`
- `CHANGELOG.md`
- `docs/AUDIT_STREAM_WATCHDOG_V1_2026-06-04.json`
- `docs/CHANGELOG_STREAM_WATCHDOG_V1_2026-06-04.md`

## Nicht geaendert

- `worker.js`
- `worker-addons/discord-notify-addon-v3.js`
- Stream-Routen `/stream` und `/fallback-stream`
- Cloudflare-Konfiguration
- Discord-Webhooks und Secrets
- GOVEE, Dark Dancer, Chaos Engine

## Ergebnis

Status: PASS. Keine BLOCKER/KRITISCH-Punkte offen.
