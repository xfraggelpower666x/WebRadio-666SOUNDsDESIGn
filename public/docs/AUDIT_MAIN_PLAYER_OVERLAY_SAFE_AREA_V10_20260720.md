# 666 PLAYER / VELUNA / OVERLAY SAFE-AREA AUDIT V10

## Scope

- 666 Hauptplayer: Header, Statuszeilen, Buttondesign, EQ-Mitte, Außenmeter und Now Playing.
- VELUNA iPhone: Dynamic-Island-Abstand und Nutzung der sicheren Viewporthöhe.
- Alle Player: zentrierte, Safe-Area-sichere und intern scrollbare Overlays.

## Architekturentscheidungen

- `js/equalizer.js` bleibt alleiniger Writer für EQ, Außenmeter und Bottom-Meter.
- `js/player-stage-v2.js` konsumiert ausschließlich `window.__MeterBus` für Panelmodule, Header, Buttons und Now Playing.
- Der Audio-Graph bleibt `MediaElementSource → Boost Gain → Real-EQ-Biquads → Limiter → Analyser → Destination`.
- Der Overlay-Core verändert ausschließlich Geometrie, Safe Area, Scrollbarkeit und Close-Sichtbarkeit. Player-Themes bleiben zuständig für Farben, Rahmen, Hintergründe und Typografie.
- VELUNA-Safe-Area liegt im bestehenden `veluna-viewport-lock.js`, nicht in einem zusätzlichen Designlayer.

## Reparaturen

- künstliche −5/−10-Höhenabzüge der äußeren Meter entfernt
- symmetrische Meterkanäle eingeführt
- signalabhängige EQ-Mittelbrücke aus RMS und Breitbandenergie
- transform-only EQ ohne CSS-Transitions
- Cockpit-/Neon-Buttondesign und violette Aktivzustände
- responsive LYVRA-Kopfzeilengrafik für Desktop und iPhone
- obere Statusgruppen ohne Überlagerung
- Now Playing: Cover links, statische Überschrift, statischer Titel, reine Titel-Laufschrift
- VELUNA beginnt unter Dynamic Island/Statusleiste und endet über dem Home-Indikator
- bestehende Overlays werden zentral erkannt, zentriert, skaliert und intern scrollbar gehalten

## Schutz

Nicht verändert:

- Stream- und Audioquelle
- Booster-Stufen und Gain-Ramp
- realer Equalizer und Limiter
- Discord Shooter
- Broadcast Messenger
- Auto-DJ Skip und Admin-Auth
- VELUNA-Farben, Paneloberflächen und Typografie
- interner Notfallplayer-Stream

## Verifikation

Die Repository-Tests prüfen Syntax, Root/Public-Spiegel, Single-Writer-Visualizer, Safe Area, Overlay-Geometrie und bestehende Funktionsverträge.
