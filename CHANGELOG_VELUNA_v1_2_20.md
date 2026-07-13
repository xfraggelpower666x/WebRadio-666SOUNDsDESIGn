# CHANGELOG VELUNA v1.2.20

## IPHONE ADAPTIVE FULLSCREEN GEOMETRY

- Ursache des schwarzen Restbereichs auf iPhone behoben.
- Bestehender `js/veluna-viewport-lock.js` bleibt alleiniger Geometrie-Eigentümer.
- Die feste Höhe wird bei vergrößerter Safari-Nutzfläche innerhalb derselben Ausrichtung nachgeführt.
- `visualViewport.resize` und `visualViewport.scroll` werden in der vorhandenen Logik berücksichtigt.
- Tastaturbedingte Verkleinerungen werden weiterhin nicht als neue Playergeometrie übernommen.
- Orientierungswechsel erfassen Breite und Höhe vollständig neu.
- Keine neue CSS-Datei, kein Override-Layer und keine Änderung an Audio, Auth oder Messaging.
