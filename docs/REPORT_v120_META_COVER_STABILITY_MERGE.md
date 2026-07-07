# v120 META/COVER STABILITY MERGE

Basis: v118_PC_LAYOUT_CLAMP_REPAIR_FULL.

Ziel: Meta-/Cover-Blinken beruhigen ohne Dateiverlust und ohne Reset auf kleinere GitHub-Stable-ZIP.

Änderungen:
- PC Cover wird nur bei stabiler URL-Änderung neu gesetzt; Cachebuster-only Änderungen werden ignoriert.
- iPhone Streambild wird nur bei stabiler URL-Änderung neu gesetzt; Cachebuster-only Änderungen werden ignoriert.
- Status-Chip/LED-Updates brechen ab, wenn Zustand und Tooltip unverändert sind.
- Kein Layout, kein Ticker, kein EQ, kein Discord, kein Worker/Streamrouting.

Prüfung:
- Basisdateien aus v118 bleiben erhalten.
- Keine kleinere GitHub-Stable-ZIP als Basis verwendet.
