# 666 Player / VELUNA PC Layout Repair — 2026-07-20

## Umfang

- 666 Hauptplayer horizontal zentriert und alte absolute Verschiebung neutralisiert.
- Linke/rechte PC-Panels verbreitert; Innenmodule wieder groß und quadratisch ausgelegt.
- Equalizer höher, containerbezogen skaliert und über die Mitte signalbasiert durchgängig.
- Außenmeter und Bottom-Meter mit schneller Attack- und kontrollierter Release-Kurve dynamisiert.
- Doppelte Writer entfernt: `equalizer.js` ist alleinige Autorität für EQ und Levelmeter.
- `player-stage-v2.js` beschränkt auf Touchfeedback, Ticker, Aktionsbuttons und Status-LEDs.
- Now-Playing- und Kontrollbereich des Hauptplayers kompakt neu geordnet; Volume bleibt vollständig sichtbar.
- VELUNA-PC-Player wieder horizontal/vertikal zentriert.
- Überhöhten VELUNA-Now-Playing-Freiraum verkürzt und Card-Höhe auf Inhaltsmaß zurückgeführt.
- iPhone-Viewport-Lock, Audio-/EQ-/Booster-/Limiter-Kette, Discord und Auto-DJ-Skip unverändert erhalten.
- Root- und `public/`-Spiegel über identische Git-Blobs synchronisiert.

## Ursache

Mehrere JavaScript-Schleifen schrieben gleichzeitig EQ, Seitenmeter und Bottom-Meter. Zusätzlich überschrieb eine späte VELUNA-Desktopregel die Zentrierung mit `align-items:flex-start`. Beim Hauptplayer blieb aus älteren Layoutregeln absolute Positionierung aktiv.

## Vertragsprüfung

`tests/frontend-contracts.test.mjs` prüft jetzt:

- genau eine Visualizer-Autorität,
- Hauptplayer-Zentrierung und große Seitenmodule,
- VELUNA-Zentrierung und kompakte Now-Playing-Geometrie,
- Root/Public-Bytegleichheit,
- Erhalt von Skip, Discord, Messenger, Audiochain und iPhone-Geometrie.
