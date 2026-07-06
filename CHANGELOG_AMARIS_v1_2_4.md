# 666SOUNDsDESIGn WebRadio — Changelog AMARIS v1.2.4

**Release-ID:** `FULLVERSION_AMARIS_FULLSCREEN_AUTH_SKIP_5BAND_EQ_DISCORD_AUDIOSTABILITY_LEVELMETER_v1.2.4`  
**Baseline:** `FULLVERSION_AMARIS_RESPONSIVE_TICKER_METADATA_LYVRA_DJ_REPAIR_v1.2.3`  
**Status:** LOCAL REPAIR PASS

## Geändert

- AMARIS-iPhone-Layout neu als echtes Ganzdisplay-Grid verteilt.
- AMARIS-PC bleibt kompakter Miniplayer auf schwarzem Hintergrund.
- Header-Schrift deutlich vergrößert.
- LYVRA-Footer-Zeile vergrößert und mit Auto-Fit gegen Abschneiden abgesichert.
- Main-/Backup-Auswahl wieder als LED-Schalter umgesetzt.
- Kleines Bottom-Levelmeter für iPhone und PC eingebaut.
- Neuer `SKIP`-Button für Auto-DJ Skip über bestehende Admin-/Auth-Worker-Kette.
- Neuer `DISC`-Button für Discord-Shooter über bestehende Admin-Session und `/api/discord/manual`.
- Neuer mobiler `SOUND`-Button mit AMARIS-Soundpanel.
- Mobile Boost-Stufen `0–5` eingebaut.
- Mobiler 5-Band-EQ `SUB / LOW / MID / HIGH / AIR` eingebaut.
- Audio-Stability-Guard für `visibilitychange`, `pagehide`, `pageshow` und `focus` ergänzt.
- Metadata-Detailpanel `META` eingebaut.
- Neue Frontend-Vertragstests für v1.2.4 ergänzt.

## Erhalten

- Hauptplayer bleibt erhalten.
- `/internal`-Notfallplayer bleibt erhalten.
- AMARIS bleibt eigenständiger Endpunkt.
- Worker-Switch-Kette bleibt worker-first.
- Admin-/Auth-Hardlock bleibt maßgeblich.
- Keine Secrets im Frontend.
- PC bekommt keinen Booster und keinen EQ.

## Tests

```text
npm run verify: PASS
Node-Tests: 41 / 41 PASS
Release-Check: PASS
JavaScript-/MJS-Syntax: 111 PASS
```
