# AMARIS Complete Analysis & Audit v1.2.4

**Release:** `FULLVERSION_AMARIS_FULLSCREEN_AUTH_SKIP_5BAND_EQ_DISCORD_AUDIOSTABILITY_LEVELMETER_v1.2.4`  
**Baseline:** `FULLVERSION_AMARIS_RESPONSIVE_TICKER_METADATA_LYVRA_DJ_REPAIR_v1.2.3`  
**Status:** LOCAL REPAIR PASS · LIVE-CLOUDFLARE-/ECHT-IPHONE-AUDIOVALIDIERUNG ERFORDERLICH

## Auftrag

AMARIS bleibt ein eigener Mini-Player-Endpunkt. Bestehende Player bleiben erhalten. Der nächste Patch sollte vor Umsetzung sauber geplant werden und danach gezielt folgende Punkte ergänzen:

- iPhone wieder als typischer Ganzdisplay-Player, nicht oben zusammengedrückt mit leerem unteren Bereich.
- PC weiter als kleiner Miniplayer auf schwarzem Hintergrund.
- Auto-DJ Skip mit Passwort-/Auth-Worker auf iPhone und PC.
- Fünfstufiger Mobile-Booster mit Off-Stufe `0` bis Max-Stufe `5`.
- Manueller 5-Band-EQ auf iPhone: `SUB / LOW / MID / HIGH / AIR`.
- Discord-Shooter im AMARIS-Player.
- Audiostabilisierung nach App-Wechsel / Sichtbarkeitswechsel.
- Kleines Levelmeter unten auf iPhone und PC.
- Main-/Backup-Umschaltung wieder als LED-Schalter.
- Überschrift und LYVRA-Footer größer.

## Umgesetzter Scope

### Layout

- AMARIS iPhone bleibt `100dvh` / `100svh`, `overflow:hidden`, ohne horizontales oder vertikales Dokument-Scrolling.
- Die Karte nutzt eine echte Ganzdisplay-Grid-Aufteilung mit Header, Status, Now-Playing-Zone, Metadaten, Main/Backup-LEDs, Controls, Tool-Leiste, Levelmeter und Footer.
- PC bleibt eine kompakte Card mit `max-width: 520px` auf schwarzem Hintergrund.
- SOUND-Panel ist auf Desktop ausgeblendet; PC bekommt keinen Booster/EQ.

### Auto-DJ Skip

- Neuer Button `SKIP`.
- Nutzt die bestehende gemeinsame Admin-Bearer-Authentifizierung über `window.S666AdminAuth.ensure()`.
- Nutzt bevorzugt `window.S666SkipControl.skip({ source: 'amaris-lyvra-v124' })`.
- Fallback bleibt derselbe geschützte Endpunkt `/api/admin/skip` über `S666AdminAuth.fetch`.
- Keine Passwörter, Tokens oder Secrets im Frontend.

### Discord-Shooter

- Neuer Button `DISC`.
- Nutzt dieselbe Admin-Session wie Admin/Skip.
- Sendet AMARIS-Now-Playing-Payload an `/api/discord/manual` über `S666AdminAuth.fetch`.
- Keine Discord-Gate-Code- oder Token-Duplikation.

### Mobile-Booster und 5-Band-EQ

- Neuer Button `SOUND` nur mobil sichtbar.
- Interner AMARIS-Soundpanel mit Boost `0–5` und EQ-Bändern:
  - `SUB` lowshelf 55 Hz
  - `LOW` peaking 160 Hz
  - `MID` peaking 1000 Hz
  - `HIGH` peaking 3600 Hz
  - `AIR` highshelf 10500 Hz
- EQ-Regelbereich: `-12 dB` bis `+12 dB`.
- Boost-/EQ-Zustand wird lokal gespeichert.
- Auf Desktop werden Boost und EQ neutral gehalten.

### Audio-Stability-Guard

AMARIS ergänzt eine sanfte Recovery-Kette für App-/Tab-Wechsel:

- `visibilitychange`
- `pagehide`
- `pageshow`
- `focus`
- `orientationchange` / Viewport-Resize für UI-Reflow

Bei Rückkehr versucht AMARIS zuerst:

1. AudioContext resume.
2. Audioelement weiterlaufen lassen.
3. Bei Dead-State sanft reconnecten.
4. Erst danach normale Fallback-Kette verwenden.

### Levelmeter

- Neues kleines Bottom-Levelmeter direkt oberhalb der LYVRA-Footer-Zeile.
- Nutzt WebAudio-Analyser, wenn verfügbar.
- Nutzt synthetische Play-State-Bewegung als Fallback, falls Analyse nicht verfügbar ist.
- Keine große Visualizer-Fläche, kein PC-Booster.

### Main/Backup LED-Schalter

- `MAIN` und `BACKUP` sind wieder direkte LED-Schalter.
- Aktiver Hauptstream leuchtet grün.
- Aktiver Backupstream leuchtet cyan.
- Amber bleibt nur für echte Direktreserve/Fallback-Kandidaten.

## Nicht verändert

- Hauptplayer-Grundsystem bleibt erhalten.
- `/internal`-Notfallplayer bleibt erhalten.
- Worker-Routing für AMARIS bleibt erhalten.
- Stream-/Worker-Switch-Kette bleibt erhalten.
- Auth-Hardlock bleibt erhalten.
- Keine Secrets im Frontend.
- Keine parallele Discord-Gate-Logik.
- Keine Änderung an Hauptplayer-EQ/Booster.

## Lokale Verifikation

```text
npm run verify: PASS
Release-Check: PASS
Node-Tests: 41 / 41 PASS
JavaScript-/MJS-Syntax: 111 PASS
Public-Spiegel: PASS
AMARIS-Aliasrouten: 6 / 6 PASS
Nested ZIPs: 0
```

## Lokale Layout-Messung

### iPhone Viewport Simulation

```text
Viewport:        390 × 844
Document client: 390 × 844
Scroll area:     390 × 844
Player card:     382 × 836
Sound button:    visible
Footer fit:      auto-fit aktiv
```

### Desktop Viewport Simulation

```text
Viewport:        1365 × 768
Document client: 1365 × 768
Scroll area:     1365 × 768
Player card:     520 × 562.67
Sound button:    hidden
Background:      black
```

## Ehrliche Restgrenze

Lokale Tests können bestätigen, dass Routing, DOM, Syntax, Mirror, Protected-Route-Anbindung und Layout-Geometrie stimmen. Ein endgültiger Audiopass für iPhone-App-Wechsel, reale Artefaktvermeidung, Auto-DJ-Skip und Discord-Shooter ist erst nach Cloudflare-Upload mit echter Auth-/Worker-Konfiguration und echtem iPhone-Test möglich.
