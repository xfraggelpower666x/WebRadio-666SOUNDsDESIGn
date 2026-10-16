# 666 GOVEE CONTROL — CodeForge v0.2 Implementierungsstand
STATUS=PARTIAL | SOURCE_BUILD=LOCAL | PRODUCTION_PROMOTION=NO
DATE=2026-10-17
CODEFORGE_SCOPE=projects/666-GOVEE-CONTROL/
ARCHIVE=666-GOVEE-WORKER-v0.2-CODEFORGE.zip
SHA256=f44c534ec4e1217fe3b4810d6b052131bd0bd5ea866040644c0bd553b961b8ce
ZIP_CRC=PASS

## Umsetzung (lokal erstellt)
- src/index.js: vorhandene Worker-v1-Schnittstelle beibehalten; geschützter POST /api/groups/control (flüchtige Gruppenauswahl, max. acht Geräte, sequentielle Dispatches, Geräte- und Capability-Checks); POST /api/audio/preview berechnet Szenen und steuert keine Geräte.
- src/audio-mapping.js: aus bestehender 666STREAM Radio-Szenensteuerung adaptierte Pure Functions für Bass/Mid/High-Gewichtung, Drops, Presets, Szenen.
- tests/worker.test.mjs: Audio-Mapping, geschützte Vorschau, Gruppen-Duplikatschutz, fehlende Secrets.
- package.json, wrangler.toml, README_DE.md.
- Kein APK-Code, keine API-Key-Werte oder CONTROL_TOKEN-Werte.

## Lokal ausgeführte Tests
node --test: 4 Tests PASS (0 FAIL).
node --check: 2 Dateien PASS.
zip test: PASS.

## Einschränkungen
- Der vollständige v0.2-Quellcode/ZIP ist nur als Chat-Artefakt erstellt, **nicht** in GitHub importiert. Commit dieser Evidenzdatei ist kein Quellimport.
- Worker-v0.2 ist nicht auf Cloudflare deployed. Die Liveversion bleibt unverändert.
- Govee-Capabilities, API-Schema, Rate-Limits und produktive Device-Tests noch nicht bestätigt.
- /api/groups/control besitzt noch keine produktiv hinreichende Typ-/Wertevalidierung der Capability-Parameter. Release Gate BLOCKED.
- Keine Live-Radio-Integration, kein Zugriff auf eine reale Govee-Audioanalyse via Worker.
- Govee-Gruppenpersistenz (Cloudflare KV) nicht implementiert.

## Nächste Ausführung
1. Den ZIP-Quellkandidaten über zugelassenen Importweg in isolierten GitHub-Projektbereich übernehmen, nicht produktives Radio ersetzen.
2. Ausgelieferten Cloudflare Worker und API-Request-Schema gegen offizielle Govee-API verifizieren.
3. Sichere Device-Capability-Diagnose ohne öffentliches Auth-Bypass.
4. Vollständige Whitelisting-/Valueschema-Validierung und Quotenpacing; Gruppen-/Audio-Tests erweitern.
5. CI/CodeForge/Readback, erst anschließend separater Live-Deploy/Promotion-Gate.
