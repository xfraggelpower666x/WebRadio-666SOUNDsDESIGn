# 666SOUNDsDESIGn — v107 HARD USER STOP GUARD

## Scope
- Basis: v106_MOBILE_TICKER_ONLY_REPAIR_FULL
- Aufgaben:
  1. Stop/Pause darf nicht mehr durch Watchdog/Self-Heal automatisch wieder starten.
  2. PC + iPhone Recovery bleibt für echte Unterbrechungen erhalten, aber nicht nach User-Stop/User-Pause.

## Änderungen
- `js/player-core.js`
  - Globaler Hard-User-Hold eingeführt.
  - Stop und Pause setzen einen harten Sperrzustand.
  - Play/Reconnect heben den Sperrzustand wieder auf.
  - Recovery-/Watchdog-Pfade prüfen den Sperrzustand vor `audio.play()`.
  - v80/v84 alte Recovery-Pfade zusätzlich abgesichert.

- `index.html`
  - Mobile/iPhone-Player bekommt denselben Hard-User-Hold.
  - Mobile Stop/Pause blockieren Recovery-Autoplay.
  - Mobile Play hebt den Hold wieder auf.

## Nicht geändert
- Kein Layout-Umbau.
- Kein Ticker-Umbau.
- Kein EQ/Visualizer-Umbau.
- Kein Discord-Umbau.
- Kein Worker-/Stream-Routing.

## Prüfung
- `node --check js/player-core.js`: bestanden.
- Version synchron auf v107 gesetzt.
