==========================================
DATEI: docs/scriptable.md
ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-16
ZWECK: Dokumentation für den iPhone-Scriptable-Upload.
ÄNDERUNG: Scriptable-Hinweise aus Einzeldateien in docs/ gebündelt.
==========================================

# Scriptable Upload

Pfad im Repo:
- `Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js`

## Zweck
- Ordner auf dem iPhone auswählen
- rekursiv scannen
- Dateien per GitHub API hochladen
- identische Dateien überspringen
- Lock-Datei gegen Doppelstarts

## Wichtig
Der gewählte Startordner bestimmt die relativen Pfade im Repo.
Darum immer den eigentlichen Projektordner auswählen, nicht einen Oberordner darüber.
