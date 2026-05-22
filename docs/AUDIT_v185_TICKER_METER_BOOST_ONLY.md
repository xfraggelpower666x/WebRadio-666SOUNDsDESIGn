# v185 Ticker / Meter / Boost Fix

Basis: WebRadio-666SOUNDsDESIGn_PLAYER_ADMIN_CONFIG_SYSTEM_2026-05-21.zip

Änderungen:
- Mobile-Ticker: echte Marquee über mff-title h1 span wiederhergestellt.
- Boost: 5 LEDs physisch im Mobile-DOM, Stufe 1/2 türkis, Stufe 3 pink, Stufe 4/5 rot.
- Boost: Confirm-Bug behoben, Boost springt nach Warnung auf die gewählte Stufe statt hart auf 4.
- Audio: Compressor weniger aggressiv, damit Booster nicht kastriert wird.
- Levelmeter: Analyzer-Smoothing reduziert, Headroom erhöht, Side-Meter und Bottom-Meter wieder dynamischer.
- Overlay: History-Overlay/Backdrop z-index/pointer-events korrigiert, geschlossene Backdrops blockieren nicht.

Nicht geändert:
- Worker/SEND/Discord-Code im Player-Paket nicht erweitert.
- PC-EQ nicht angefasst.
- PC-Layout nicht angefasst.
