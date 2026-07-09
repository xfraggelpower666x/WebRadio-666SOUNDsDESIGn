# CHANGELOG VELUNA v1.2.10

**Release:** `FULLVERSION_VELUNA_IPHONE_FIXED_FULLSCREEN_GEOMETRY_v1.2.10`  
**Build:** `2026-07-09-veluna-v1210`

## Änderungen

- iPhone-Player als starre Ganzseiten-Geometrie festgesetzt.
- Viewportbreite und -höhe werden beim Start erfasst und nur bei echtem Orientierungswechsel neu gesetzt.
- Browserleisten, Overlays, Passwortdialoge und Bildschirmtastatur verändern die Playergröße nicht mehr.
- App-Shell und Player-Panel belegen den vollständigen gespeicherten iPhone-Viewport innerhalb der Safe-Areas.
- Overlays bleiben über dem unveränderten Player und lösen keinen Dokument-Reflow aus.
- Mobile Auto-Zoom-Schutz durch 16-px-Eingabefelder sowie gesperrte Viewport-Skalierung ergänzt.
- Desktop-Bottom-Banner bleibt wie in v1.2.9 entfernt.
- Audio-, Auth-, Worker-, Discord-, Skip-, Booster-, EQ- und Metadatenlogik unverändert erhalten.
