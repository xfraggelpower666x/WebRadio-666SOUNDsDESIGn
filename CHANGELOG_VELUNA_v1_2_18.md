# VELUNA v1.2.18 — SESSION SPLASH ONCE

## Geändert

- Der bestehende zentrale animierte Splash wird pro Browser-Tab-Sitzung nur einmal angezeigt.
- `/` und `/veluna` verwenden denselben `sessionStorage`-Status.
- Reloads starten die Animation nicht erneut.
- Der Wechsel zwischen 666 PLAYER und VELUNA startet die Animation nicht erneut.
- Eine neue Tab-Sitzung zeigt den Splash wieder einmalig an.

## Nicht verändert

- Audio-Startlogik
- AudioContext- und DSP-Struktur
- Equalizer
- Booster
- Limiter
- Visualizer
- Worker-Routing
- Player-Layouts

## Zuständige Originaldatei

- `js/veluna-splash.js`
- synchroner Deploy-Spiegel: `public/js/veluna-splash.js`

Keine neue Splash-Datei, kein Wrapper und kein zusätzlicher Layer wurden angelegt.
