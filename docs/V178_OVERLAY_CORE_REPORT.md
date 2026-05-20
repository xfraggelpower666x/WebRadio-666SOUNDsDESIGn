# v178 Overlay Core Start

Basis: v177.

Geändert:
- Neuer zentraler Overlay-Core: `/core/overlay/overlay-core.js`
- Neuer Overlay-Basis-CSS-Schutz: `/core/overlay/overlay-core.css`
- Version auf v178 aktualisiert über bestehenden Version-Core.
- Cachebuster auf `smfp-v178-overlay-core-20260519`.

Nicht geändert:
- Kein EQ gelöscht oder verschoben.
- Kein Worker/Discord/KV/Renda geändert.
- Kein PC-/iPhone-Layout neu gebaut.
- Keine neuen sichtbaren Overlay-Fenster erzeugt.

Zweck:
- Zentrale Overlay-Registry und Viewport-Lock vorbereiten.
- iOS Textfeld-Zoom-Schutz für bestehende SEND/Discord-Overlays.
- Grundlage für spätere History/SEND/EQ/Admin-Overlay-Zentralisierung.
