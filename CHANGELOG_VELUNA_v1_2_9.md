# CHANGELOG VELUNA v1.2.9

**Release:** `FULLVERSION_VELUNA_DESKTOP_BOTTOM_BANNER_REMOVAL_v1.2.9`  
**Datum:** 2026-07-09

## Geändert
- Das breite VELUNA-Banner unter dem Player wird auf PC/Desktop nicht mehr erzeugt.
- Die störende Desktop-Platzierung außerhalb der Player-Card wurde aus der zentralen UI-Logik entfernt.
- Sämtliche Desktop-spezifischen CSS-Regeln für `.veluna-desktop-outside` wurden entfernt.
- Das Banner bleibt ausschließlich für das mobile/touchbasierte VELUNA-Panel verfügbar.
- Hauptplayer, VELUNA-Player, Notfallplayer, Audio, Booster, EQ, Auth, Skip, Discord, Worker-Routing und zentrale Assets bleiben unverändert erhalten.

## Reparaturgrund
Der reale PC-Sichttest zeigte, dass das zusätzliche Banner unterhalb des kompakten Players die Gesamtkomposition des gemeinsamen Hintergrundbildes sichtbar beschädigt.

## Schutz
Keine Grafikdatei wurde gelöscht, da das Banner auf dem mobilen VELUNA-Panel weiterhin verwendet wird.
