==========================================
DATEI: docs/player.md
ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-16
ZWECK: Detailbeschreibung des Player-Systems.
ÄNDERUNG: Inhalte aus verstreuten README-/Patch-Dateien in eine gebündelte Doku überführt.
==========================================

# Player-System

## Architektur
- Externer Player = Standard-Oberfläche
- Interner Worker-Player = Fallback
- Beide verwenden dieselbe Frontend-Grundlogik

## UI-Prinzipien
- One Page
- Kein vertikales Scrollen
- Neon Pink / Neon Türkis / Anthrazit
- Seitliche audioreaktive Levelmeter
- Kompakte Cover-Fläche
- Metadaten nur lesen und anzeigen

## Lampen
- Player-Modus:
  - Türkis = externer Player
  - Pink = interner Worker-Fallback
- Source:
  - Main oder Fallback
- Health:
  - Ready / Online / Offline
- Meta:
  - Metadaten geladen oder nicht geladen
- Audio:
  - Playing / Paused / Error
