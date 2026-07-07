# WebRadio-666SOUNDsDESIGn — Hardlock Repair v1.2.0

Dieses Paket ist die vollständige lokale Hardlock-Reparatur auf Basis von `FULLVERSION_AUDIT_REPAIR_v1.1.0`.

## Einstieg

1. `HARD_AUDIT_POLICY.md` lesen.
2. `HARDLOCK_REPAIR_REPORT.md` lesen.
3. `HARDLOCK_VALIDATION.json` prüfen.
4. Lokal `npm ci` und `npm run verify` ausführen.
5. `DEPLOYMENT_REQUIRED_CHECKS.md` vollständig abarbeiten.
6. Änderungen atomar auf `repair-v1` übernehmen.
7. Erst nach Live- und Geräteprüfung in `WebRadio-666SOUNDsDESIGn` mergen.

## Status

- Lokale Hard-Audit-Prüfung: **PASS**
- Live-Deploymentprüfung: **BLOCKED / PENDING**
- Produktionsbranch verändert: **NEIN**
- Live-Deployment ausgeführt: **NEIN**
- Secrets enthalten: **NEIN**

## Harte Freigaberegel

Ein Live-Deploy ist gesperrt, solange Cloudflare-Secrets, Worker-zu-Worker-Vertrag, Render-Persistenz und physische Geräteprüfungen nicht vollständig PASS sind.

## Aktuelles UI-/Metadaten-Addendum v1.2.5

Die Hardlock-Basis bleibt erhalten. Der aktuelle Zusatzrelease repariert ausschließlich den eigenständigen AMARIS-Miniplayer sowie die gemeinsame sichtbare Titel-/DJ-Normalisierung. Vollständiger Befund: `AMARIS_COMPLETE_ANALYSIS_AUDIT_v1_2_3.md`. Release-Dokumente: `docs/release-v1.2.5/`.

## Aktuelles AMARIS-Addendum v1.2.5

Der Hardlock- und v1.2.3-Stand bleibt erhalten. v1.2.5 erweitert ausschließlich den eigenständigen AMARIS-Miniplayer: Fullscreen-iPhone-Verteilung, PC-Minicard-Erhalt, geschützter Auto-DJ-Skip, Discord-Shooter, mobiles Boost-/5-Band-EQ-Soundpanel, Audio-Stability-Guard, Bottom-Levelmeter und Main/Backup-LED-Schalter. Vollständiger Befund: `AMARIS_COMPLETE_ANALYSIS_AUDIT_v1_2_4.md`. Release-Dokumente: `docs/release-v1.2.5/`.
