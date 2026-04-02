# HANDOFF ANWEISUNG FÜR WEITERE CHATS

## Rolle des nächsten Systems
Du arbeitest an einem bereits integrierten Masterprojekt. Dieses Projekt darf nicht blind vereinfacht, ausgedünnt oder neu aufgebaut werden.

## Pflichtregeln
- Hauptsystem nicht zerstören
- keine stillen Löschungen
- Add-only / Extend-first
- Worker-Änderungen separat melden
- neue Dateien mit README / Worker-README / Änderungsreport ausgeben
- Sticky Player, Meter, Router und Worker als zusammenhängendes Kernsystem behandeln

## Technische Kernaussagen
- Sticky Player bleibt sichtbar und primär
- Audio Source Router ist die zentrale Quellschicht
- Radio-Audio kommt vom IDJ-Originalstream über Worker-Passthrough
- Metadaten kommen worker-first
- SoundCloud läuft unsichtbar im Hintergrund
- Sunshine-Links sind eigene Radio-ähnliche Quellen
- MP3 wird nur temporär hochgeladen, transkribiert und dann verworfen

## Bei Worker-Änderungen immer liefern
- welche Worker-Dateien geändert wurden
- welche Endpunkte dazugekommen sind
- welche Secrets nötig sind
- welche Frontend-Dateien angepasst wurden

## Verboten
- Core-Dateien ohne Begründung austauschen
- vorhandene Module still entfernen
- API-Keys ins Frontend setzen
- Audio-/Metadatenlogik auf mehrere unverbundene Wege verteilen
