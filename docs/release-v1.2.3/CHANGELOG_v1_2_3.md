# 666SOUNDsDESIGn WebRadio — Changelog v1.2.3

**Release-ID:** `FULLVERSION_AMARIS_RESPONSIVE_TICKER_METADATA_LYVRA_DJ_REPAIR_v1.2.3`  
**Baseline:** `FULLVERSION_AMARIS_ROUTE_IOS_LYVRA_DJ_REPAIR_v1.2.2`  
**Datum:** 2026-07-02  
**Status:** `LOCAL REPAIR PASS / LIVE DEPLOYMENT REQUIRED`

## Repariert

### AMARIS iPhone

- echter Viewport-Betrieb mit `100svh`/`100dvh`
- iOS-Safe-Areas berücksichtigt
- `overflow-x` und `overflow-y` auf Dokumentebene gesperrt
- Playerkarte exakt innerhalb des sichtbaren Viewports
- keine feste Desktop-Breite auf Mobilgeräten
- alle Statusfelder und Steuerungen ohne Seiten-Scrollen erreichbar
- Footer vollständig innerhalb des Viewports

### AMARIS Desktop

- schwarzer Seitenhintergrund
- kompakte, zentrierte Miniplayer-Karte
- maximale Kartenbreite 520 px
- gleiche Metadaten-, Source-, DJ- und Steuerungsfelder wie mobil

### Now Playing

- kontinuierliche duplizierte Laufschrift für lange Titel
- kurze Titel bleiben statisch zentriert
- Titel werden vor der Anzeige zentral normalisiert
- doppelte Trennzeichen werden bereinigt
- identische Segmente werden nicht mehrfach ausgegeben
- vorhandene Marken-/Artist-Identitäten werden nicht nochmals vorangestellt
- nackte Tracktitel erhalten den Standardprefix `LYVRA is alive · 666SOUNDsDESIGn ·`

### DJ / Status

- Auto-DJ, leere DJ-Felder, `No DJ`, `DJ 666`, `666 DJ` und vergleichbare Legacy-Werte werden zu `LYVRA DJ`
- echte Live-DJ-Namen überschreiben den Auto-DJ-Wert dynamisch
- Worker, Hauptplayer, AMARIS, `/internal`, externe Ansicht und Dashboard konsumieren dieselbe Normalisierung

### Source-Anzeige

- Worker/Main: grün
- Worker/Fallback: cyan
- direkte Reserve: amber
- die pinke Source-Anzeige wurde entfernt
- die sichtbare Bezeichnung zeigt den gewählten Worker-/Reservepfad, ohne fälschlich einen Emergency-Zustand zu behaupten

### Footer

`L.Y.V.R.A. – Living Yielding Vibration and Resonance Architecture`

- Neon-Türkis
- leichter pinker Glow
- eine Zeile auf iPhone und Desktop

## Bewusst nicht verändert

- Hauptplayer-Audioarchitektur
- Equalizer
- Booster
- Stream-Worker-Switch-Kette
- `/internal` als eigenständiger Notfallplayer
- Admin-/Auth-Hardlock
- Discord-/Messenger-Struktur
- bestehende Zusatzplayer und Dashboard-Routen
