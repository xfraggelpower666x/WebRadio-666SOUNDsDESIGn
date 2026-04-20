<!--
###############################################
DATEI: PROJECT_STATUS_INFO.md
PFAD: /docs/

ERSTELLT: 2026-04-19
GEÄNDERT: 2026-04-20

VERSION: v2.1

ZWECK:
Kurze Projekt-Informationsdatei für aktuellen Stand,
Regeln und nächste Schritte.

INHALT:
- aktueller Fokus
- Internal-Player-Stand
- Rollenlogik Internal / External
- Arbeitsregel Vollversionen / ZIP
- nächste Schritte

ÄNDERUNGEN:
- 2026-04-20 — auf Internal-Player-Finalfokus aktualisiert
- 2026-04-20 — Scriptable-Thema aus diesem Build bewusst ausgeklammert
- 2026-04-20 — Vollversions-Regel explizit festgehalten
###############################################
-->

# 666SOUNDsDESIGn — Projektstatus / Kurzinfo

## 1. Aktueller Fokus
Der Fokus liegt wieder sauber auf dem **Radio / Player**.  
Scriptable-/Uploader-Themen gehören nicht in diesen Build-Schritt.

## 2. Player-Rollen
- **External Player** = Hauptsystem
- **Internal Player** = produktiver Fallback-Player

Der Internal Player muss zuverlässig stehen, bevor der External Player separat weiterentwickelt wird.

## 3. Internal Player – aktueller Stand
Technisch vorhanden:
- Play
- Pause
- Stop
- Reconnect
- Volume stabil
- MAIN / BACK Umschaltung

UI-Stand:
- kompakter W4-Designstand eingebaut
- Internal-Player-Fokus als aktueller Vollstand

## 4. Infrastruktur-Regeln
- Worker bleibt zentrale Infrastruktur
- Root-Worker und Worker im Unterordner müssen identisch bleiben
- Recovery / last-known-good bleibt synchronisierte Sicherheitskopie

## 5. Output-Regel
Für dieses Projekt gilt:
- finale Ergebnisse immer als **Vollversion**
- bevorzugt als **komplette ZIP**
- keine abgespeckten Teilstände als finaler Deliverable

## 6. Nächster Schritt
Nach diesem Vollstand:
1. Internal Player optisch/funktional final bewerten
2. danach External Player als separates Hauptplayer-Design ausbauen
3. beide Systeme sauber zusammenführen
