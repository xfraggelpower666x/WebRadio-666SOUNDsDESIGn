# REPORT v36.3.1 — PC VIEWPORT HOTFIX

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.3.1  
**Build:** v36.3.1-2026-06-05-pc-viewport-hotfix  
**Basis:** v36.3 Metadata/Cover/Viewport Stability  
**Status:** PASS  
**Worker geändert:** Nein  

## Grund

v36.3 hat den Desktop-Player sichtbar kaputt skaliert/zusammengedrückt. Der Viewport-Fix war zu aggressiv und hat nicht sauber zwischen PC und Mobile getrennt.

## Korrektur

- Desktop/PC-Höhenklemmen entfernt
- Desktop `.player-shell` wieder normal breit und sichtbar
- Desktop `overflow-y:auto`
- Mobile/iPhone-Viewport-Schutz bleibt aktiv
- Mobile-Limits bleiben nur innerhalb `@media (max-width:760px)`

## Behalten

- Metadata/Cover-Stabilisierung
- Split Booster PC/iPhone
- Canonical Layer Cleanup
- Codex Recovery
- DarkDancer
- Worker unverändert
- Schlechte Custom-Kopfzeile bleibt entfernt
