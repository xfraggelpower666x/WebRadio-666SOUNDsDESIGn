# 666STREAM CodeForge — Bridge-Readback und v0.3 Candidate

STATUS=PARTIAL | GITHUB_BRIDGE_IMPORT_VERIFIED=4_OF_4 | NEW_CANDIDATE_NOT_IMPORTED

## GitHub-Bridge-Readback
Repository xfraggelpower666x/WebRadio-666SOUNDsDESIGn; Branch WebRadio-666SOUNDsDESIGn
Target projects/666-GOVEE-CONTROL/imports/2026-10-17/
Die folgenden Binärdateien wurden über GitHub fetch_file(base64) bestätigt. Git-Blob-SHAs unabhängig aus lokal vorhandenen Originalbytes ermittelt und identisch verglichen:
- 666-GOVEE-WORKER-v0.2-CODEFORGE.zip (6867 bytes) git blob cae8e4f2c451da25548bab54ba416c05129f136b, SHA256 f44c534ec4e1217fe3b4810d6b052131bd0bd5ea866040644c0bd553b961b8ce
- 666-GOVEE-WORKER-v1.zip (4368 bytes) git blob 15a42454940348c25e10d5b9188161c4794aa0af, SHA256 2fdc51304d8b27e22cbde0523501b13ceb409e6f90b944c4080244ca3411cfcc
- GOVEE_HYBRID_CONTROL_v1.1.zip (9851 bytes) git blob ac820948bce8410683166daab230363b08f74051, SHA256 aea94ef7e3a2b42111890213d3896b470677dfc9b759c7639c5bd20c2cacefc4
- GOVEE_LOCAL_CONTROL_v1.zip (13650 bytes) git blob 717f4a16364d43f338f05c1f38953bc4e5a80189, SHA256 b12f4c7a6e1e07df8e1cba6bcf4f0c6c4077b0060382fb898add984c8f81cee0
XAPK/APK excluded. GitHub binary import CONFIRMED; no extra user bridge run needed for these four.

## CodeForge v0.3 lokal
Artefakt: 666-GOVEE-WORKER-v0.3-CODEFORGE-CANDIDATE.zip
SHA256: fe57cc31b731e0f8610756441a95334751b03aba206a0b4997e62fbbd1a755d0
Änderung: src/capability-validation.js sowie die Anwendung in den Einzel-/Gruppen-Endpunkten; strengere Werteprüfung, unbekannte Parameter fail-closed. Bestehende v0.2-Routen erhalten.
Syntax node --check PASS; node --test 6 PASS, 0 FAIL; ZIP CRC PASS.

WARNINGS:
- v0.3 ZIP ist bisher nur als Chat-Artefakt erstellt: NOT YET IMPORTED INTO GITHUB.
- Noch keine echte Govee Device-Capability-Antwort / kein Remote-Lichttest.
- Kein produktives Cloudflare-Deployment und keine Radio-Produktionsänderung.
- Provider-spezifisches Schemaparsing und API-Rate-Limits vor Freigabe prüfen.

NEXT: v0.3 artifact über verifizierte universelle CodeForge-Bridge transportieren und unabhängig mit SHA256 readback verifizieren; dann sichere Capability-Diagnose, Geräte-/Gruppen-E2E und Release Gate.
