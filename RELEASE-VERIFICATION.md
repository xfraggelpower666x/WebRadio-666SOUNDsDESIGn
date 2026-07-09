# RELEASE VERIFICATION VELUNA v1.2.10

**Release:** `FULLVERSION_VELUNA_IPHONE_FIXED_FULLSCREEN_GEOMETRY_v1.2.10`  
**Build:** `2026-07-09-veluna-v1210`

## Lokale Verifikation

- `npm run verify`: **PASS**
- Node-Tests: **43 / 43 PASS**
- JavaScript-/MJS-Syntax: **117 PASS**
- Root-/Public-Spiegel: **62 PASS**
- Pflichtdateien: **51 PASS**
- Nested ZIP-Dateien: **0**

## Reparatur bestätigt

- iPhone-Player ist eine feste Ganzseiten-Geometrie.
- Breite und Höhe werden beim Start gespeichert.
- Overlays, Auth-Dialoge und Bildschirmtastatur verändern die Playergröße nicht.
- Nur ein echter Orientierungswechsel berechnet die Geometrie neu.
- Desktop-Bottom-Banner bleibt entfernt.
- Audio, Worker, Skip, Discord, Booster, EQ, Levelmeter und Metadaten bleiben erhalten.

## Noch live zu prüfen

- echtes iPhone Safari / Home-Screen-PWA
- native Passwortmanager- und Tastaturdarstellung
- Hoch-/Querformatwechsel
- Cloudflare-Routing und Cache
