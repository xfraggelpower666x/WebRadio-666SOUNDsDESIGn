# REPORT v35.7 — STREAM CONFIG MANAGER V1

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Build:** v35.7.0  
**Cache-Burst:** v35.7.0-2026-06-04-task7-stream-config-manager  
**Basis:** v35.6.0 TASK6 Admin Control Center Stabilization  
**Worker geändert:** Nein  
**DarkDancer:** Erhalten / geschützt  
**Secrets:** Keine Secrets enthalten

## Ziel

Stream-Konfiguration wird vom Player aus `config/radio-runtime.json` gelesen, damit Main/Backup später administrierbar bleiben, ohne den Player-Code für jede URL-Änderung anfassen zu müssen.

## Integriert

- `js/stream-config-manager-v1.js`
- Player-Core lädt Runtime-Konfiguration und setzt aktive Endpunkte
- Admin Overlay zeigt aktive Player-Stream-Konfiguration
- Admin Preview akzeptiert relative Routen wie `/stream` und `/fallback-stream`
- `config/radio-runtime.json` enthält sichere Default-Routen
- Version/Cache-Burst auf v35.7.0 aktualisiert

## Nicht geändert

- `worker.js`
- `worker-addons/`
- Discord Shooter Backend
- Message Shooter Backend
- Private Track Shooter
- Cloudflare-Konfiguration
- Secrets / Tokens
- DarkDancer-Dateien

## Runtime-Regel

Main bleibt Main. Backup bleibt manuell. Fallback bleibt vorhanden.

Default:

```text
Main: /stream
Backup: /fallback-stream
Metadata: /api/nowplaying
Health: /health
```

Wenn Admin später `config/radio-runtime.json` über die geschützten Admin-Routen ändert, lädt der Player diese Werte ohne erneutes Codieren.

## Rückfalllogik

Wenn `config/radio-runtime.json` nicht erreichbar oder ungültig ist, nutzt der Player automatisch die bisherigen Worker-Routen:

```text
/stream
/fallback-stream
/api/nowplaying
/health
```

## Audit-Ergebnis

PASS: keine Basisdateien entfernt. Worker unverändert. DarkDancer erhalten. Syntaxchecks bestanden.
