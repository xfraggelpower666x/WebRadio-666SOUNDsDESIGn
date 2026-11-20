# 666 LIGHT ORCHESTRA — Protocol Evidence 2026-10-01

## SymphonyLightPro 1.0.6

Quelle: bereitgestellte XAPK `SymphonyLightPro_1.0.6_APKPure.xapk`.

Statisch gefunden:
- Package `com.lenzetech.symphonylightpro`
- Service `0000FFF0-0000-1000-8000-00805F9B34FB`
- Write `0000FFF3-0000-1000-8000-00805F9B34FB`
- Notify `0000FFF4-0000-1000-8000-00805F9B34FB`
- iPhone-Gerätename `LENZE-RGB`, zwei gebundene Geräte

Die LENZE-Frames sind noch nicht hardware-verifiziert und bleiben gesperrt.

## Magic Lantern 6.11.10

Quelle: bereitgestellte XAPK `Magic+Lantern_6.11.10_APKPure.xapk`.

Statisch gefunden:
- Package `wl.smartled.rgb`
- Service `FFF0`
- Write `FFF3`
- App-Konstanten/Funktionen für Brightness, Color, Light Mode, Mode Speed, Scene, RGB Pin Sequence, External Mic, Symphony Point und Timing
- iPhone-Gerätename `OC21W`, vier Geräte

Öffentliche Reverse-Engineering-Dokumentation derselben Android-App-Familie beschreibt die 9-Byte-Frames `7E LEN CMD P1 P2 P3 P4 P5 EF`. Dieser Treiber bleibt von LENZE getrennt, obwohl beide GATT-Grund-UUIDs gleich aussehen.

## Safety State

- Govee: implementiert
- OC21W: Protokoll implementiert, Writes opt-in
- LENZE-RGB: Discovery/Notify implementiert, Writes blockiert
