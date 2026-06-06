# REPORT v36.0 — Layer Recovery / Codex Feature Rescue

## Zweck
Nützliche Codex-Verbesserungen waren im Code vorhanden, konnten aber durch spätere Mobile-/Main-Player-Layer verdeckt oder nicht spät genug gebunden werden.

## Wiederhergestellt
- iPhone Admin-Menü-Hub bleibt nach späterem Mobile-Frontend-Mount sichtbar.
- ADMIN-Aktion öffnet jetzt `window.FPAdminOverlay.open()` bzw. `#fp-admin-button`.
- Mobile EQ/Sound-Control-Trigger werden wiederholt auch nach später erzeugten Mobile-DOM-Layern gebunden.
- Message/Broadcast-Composer bekommt eine Emoji-/Smiley-Leiste im iPhone-Overlay.
- EQ-Flächen bekommen pointer-events/touch-action zurück.

## Nicht geändert
- worker.js
- worker-addons/
- Discord/Message Backend
- Stream-Routen
- DarkDancer
- Custom Player Header
