# VELUNA v1.2.9 – TARGETED DESKTOP BANNER REPAIR AUDIT

## Release
`FULLVERSION_VELUNA_DESKTOP_BOTTOM_BANNER_REMOVAL_v1.2.9`

## Reale Fehlergrundlage
Der PC-Screenshot vom 2026-07-09 zeigt das zusätzliche breite VELUNA-Banner direkt unterhalb des zentralen Miniplayers. Es konkurriert mit dem bereits bildstarken Seitenhintergrund, verlängert die Mittelachse und zerstört die ausgewogene Gesamtkomposition.

## Reparatur
- Desktop-Erzeugung des Bottom-Banners vollständig deaktiviert.
- Keine Platzierung mehr unter Hauptplayer oder VELUNA-Player auf PC.
- Desktop-Hilfsklasse `veluna-desktop-outside` aus JavaScript und CSS entfernt.
- Mobile/touchbasierte VELUNA-Platzierung bleibt bestehen.
- Zentrale Bannerdatei bleibt erhalten, weil sie mobil weiterhin gebraucht wird.

## Nicht verändert
- gemeinsames Hintergrundbild
- responsiver Header
- Stream-Fallback-Cover
- App-/Browser-/PWA-Icons
- interner Ladebildschirm
- Playerfunktionen
- Audio-/EQ-/Booster-Kette
- Skip/Auth/Discord
- Worker-Endpunkte und Legacy-Routen

## Erwartetes Ergebnis
Auf PC bleibt nur der kompakte Player vor dem großen gemeinsamen Hintergrundbild sichtbar. Unter dem Player erscheint kein zusätzliches VELUNA-Banner mehr.
