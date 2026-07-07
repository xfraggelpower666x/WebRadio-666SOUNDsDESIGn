# V181 Mobile Visible Rootfix Report

Basis: v180 package.

Geändert:
- iPhone-History wird aktiv in die Discord/SEND-Funktionsleiste verschoben.
- Obere/mobile Versionsbadges werden ausgeblendet.
- Version wird als kleiner Footer unter dem unteren Meter angezeigt.
- Player-SEND wird im Capture-Pfad hart auf /api/player-alert/send gebunden. Alte konkurrierende Send-Handler werden für den SEND-Button blockiert.
- Sendestatus sagt PLAYER SENT / PLAYER FAILED, nicht Discord/global.
- Discord-Panel wird optisch entkernt; DC/MSG bleiben.
- iPhone-Fokus/Zoom nach Overlay wird weiter geblockt.

Nicht geändert:
- PC-EQ
- PC-Layout
- Worker-Discord-Routen
- Stream-Routen
