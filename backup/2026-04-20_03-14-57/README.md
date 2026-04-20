<!--
###############################################
DATEI: README.md
PFAD: /

ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-20

VERSION: v2.1

ZWECK:
Root-Readme für den aktuellen Vollstand des
666SOUNDsDESIGn WebRadio Projekts.

INHALT:
- Kurzbeschreibung des Projekts
- Strukturüberblick
- Worker-/Frontend-Trennung
- aktueller Fokus: INTERNAL PLAYER FINAL
- Hinweis auf getrennte Scriptable-Themen

ÄNDERUNGEN:
- 2026-04-20 — auf Internal-Player-Finalstand aktualisiert
- 2026-04-20 — Fokus klar auf Radio/Player zurückgezogen
- 2026-04-20 — Scriptable-Thema bewusst nicht weiter in diesen Build gemischt

HINWEISE:
- Worker bleibt zentral und geschützt
- Internal Player ist produktiver Fallback-Player
- External Player bleibt nächster separater Ausbauschritt
###############################################
-->

# 666SOUNDsDESIGn — Digital Underground WebRadio

Cyber-/Neon-Webradio mit Live-Metadaten, Stream-Failover, Worker-Fallback und getrennter Mehrdatei-Frontend-Struktur.

## Projektziel
Ein stabiler, klar strukturierter Webradio-Player mit:
- getrennten Dateien für HTML, CSS, JS und Assets
- Worker-/Deploy-Kern als Infrastruktur
- External Player als Hauptsystem
- Internal Player als produktiver Fallback-Player

## Rollenlogik
- **EXTERNAL PLAYER** = Hauptplayer, soll im Normalbetrieb laufen
- **INTERNAL PLAYER** = Fallback-Player, soll zuverlässig einspringen wenn nötig

## Aktueller Fokus
Der aktuelle Vollstand konzentriert sich auf den **Internal Player**:
- technischer Betrieb gesichert
- kompakter W4-UI-Stand eingebaut
- MAIN / BACK Umschaltung vorhanden
- Play / Pause / Stop / Reconnect vorhanden
- Lautstärke stabilisiert

## Projektstruktur

### Infrastruktur / Worker
- `worker.js` → aktive Worker-Datei
- `workers/` → Worker-Projektstruktur
- `recovery/` → last-known-good / snapshots / Recovery-Metadaten
- `.github/` → Mirror / Restore Workflows
- `wrangler.jsonc` → Deploy-Konfiguration

### Frontend / statische Dateien
- `index.html`
- `css/main.css`
- `js/app.js`
- `config/`
- `assets/`
- `icons/`

## Stream- / Datenbasis
Aus `config/stream.config.js`:

- Stream: `/stream`
- Fallback-Stream: `/fallback-stream`
- Metadaten: `/api/nowplaying`
- Health: `/health`

Primary:
- `https://my.idjstream.com/666soundsdesign/stream`

Backup:
- `https://my.idjstream.com:8686/stream`

## Aktueller Vollstand
Dieser Build ist bewusst als **Vollversion** verpackt und dient als sauberer Zwischenstand für:
1. Internal Player finalisieren
2. danach External Player separat weiterbauen
3. erst danach System zusammenführen
