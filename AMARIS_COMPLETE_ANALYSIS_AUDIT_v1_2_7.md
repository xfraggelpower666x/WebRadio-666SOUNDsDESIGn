# AMARIS COMPLETE ANALYSIS AUDIT v1.2.7

## Release
`FULLVERSION_AMARIS_BRANDING_BACKGROUND_ICONS_MEDIASESSION_v1.2.7`

## Scope
Branding-/Icon-/MediaSession-Patch auf Basis von v1.2.6.

## Bildzuordnung
- Bild 1: `/assets/images/amaris-pc-background.jpeg` und `...-original.jpeg` — nur Desktop-/PC-Hintergrund.
- Bild 2: `/assets/images/amaris-stream-fallback.jpeg` und `...-original.jpeg` — Stream-Fallback, erstes Cover, Icons und MediaSession-Fallback.

## Umgesetzt
- Desktop-AMARIS bekommt das erste Originalbild als skalierenden Hintergrund mit `cover`, zentrierter Position und dunkler Lesbarkeitsmaske.
- Mobile/iPhone nutzt diesen Desktop-Hintergrund nicht.
- Bild 2 ist AMARIS-Startcover und Fallback-Cover.
- Bestehende Track-Cover-Logik bleibt aktiv: Trackcover kann erscheinen, danach Rückfall auf Bild 2.
- Icons wurden aus Bild 2 erzeugt: favicon, Apple Touch, Android/PWA, maskable.
- `/amaris.webmanifest` hinzugefügt: Start-URL `/amaris/`, AMARIS-Name, Bild-2-Icons.
- `/site.webmanifest` und `/public/site.webmanifest` auf Bild-2-Icons aktualisiert.
- Media Session API für AMARIS ergänzt: Titel, DJ, Album und Artwork werden aktualisiert.
- Root-HTML/Icon-Metadaten auf neue Icons und dunkle Theme-Farbe nachgezogen.

## Schutzprüfung
- Keine Secrets geschrieben.
- Keine Änderung an Audio-/Skip-/Discord-/Auth-Routen.
- Kein externes Laden der Bilder.
- Originalbilder bleiben als lokale Assets erhalten.

## Testpunkte
- `/amaris/` Desktop: Hintergrund Bild 1 sichtbar, Player lesbar und kompakt.
- `/amaris/` iPhone: kein Desktop-Hintergrund, Player bleibt Fullscreen.
- AMARIS Startcover: Bild 2 sichtbar.
- Trackbild vorhanden: temporär sichtbar, danach Rückfall auf Bild 2.
- Browser-Tab/Icon: Bild 2.
- iPhone Home-Screen-Icon: Bild 2 nach Neu-Hinzufügen.
- Lock Screen / Control Center: MediaSession mit Tracktitel, LYVRA DJ/Live-DJ und Bild 2 oder Trackcover.
