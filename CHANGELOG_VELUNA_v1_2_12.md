# CHANGELOG — VELUNA v1.2.12

## Zentraler animierter Startbildschirm
- Eine gemeinsame Splash-Runtime für Hauptplayer, VELUNA-Player und internen Notfallplayer.
- Alle Player laden dieselben zentralen WebM-/MP4-Dateien aus `assets/veluna/splash/`.
- Der Splash liegt über player-spezifischen Boot-Overlays und kann dadurch nicht mehr verdeckt werden.
- Keine separaten Videokopien und kein eigenständiger öffentlicher Startbildschirm.

## Intelligente iPhone-Footer-Anpassung
- Das untere VELUNA-Banner wurde von der zu kleinen Thumbnail-Höhe befreit.
- Eigene proportionale Grid-Zeile mit `clamp(88px, 16dvh, 136px)`.
- Das Bild nutzt bis zu 96 % der Panelbreite, bleibt unverzerrt und mittig.
- Der flexible Coverbereich gibt den benötigten Platz ab; die feste Ganzseiten-Geometrie bleibt unverändert.
- Für sehr kurze Displays greift eine kompaktere Höhenregel.

## Unverändert erhalten
- EQ → Boost → Limiter
- feste iPhone-Viewport-Geometrie und Overlay-No-Reflow
- Skip, Discord, Worker-Routing, Metadaten und Audio-Recovery
- Desktop-Banner bleibt entfernt
