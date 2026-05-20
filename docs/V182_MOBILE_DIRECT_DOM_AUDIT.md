# V182 Mobile Direct DOM Root Fix

Basis: aktuelle vom Nutzer gelieferte GitHub-ZIP.

## Geändert
- iPhone-History aus der NOW-PLAYING-Karte entfernt und in die mobile Funktionsleiste verschoben.
- Mobile Versionsbadge aus der Funktionsleiste entfernt.
- Version als kleiner Text unter dem unteren Levelmeter gesetzt: `WebRadio 666 Sounds Design v182`.
- Discord-Außenpanel optisch entkernt; DC/MSG/LED bleiben.
- SEND bekommt zwei Status-LEDs: request/delivered/failed.
- SEND-Overlay fokussiert das Textfeld nicht mehr automatisch, um iPhone-Safari-Zoomsprung zu vermeiden.
- Boost-Tabelle direkt im echten mobilen Audio-Code erweitert: `1.00, 1.30, 1.60, 1.90, 2.00, 2.20`.
- Boost-Clamp direkt von 4 auf 5 erhöht.
- Fünfte Boost-LED direkt in der mobilen DOM-Struktur ergänzt.
- Alter konkurrierender `smfpV164RescueCleanScript` entfernt.
- Player-Alert-Worker: Backend-primary, KV-Fallback, Cache-Notfallback.

## Nicht angefasst
- PC-EQ nicht geändert.
- PC-Layout nicht geändert.
- Grafischer Haupt-EQ nicht gelöscht.
- Discord-Addon nicht neu integriert.

## Prüfung
- `node --check worker.js`: OK
- Inline-Script-Syntax aus `index.html`: OK
