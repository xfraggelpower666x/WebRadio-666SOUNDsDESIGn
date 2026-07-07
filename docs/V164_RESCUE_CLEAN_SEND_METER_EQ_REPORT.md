# v164 — RESCUE CLEAN SEND + METER + EQ

Erstellt: 2026-05-18
Geändert: 2026-05-18

## Ziel
Rettungsfix nach v163 ohne neue Player-Struktur.

## Änderungen
- v162/v163 Zusatzblöcke aus `index.html` entfernt, damit keine zusätzlichen Intervall-/Layer-Systeme weiterlaufen.
- Falsches Mobile-Display `BROADCAST READY` entfernt.
- iPhone-Senden wieder über den bestehenden SEND-Dialog geführt.
- Sendestatus im bestehenden Dialog ergänzt: `READY`, `SENDING...`, `SENT ✓ MESSAGE DELIVERED`, `FAILED ✕ ...`.
- PC-Doppel-EQ entfernt: `pcRealEqPanelMirror` aus dem DOM gelöscht und zusätzlich per CSS blockiert.
- Unteres iPhone-Levelmeter beruhigt: keine künstlichen schnellen Sinus-Ausreißer, langsamer geglätteter Pegelhub.
- Version auf v164 gesetzt.

## Nicht geändert
- Keine neue Boost-Engine.
- Kein neuer Player.
- Keine neue Topbar.
- Keine neuen PC-Controls.
