# V183 Emergency Click Unblock Report

Basis: v182.

Ziel: iPhone wieder klickbar machen, nachdem v182 mobile Overlays/Backdrops offenbar Klicks blockieren.

Geändert:
- Risiko-Regel entfernt: Body-Level Backdrops werden nicht mehr pauschal sichtbar/pointer-active gemacht. Entfernt: True
- Bestehende Overlays fangen Klicks nur noch ab, wenn `.is-open` bzw. `data-history-open="1"` aktiv ist.
- Kein PC-EQ, kein PC-Layout, kein Worker, kein Audio-Core geändert.

Prüfung:
- index.html geändert.
- Keine neue sichtbare UI eingeführt.
