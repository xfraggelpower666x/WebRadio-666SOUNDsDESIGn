# REPORT v97 SAFE LAYOUT SHAPE FIX

## Zweck
Gezielte Instandsetzung auf Basis des realen v96 SAFE_RESYNC FULL-ZIP. Kein neues Design, kein Worker-/Stream-/Discord-Routing-Umbau.

## Änderungen
- iPhone-Player nicht mehr vertikal zentriert, sondern kontrolliert von oben aufgebaut.
- Große Leerzone oben reduziert; Player rutscht nach oben.
- Mobile Shell als feste Grid-Struktur mit stabilen Reihen für NowPlaying, LEDs, Discord, Cards, EQ, Controls, Boost und Bottom-Meter.
- Abstände zwischen Cards, EQ, Controls, Boost und Bottom-Meter korrigiert.
- Cards werden nicht mehr vom EQ optisch angeschnitten.
- Side-Meter-Positionen an neue Playerhöhe angepasst.
- Versionsanzeige auf v97 synchronisiert.

## Nicht geändert
- Worker-Routing
- Stream-Routing
- Discord-Webhook-Routing
- Audio-Recovery
- Boost-Logik
- PC-Grundlayout außer Versionssync/Cache-Version

## Prüfung
- Root bleibt sauber; Report liegt in docs/.
- JS Syntax wurde geprüft.
