# REPORT v177 AUDIO CORE START

## Basis
Aktuelle GitHub-ZIP: `WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (2).zip`

## Ziel
Erster Root-Fix: Boost-Stufen zentralisieren, ohne PC-EQ, Grafik-EQ oder Layout neu zu bauen.

## Geändert
- Neu: `/core/audio/boost-core.js`
- `index.html`: lädt Boost-Core früh im Head.
- `js/equalizer.js`: liest Boost-Gain/Clamp aus `window.SMFPBoostCore`.
- `js/player-core.js`: liest Boost-Max/Labels/Clamp aus `window.SMFPBoostCore`.
- Inline-Mobile-Engine im `index.html`: nutzt dieselben Boost-Gains statt eigener harter Tabelle.
- Boost 5 / 2.20 ist zentral vorbereitet.

## Nicht geändert
- PC grafischer Equalizer wurde nicht entfernt.
- PC manueller Equalizer wurde nicht neu positioniert.
- Worker/Discord/Renda/KV wurden nicht umgebaut.
- Kein neues Overlay wurde eingebaut.

## Zentrale Boost-Tabelle
0 = 1.00
1 = 1.40
2 = 1.70
3 = 1.90
4 = 2.00
5 = 2.20

## Zweck
Alte Hotfix-Clamps auf 3/4 Stufen werden nicht mehr als Hauptlogik verwendet. PC und iPhone hängen am gemeinsamen Boost-Core.
