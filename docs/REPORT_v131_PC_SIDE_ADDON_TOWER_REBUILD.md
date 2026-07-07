# v131 PC Side Add-on Tower Rebuild

## Basis
- WebRadio-666SOUNDsDESIGn_v130_PC_SIDE_ADDON_WIDE_REACTIVE_FULL.zip

## Scope
- Nur PC-Side-Add-on-Module links/rechts.
- Player-Core, Ticker, Transport, Discord-Code, Worker und Streamrouting nicht geändert.

## Änderungen
1. Alte PC-Side-Add-on-Card-Stacks physisch aus dem DOM entfernt.
2. Linkes Add-on als sauberer HUD-Tower neu aufgebaut.
3. Rechtes Add-on als sauberer HUD-Tower neu aufgebaut.
4. Alte v130-Add-on-CSS/JS-Blöcke entfernt.
5. Neue v131-Tower-CSS/JS-Blöcke eingefügt.
6. L-FX/R-FX-Schalter bleiben erhalten, Standard ON, LocalStorage-State bleibt erhalten.
7. Reaktivität nutzt vorhandene Level-/EQ-Daten, ohne neuen Audio-Graph oder zusätzlichen Audio-Loop zu erzeugen.
8. Version auf v131 gesetzt.

## Anti-Drift-Prüfung
- Kein alter `pc-addon-card`-DOM mehr vorhanden.
- Kein alter v130 Side-Addon CSS/JS-Block mehr vorhanden.
- Kein Player-Core-Ersatz.
- Kein Ticker-Umbau.
- Kein Transport-Umbau.
- Kein iPhone-Umbau.
