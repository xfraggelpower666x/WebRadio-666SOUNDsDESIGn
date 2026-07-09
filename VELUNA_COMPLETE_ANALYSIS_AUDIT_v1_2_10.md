# VELUNA COMPLETE ANALYSIS AUDIT v1.2.10

## Release

- Version: `1.2.10`
- Release: `FULLVERSION_VELUNA_IPHONE_FIXED_FULLSCREEN_GEOMETRY_v1.2.10`
- Build: `2026-07-09-veluna-v1210`

## Reparaturziel

Der iPhone-Player muss ein unveränderlicher Ganzseiten-Player sein. Das Öffnen von Overlays, Auth-Dialogen oder der Bildschirmtastatur darf weder Breite noch Höhe noch Grid-Aufteilung verändern.

## Umsetzung

1. `js/veluna-viewport-lock.js` speichert die initiale mobile Viewport-Geometrie in CSS-Variablen.
2. Eine Neuberechnung erfolgt ausschließlich bei einem echten Hoch-/Querformatwechsel.
3. `css/veluna-theme.css` bindet HTML, Body, App-Shell und Player an diese feste Geometrie.
4. Der Player füllt die gesamte Seite innerhalb der iPhone-Safe-Areas.
5. Overlays liegen über dem fixierten Player und erzeugen keinen Reflow.
6. Die Viewport-Meta-Angabe verhindert unerwünschtes Browser-Zoomen.

## Schutz

- Keine Änderung der Audio- oder WebAudio-Kette.
- Keine Änderung an Skip, Discord, Auth, Worker-Routing oder Stream-Failover.
- Keine erneute Einblendung des PC-Bottom-Banners.
- Bestehende zentrale VELUNA-Assets bleiben erhalten.
