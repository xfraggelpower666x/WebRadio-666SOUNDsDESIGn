# CHANGELOG VELUNA v1.2.17

## Ziel
VELUNA startet auf iPhone/Safari wieder vollständig eigenständig, ohne dass der 666 PLAYER parallel geöffnet sein muss.

## Geändert
- Zentraler nativer Audio-Start-Controller für 666 PLAYER und VELUNA.
- `audio.play()` wird ohne vorgeschaltetes `await` ausgelöst.
- WebAudio-DSP startet erst nach erfolgreichem nativen Play.
- Doppelte VELUNA-Play-Listener und vorgeschaltetes `soundEngine.resume()` entfernt.
- Alle vier VELUNA-Spiegel auf denselben kanonischen Inhalt synchronisiert.
- Request-Token, Timeout und Cancel bei Pause/Stop zentralisiert.
- Bestehende EQ-, Booster-, Limiter- und Visualizer-Ketten unverändert erhalten.

## Tests
- npm run verify: PASS
- npm run check: PASS
- Node-Tests: 45/45 PASS
- JavaScript-Syntax: PASS
- Root/Public-Spiegel: PASS
