# REPORT v35.6 — ADMIN CONTROL CENTER STABILIZATION

**Projekt:** WebRadio-666SOUNDsDESIGn Player  
**Build:** v35.6.0  
**Cache-Burst:** v35.6.0-2026-06-04-task6-admin-control-center  
**Datum:** 2026-06-04  
**Basis:** v35.5 rebased on full current repo  
**Worker:** unverändert  
**DarkDancer:** geschützt erhalten  

## Ziel

TASK 6 stabilisiert das vorhandene `player-admin-overlay.js`, ohne ein neues Admin-System daneben zu bauen.

## Geänderte Dateien

- `js/player-admin-overlay.js`
- `css/player-admin-overlay.css`
- `config/player-version.json`
- `config/player-version.js`
- `js/version-state-guard-v1.js`
- `core/version/version-core.js`
- `index.html` Cache-Burst / Version
- `package-manifest.full-integration.json` Versionseintrag, falls JSON lesbar

## Nicht geändert

- `worker.js`
- `worker-addons/`
- Discord Shooter Backend
- Message Shooter Backend
- Private Track Shooter
- Stream-Routen
- Cloudflare-Konfiguration
- Secrets / Tokens / Webhooks
- DarkDancer Dateien und Route

## Reparaturinhalt

1. Admin Control Center bleibt vorhandenes Overlay, kein Neubau.
2. Authority-Core-Status im Overlay sichtbar gemacht.
3. Route-Preflight für Admin API, PW Worker, Auth Worker, Broadcast und Discord ergänzt.
4. Watchdog-Status-Panel ergänzt, liest nur DOM-Diagnosedaten.
5. Discord Admin Send nutzt vorhandene Routen mit Fallback `manual -> message`; Test nutzt `test -> manual -> message`.
6. Broadcast/Message-Funktionen bleiben Backend-seitig unverändert.
7. Stream Config Manager behält vorhandene Admin-Routen und validiert Primary als Pflichtfeld.
8. iPhone-sicherere Eingabefelder mit 16px und besserem Overlay-Layout.

## Prüfstatus

- JS Syntax: PASS
- HTML Parser: PASS
- Basisdateien erhalten: PASS
- Worker SHA unverändert: PASS
- DarkDancer erhalten: PASS
