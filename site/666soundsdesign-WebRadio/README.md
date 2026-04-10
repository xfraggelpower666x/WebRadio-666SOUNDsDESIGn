# 666SOUNDsDESIGn — Cyber Radio Core Player V1

Diese Version ist eine konsolidierte, vereinfachte und stabilisierte Player-Basis.

## Ziel
- besserer Startpunkt als die zerfledderten Legacy-Builds
- direkte Anbindung an den zentralen RADIO CORE Worker
- keine Menü-Orgie, sondern Systempanels mit LEDs
- klare Play-/Pause-/Stop-Funktionen
- Sicherheitsmodus mit automatischem Fallback auf /backup
- Audio-Meter und Ring-Visuals

## Erwartete Worker-Endpunkte
- /health
- /debug
- /stream
- /backup
- /metadata
- /status
- /listeners
- /history

## Einbau im Monorepo
Empfohlenes Ziel:
site/666soundsdesign-WebRadio/

## Wichtige Regel
Keine Secrets, Tokens oder Passwörter in diese Site-Dateien schreiben.
