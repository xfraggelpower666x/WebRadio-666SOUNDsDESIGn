==========================================
DATEI: docs/recovery.md
ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-16
ZWECK: Recovery-/Mirror-/Snapshot-Hinweise.
ÄNDERUNG: Recovery-Notizen aus README.txt nach docs/recovery.md verschoben.
==========================================

# Recovery

## Vorhanden
- `recovery/last-known-good/`
- `recovery/snapshots/`
- `.github/workflows/mirror.yml`
- `.github/workflows/restore-latest.yml`

## Zweck
- letzter stabiler Stand
- Snapshots für definierte Zwischenstände
- GitHub-Branch-Spiegelung / Restore

## Regel
Recovery zuerst prüfen, bevor an aktiven Worker-Dateien gearbeitet wird.
