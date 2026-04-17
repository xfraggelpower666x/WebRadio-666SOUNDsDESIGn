# MERGE-HANDOFF 2026-04-16

## Basis
- Masterstruktur vollständig aus `666SOUNDsDESIGn_UI_FINAL_BUILD_2026-04-16.zip` übernommen.
- Worker/Wrangler/Deploy-Dateien unverändert gelassen.

## Integriert
- Externer Player aus `WebRadio-666SOUNDsDESIGn_FULL_ONEPAGE_UI_AUDIO_PRO_AUTO_CHAIN_HOT_DEFAULT_2026-04-16.zip` als Add-on in die bestehende Repo-Struktur übernommen.
- Audio Pro + Auto Chain + HUD im externen Player aktiviert.
- Zusätzlicher iPhone-Touch-Fix in JS/CSS eingebaut.

## Touch-Fix
- Buttons reagieren jetzt auf `touchend` und `click`.
- Doppelauslösung wird unterdrückt.
- Versteckte Overlays fangen keine Pointer-Events mehr ab.
- Dekorative Elemente wurden auf `pointer-events: none` gesetzt.

## Unverändert
- `worker.js`
- `worker.ORIGINAL.js`
- `wrangler.jsonc`
- `workers/webradio-666soundsdesign-worker/*`
- Gesamtordnerstruktur der Master-ZIP
