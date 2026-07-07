# CHANGELOG AMARIS v1.2.7

## FULLVERSION_AMARIS_BRANDING_BACKGROUND_ICONS_MEDIASESSION_v1.2.7

### Geändert
- Originalbild 1 lokal übernommen als Desktop-/PC-Hintergrund für AMARIS.
- Originalbild 2 lokal übernommen als Standard-Streambild, Fallback-Cover, Browser-/App-/PWA-/Home-Icon und Media-Session-Default-Artwork.
- Icon-Satz aus Bild 2 erzeugt: favicon, Apple-Touch-Icon, Android-/PWA-Icons, maskable 512.
- AMARIS bekommt eigenes `/amaris.webmanifest` mit Start-URL `/amaris/`.
- Globales `site.webmanifest` nutzt den neuen Icon-Satz.
- AMARIS-MediaSession aktualisiert Titel, DJ/Artist, Album und Artwork dynamisch.
- Track-Cover-Logik bleibt erhalten: Trackbild temporär, danach Rückfall auf Bild 2.
- Desktop-Hintergrund greift nur auf größeren Viewports; iPhone-Ganzdisplay bleibt clean.

### Nicht verändert
- Hauptplayer-Audioarchitektur.
- `/internal`-Notfallplayer.
- Skip-/Discord-/Auth-Routen aus v1.2.6.
- iPhone Booster/EQ/Levelmeter.
- Stream-/Worker-Switch-Kette.

### Hinweis
- Live-Metadaten im Home-Screen-Icon sind OS-seitig nicht möglich.
- Lock-Screen-/Control-Center-Darstellung wird über Media Session Artwork und Metadaten bedient.
