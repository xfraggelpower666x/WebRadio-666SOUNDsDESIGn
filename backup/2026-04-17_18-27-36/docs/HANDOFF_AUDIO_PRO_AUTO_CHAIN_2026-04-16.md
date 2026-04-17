# 666SOUNDsDESIGn RADIO – HANDOFF AUDIO PRO + AUTO CHAIN HOT DEFAULT

## BASIS
Diese Version baut **auf der zuletzt gelieferten Vollprojekt-Datei** auf:
`WebRadio-666SOUNDsDESIGn_FULL_ONEPAGE_UI_AUDIO_PRO_2026-04-16.zip`

Das heißt:
- frühere Frontend-Änderungen bleiben enthalten
- Audio-Pro bleibt enthalten
- neuer Auto-Chain-Hot-Default wurde **oben drauf** integriert
- es ist als **eine aktuelle Vollversion** gedacht

## HARTE SYSTEMREGELN
Nicht verändert:
- `worker.js`
- interner Notfallplayer im Worker
- Routing / Domain / Deploy / GitHub-Verknüpfung
- Fallback-Automatik externer Player → Notfallplayer

Verändert wurde **nur der externe Player**.

## ZIEL DER ERWEITERUNG
Der externe Player soll standardmäßig schon kräftig und präsent klingen.
Der normale Lautstärkeregler soll im Alltag reichen.
Die Boost-Stufen bleiben nur als Reserve für schwache Geräte oder Sonderfälle.

## AUDIO-ARCHITEKTUR IM EXTERNEN PLAYER
Signalweg im Browser:

`<audio> → MediaElementSource → InputAnalyser → PreGain (Hot Default + Auto Lift) → Boost Gain → DynamicsCompressorNode → OutputAnalyser → MasterGain → Destination`

### Bedeutung der Stufen
- **PreGain**: fester Grundschub plus automatische Anhebung leiserer Tracks
- **Boost Gain**: manuelle Reserve in 4 Stufen `0 / +3 / +6 / +9 dB`
- **DynamicsCompressorNode**: fängt Spitzen ab und liefert echte Gain-Reduction
- **Analyser**: echte Audio-Reaktion für HUD, Peak, Energie und Meter

## AUTO-CHAIN LOGIK
Auto-Chain ist standardmäßig aktiv.

### Default-Abstimmung
- **Hot Drive**: `+2.5 dB`
- **Auto Target**: `-18 dB`
- **Auto Lift Max**: `+6 dB`
- **Boost Reserve**: separat manuell zuschaltbar

### Verhalten
- leisere Tracks werden automatisch angehoben
- lautere Tracks bekommen weniger Zusatzanhebung
- der Kompressor fängt Spitzen danach kontrolliert ab
- dadurch klingt der Stream standardmäßig schon druckvoller, ohne dass permanent Boost nötig ist

## ECHTE METER / KEIN FAKE
Diese Anzeigen hängen an echtem Audio:
- **Boost** = tatsächliche manuelle Boost-Stufe
- **Drive** = fester Hot-Default-Grundschub
- **Lift** = aktuelle Auto-Chain-Anhebung
- **Target** = Zielpegel der Auto-Chain
- **GR** = echte Gain Reduction aus `DynamicsCompressorNode.reduction`
- **Peak** = echter Peak aus dem Ausgangssignal
- **Limit** = Status aus Peak + GR
- seitliche Meter / Glow / HUD = aus laufender Audioanalyse

## GEÄNDERTE DATEIEN
Nur diese Dateien wurden angepasst:
- `external-player/index.html`
- `external-player/css/main.css`
- `external-player/js/app.js`
- `external-player/js/player-ui-audio-pro.js`

Zusätzlich neu im Projekt:
- `HANDOFF_AUDIO_PRO_AUTO_CHAIN_2026-04-16.md`

## WAS IN DEN DATEIEN GEMACHT WURDE
### `external-player/index.html`
- Audio-Pro-Bereich um Auto-Chain-HUD erweitert
- neue Anzeigen für `Chain`, `Drive`, `Lift`, `Target`

### `external-player/css/main.css`
- neue Styles für Auto-Chain-HUD ergänzt
- responsive Grid für neue Meterboxen ergänzt

### `external-player/js/app.js`
- weiterhin Startpunkt des externen Players
- nutzt jetzt die aktualisierte Audio-Pro-/Auto-Chain-Logik

### `external-player/js/player-ui-audio-pro.js`
- echter Web-Audio-Graph erweitert
- neuer `preGainNode` für Hot Default + Auto Lift
- echte Auto-Chain-Zielregelung anhand von Time-Domain-RMS
- echte GR aus `DynamicsCompressorNode.reduction`
- HUD-Anzeigen für Drive / Lift / Target / Chain-Status
- Boost bleibt als Reserve erhalten

## INTEGRATIONSEMPFEHLUNG
Da der externe Player bei dir im GitHub-Projekt der Standardplayer ist, sollte zur Integration **nur der externe Player-Teil** übernommen werden.

### Minimal sauber integrieren
Übernehmen aus dieser Version:
- `external-player/index.html`
- `external-player/css/main.css`
- `external-player/js/app.js`
- `external-player/js/player-ui-audio-pro.js`

### Nicht anfassen
- Worker-Dateien
- Worker-Notfallplayer
- Fallback-Logik
- Stream-/Metadata-Routen

## HINWEIS FÜR DEN INTEGRATOR
Die Auto-Chain sitzt vollständig im Browser-Frontend. Sie benötigt **keine** Worker-Anpassung.
Die Audioanalyse und Dynamikbearbeitung laufen erst sauber, nachdem der User Audio per Button/Play aktiviert hat. Das passt zur bestehenden Boot-/Startlogik.

## ERWARTETES ERGEBNIS
- externer Player klingt standardmäßig voller und druckvoller
- leise Tracks werden besser eingefangen
- Boost ist seltener nötig
- GR-/Peak-/Limit-HUD reagieren auf echtes Audiosignal
- Worker-Fallback-Architektur bleibt komplett erhalten
