<!--
###############################################
DATEI: README.md
PFAD: /

ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-19

VERSION: v2.0

ZWECK:
Root-Readme für das bereinigte 666SOUNDsDESIGn WebRadio Projekt.

INHALT:
- Kurzbeschreibung des Projekts
- Strukturüberblick
- Worker-/Frontend-Trennung
- Stream-/Metadata-Endpunkte
- aktueller Frontend-Neubau-Stand

ÄNDERUNGEN:
- 2026-04-19 — auf aktuellen Repo-Stand nach Frontend-Cleanup/Neustart angepasst
- 2026-04-19 — alte Doppelstrukturen (docs-Altbestand, external-player) aus der Beschreibung entfernt
- 2026-04-19 — neue Mehrdatei-Frontend-Struktur dokumentiert

HINWEISE:
- Worker bleibt bewusst getrennt vom Frontend
- Frontend wird in Root gebaut (kein One-HTML, keine Doppelstruktur)
###############################################
-->

# 666SOUNDsDESIGn — Digital Underground WebRadio

Cyber-/Neon-Webradio mit Live-Metadaten, Stream-Failover, Worker-Fallback und getrenntem Frontend.

## Projektziel
Ein aufgeräumter, performanter Webradio-Player mit:
- großem Visualizer
- kompakter Statusleiste
- sauberem Desktop-/iPhone-Layout
- getrennten Dateien für HTML, CSS, JS und Assets
- unangetastetem Worker-/Deploy-Kern

## Aktuelle Architektur

### Worker / Infrastruktur
Diese Teile bleiben stabil und getrennt:
- `worker.js` → aktive Worker-Datei
- `workers/` → Worker-Projektstruktur
- `recovery/` → last-known-good / snapshots / Recovery-Metadaten
- `.github/` → Mirror / Restore Workflows
- `wrangler.jsonc` → Deploy-Konfiguration

### Frontend
Das Frontend lebt im Root:
- `index.html`
- `css/main.css`
- `js/app.bundle.js`

Weitere statische Dateien:
- `assets/`
- `icons/`
- `config/`

## Endpunkte / Frontend-Konfiguration
Aus `config/stream.config.js`:

- Stream: `/stream`
- Fallback-Stream: `/fallback-stream`
- Metadaten: `/api/nowplaying`
- Health: `/health`

Upstreams:
- Primary: `https://my.idjstream.com/666soundsdesign/stream`
- Backup: `https://my.idjstream.com:8686/stream`

## Player-Logik
- **EXT / INT** = welcher Player-/Pfadstatus aktiv ist
- **MAIN / BACK** = welcher Streampfad im Frontend genutzt wird
- Pause / Stop / Reconnect / Lautstärke bleiben Frontend-Logik
- Metadaten werden nur gelesen und angezeigt

## Design-Richtung
- Desktop: breites Cyber-Layout
- iPhone: kompakteres Layout mit gleicher Design-DNA
- Farben: Neon Pink / Cyan / Lila auf sehr dunklem Hintergrund
- Technik-Infos klein und sauber statt großer Panels

## Wichtige Regeln
- Worker nicht anfassen
- keine One-HTML-Lösung
- jede Datei mit vollständiger Kopfzeile
- kurze Zwischenkommentare im Code
- kleine Fehler punktgenau korrigieren
- keine unnötigen Altlasten im Repo sammeln

## Nächster Ausbaustand
Der aktuelle Stand ist **STEP 5A**:
- neues Frontend-Grundlayout
- Root-Frontend statt Doppelstruktur
- Design zuerst, Technik danach sauber integriert
