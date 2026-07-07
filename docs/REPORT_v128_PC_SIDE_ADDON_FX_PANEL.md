# 666SOUNDsDESIGn WebRadio — v128 PC Side Add-on FX Panel

## Scope
- Basis: v127 PC meter/footer/ticker cleanup.
- Änderung nur PC/Desktop.
- Kein Eingriff in Player-Core, Transport, Tickerlogik, Discord-Code, Worker oder Streamrouting.

## Änderungen
1. Linker Add-on-Slot neben dem Player:
   - AUDIO REACTOR
   - WAVE SCOPE
   - SPECTRUM GRID
2. Rechter Add-on-Slot neben dem Player:
   - VU MATRIX
   - PHASE SCOPE
   - BEAT PULSE
3. Neues ADDON FX Panel in der oberen Info-Reihe:
   - L-FX Toggle
   - R-FX Toggle
   - beide standardmäßig ON
   - Status wird lokal per localStorage gespeichert
4. Version auf v128 aktualisiert.

## Anti-Drift-Regeln
- Add-ons sind externe Panels, nicht im Player-Core montiert.
- Kein neuer Audio-Graph, kein neuer Stream-Hook.
- Keine bestehenden Ticker-/Transport-/Discord-Routen verändert.
- Add-ons können unabhängig ausgeblendet werden.
