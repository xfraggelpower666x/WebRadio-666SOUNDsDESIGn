<!--
###############################################
DATEI: PROJECT_STATUS_INFO.md
PFAD: /docs/

ERSTELLT: 2026-04-19
GEÄNDERT: 2026-04-19

VERSION: v2.0

ZWECK:
Kurze Projekt-Informationsdatei für aktuellen Stand, Regeln und nächste Schritte.

INHALT:
- aktueller Stand
- was bisher gemacht wurde
- was als Nächstes geplant ist
- verbindlicher Datei-/Kommentarstandard

ÄNDERUNGEN:
- 2026-04-19 — auf neuen Repo-/Frontend-Neustart angepasst
- 2026-04-19 — Header-/Kommentarstandard als feste Projektregel ergänzt

HINWEISE:
- dient als zentrale Kurzreferenz
- ersetzt altes verteiltes docs-Chaos
###############################################
-->

# 666SOUNDsDESIGn — Projektstatus / Kurzinfo

## 1. Aktueller Stand
- Repo wurde auf Kernstruktur reduziert.
- Altes Frontend-Chaos wird nicht weiter geflickt, sondern sauber neu aufgebaut.
- Worker / Deploy / Recovery / Mirror bleiben unangetastet.
- Das neue Frontend wird im Root aufgebaut.
- Design-Freeze ist gesetzt:
  - Desktop = breites Cyber-Layout
  - iPhone = kompaktes Layout mit gleicher Design-DNA

## 2. Was bisher gemacht wurde
- Stable-Stand identifiziert.
- Freeze-Probleme auf Frontend-/Init-/Visual-Logik eingegrenzt.
- Pause / Stop / Reconnect / Lautstärke / Layout / Visuals / Stream-Status analysiert.
- Doppelte Frontend-Strukturen als Hauptchaosquelle erkannt.
- Neues Ziel festgelegt:
  - ein Frontend
  - kein One-HTML
  - keine großen Technik-Kästen
  - Cover + Visualizer als Kern des Players

## 3. Was als Nächstes geplant ist
### Frontend-Neubau
- `index.html`
- `css/main.css`
- `js/app.bundle.js`
- saubere Asset-Nutzung

### Design
- Header mit Kürzeln + LED:
  - `EXT / INT`
  - `MAIN / BACK`
- Cover klein bis mittel links
- Visualizer groß rechts
- Titel / DJ / Listener / Bitrate sauber darunter
- runde, kompakte Controls
- Technik klein und logisch im unteren Bereich

### Technik
- bestehende Logik stabil halten
- danach saubere Integration für:
  - Pause / Stop / Reconnect
  - Lautstärke-Sync
  - glaubhafte Visuals (Meter / GR / EQ)

## 4. Verbindlicher Datei- und Kommentarstandard
Ab jetzt gilt für **jede Datei** im Projekt:

### Kopfzeile Pflicht
- Dateiname
- Pfad
- Erstellt
- Geändert
- Version
- Zweck
- Inhalt
- Änderungen
- Hinweise

### Im Code selbst Pflicht
- kurze Zwischenkommentare
- Abschnittsmarker
- keine unkommentierten Logikblöcke
- keine kryptischen Schnellschuss-Namen

### Ziel
- alles einheitlich
- sofort verständlich
- wartbar
- nachvollziehbar

## 5. Feste Regeln
- Worker tabu
- Backup-Worker tabu
- Deploy-/Mirror-/Recovery-Struktur tabu
- Repo-Struktur sauber halten
- kleine Fehler nur punktgenau korrigieren
- keine unnötigen Altlasten sammeln
- keine One-HTML-Lösung
- keine künstlich aufgeblasenen Dateien

## 6. Kurzfazit
Das alte Frontend wird nicht weiter geflickt.
Die technische Basis bleibt erhalten.
Das Ziel ist ein aufgeräumter, professioneller Cyber-Player mit klarer Struktur und wartbarer Mehrdatei-Architektur.
