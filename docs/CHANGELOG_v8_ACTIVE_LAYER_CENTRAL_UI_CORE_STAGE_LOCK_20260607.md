# v8 ACTIVE LAYER CENTRAL UI CORE + STAGE LOCK

## Ziel
Aktive sichtbare Header-/Status-/Broadcast-Layer reparieren statt neue Parallel-UI aufzubauen.

## Geändert
- Zentrale Header-Definition fuer PC + iPhone ergänzt.
- Mobile `mff-cyber-header` nutzt dieselbe Headergrafik wie PC.
- Alte sichtbare Headerreste `phase10CleanHeaderLogo`, `pcHeaderBrandSplit`, `pcHeaderNewLogo` werden deaktiviert.
- Zentrale LED-Definition für PC + iPhone ergänzt: MET, SRC, WRK, WCH, STR, MAIN, DSC, GOV, ART.
- PC-Topbar kompakter vorbereitet; Listener/Qualität/DJ werden als kompakte Chips gespiegelt.
- AutoDJ-/Unknown-DJ-Anzeige wird zentral auf `DJ 666` normalisiert.
- GOVEE- und Watchdog-Status werden an dieselbe Statuslogik angebunden.
- Broadcast-/Message-Emoji-Leiste wird im vorhandenen Message-Layer reaktiviert.
- PC/iPhone Stage Lock ergänzt: Overlays dürfen den Player nicht vergrößern.

## Nicht geändert
- Keine Deploy-Route geändert.
- Keine Secrets/Tokens geschrieben.
- Kein neuer Player-Layer.
- Root-Hauptplayer bleibt.
- Worker-interner Notfallplayer bleibt.
- Dark Dancer bleibt.
- GOVEE-Dateien bleiben als ES-Module.

## Upload
Diese ZIP ist als Full-Repo-Root gedacht und kann mit Scriptable `REPO-ROOT ersetzen / bereinigen` verwendet werden, wenn die Vorschau keine geschützten Ordner löschen will.
