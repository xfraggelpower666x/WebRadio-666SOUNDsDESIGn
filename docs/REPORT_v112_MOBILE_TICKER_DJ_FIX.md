# 666SOUNDsDESIGn v112 — Mobile Ticker + DJ Fallback Fix

## Scope
- Basis: v111_TRANSPORT_REFERENCE_FIX_FULL
- Referenz: zuletzt hochgeladene funktionierende GitHub-ZIP nur für den Mobile-Ticker-Pfad.

## Änderungen
1. iPhone/Mobile-Header-Ticker wieder auf einen einzelnen Referenz-Span zurückgeführt.
   - Kein neuer Ticker-Container.
   - Kein zusätzlicher Layer.
   - Animation läuft über einen vollständigen Durchlauf ohne Ellipsis-Abbruch.
2. DJ-Fallback vereinheitlicht.
   - leer / No DJ / AutoDJ / Unknown -> `DJ 666`.

## Nicht geändert
- Kein Layout-Umbau.
- Kein EQ/Visualizer-Umbau.
- Kein Discord-Umbau.
- Kein Worker/Stream-Routing.
- Kein Transport-Audio-Umbau.

## Prüfung
- Dateiänderungen auf `index.html`, `js/player-core.js`, `js/extern.js`, plus Report begrenzt.
- Keine neue Ticker-Schicht eingefügt.
