# MASTER PROJECT GOVERNANCE

## Zweck
Diese Datei ist die zentrale Governance-Datei für das gesamte Projekt. Sie ist die erste Datei, die in neuen Chats, bei neuen Integrationen oder bei Add-on-Entwicklung mitgegeben werden soll.

## Grundprinzip
Dieses Projekt wird nach dem **ADD-ONLY / EXTEND-FIRST**-Prinzip weiterentwickelt.

Das heißt:
- Core-Strukturen nicht blind überschreiben
- keine stillen Löschungen
- neue Funktionen als Bridge, Router, Add-on oder Adapter ergänzen
- Hauptsysteme nur dann anfassen, wenn es um gezielte Reparatur oder klar dokumentierte Stabilisierung geht

## Geschützte Hauptsysteme
Diese Bereiche gelten als Kern und sollen nicht ohne Audit verändert werden:
- `index.html`
- `soundlab.html`
- `systeminfo.html`
- `admin.html`
- `sticky-player/`
- `js/site.js`
- `js/radio-config.js`
- `js/audio-source-router.js`
- `worker/`
- `data/`
- `framework_sources/`
- `systems/`

## Audio-Hierarchie
### Sichtbar
- Sticky Player
- Bottom Meter
- linke/rechte Meter

### Unsichtbar / logisch
- Radio Engine
- hidden SoundCloud Engine
- Sunshine Stream Sources
- temporäre MP3-Quelle

### Steuernd
- `AUDIO_SOURCE_ROUTER`

## Router-Regeln
Der Router ist die zentrale Integrationsschicht für:
- Radio-Stream
- hidden SoundCloud Player
- Sunshine-Links
- temporäre MP3-Quellen
- spätere Archivquellen

Sticky bleibt die sichtbare Steueroberfläche. Der Router schaltet nur Quellen, Metadaten und Rückfalllogik.

## Worker-Regeln
Alle sensiblen Endpunkte laufen über Worker:
- Radio-Metadaten
- Listener- und Stats-Daten
- OpenAI-Aufrufe
- Passwort / Session / Auth
- MP3-Transkription

Keine API-Keys oder Passwörter ins Frontend schreiben.

## IDJ-Regel
Für das Hauptsystem gilt:
- Audio wird vom Originalhoster IDJ durchgeschliffen
- Metadaten werden worker-seitig bezogen und aggregiert
- zusätzliche Listener-/Stats-Daten können von `stats?sid=1` kommen
- Frontend soll nur normalisierte Worker-Daten sehen

## MP3-zu-Text-Regel
- MP3 nur temporär hochladen
- Text per Worker transkribieren
- Ziel ist Text, nicht MP3-Speicherung
- Ergebnis wird in SoundLab weiterverarbeitet
- auf NeoCities keine dauerhafte MP3-Ablage voraussetzen

## Handoff-Regel für andere Chats
Wenn dieses Projekt in einem anderen Chat weiterentwickelt wird, dann immer mitgeben:
1. dieses ZIP
2. `MASTER_PROJECT_GOVERNANCE.md`
3. `README_START_HERE.md`
4. `WORKER_EXTRA_README.md`
5. `HANDOFF_ANWEISUNG_FUER_WEITERE_CHATS.md`
6. `WORKER_AENDERUNGEN_WICHTIG.txt`

Zusatzanweisung für neue Chats:
> Arbeite strikt nach der Governance-Datei. Nutze Add-only / Extend-first. Kernsystem nicht löschen. Worker-Änderungen immer separat dokumentieren.

## Dokumentationspflicht
Jeder neue Build soll mindestens enthalten:
- Start-README
- Worker-README
- Handoff-Datei
- Worker-Änderungshinweis
- Kurzreport der integrierten Änderungen
