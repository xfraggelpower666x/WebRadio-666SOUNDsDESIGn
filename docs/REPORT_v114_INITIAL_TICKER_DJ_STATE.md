# v114 INITIAL TICKER + DJ STATE FIX

## Basis
- v113_TICKER_IDLE_PLAY_STATE

## Änderungen
1. PC Initialzustand: Ticker bleibt beim Öffnen/Stop/Pause auf `666SOUNDsDESIGn WebRadio`, bis aktiv PLAY läuft.
2. iPhone Header: `No DJ`, `AutoDJ`, `Unknown`, leer usw. werden oben und im Status zu `DJ 666` normalisiert.
3. iPhone Hinweistext geändert zu: `Press PLAY for playback and live metadata`.

## Nicht geändert
- Kein Layout-Umbau
- Kein EQ/Visualizer-Umbau
- Kein Discord-Umbau
- Kein Worker-/Streamrouting
- Kein Transport-Control-Umbau
- Kein neuer Ticker-Layer

## Prüfungen
- JS Syntaxcheck: bestanden für `js/player-core.js`, `js/controls.js`, `js/equalizer.js`, `js/addons/discord-player-addon-v3.js`
