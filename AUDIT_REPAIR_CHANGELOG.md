# WebRadio-666SOUNDsDESIGn — Hardlock Repair Changelog v1.2.0

**Release:** `FULLVERSION_HARDLOCK_REPAIR_v1.2.0`  
**Baseline:** `FULLVERSION_AUDIT_REPAIR_v1.1.0`  
**Baseline-Commit:** `e6aa911e71d6b28c616fed44683e93ea6d5a2a9a`  
**Klassifikation:** `EXECUTION ERROR REPAIR + SECURITY HARDLOCK`  
**Modus:** lokal, nicht destruktiv, kein Live-Deployment

## Reparaturen

### Authentifizierung und Autorisierung

- Alle geschützten Runtime-Konfigurationsrouten verwenden die strikte Admin-Gate-Prüfung.
- `iss=666-system-pw`, `scope=admin` und gültiges `exp` sind verpflichtend.
- Zustandsändernde Browserrouten benötigen Same-Origin-Nachweis.
- Legacy-Auth-Redirect, `x-admin-password`, paralleler Passwortcache und Health-as-Auth entfernt.
- Geschützte Browser-Fetches dürfen keinen Bearer-Token an Fremd-Origins senden.
- Sichere Fehlercodes werden bis zum Player durchgereicht.
- gehärtete Referenzimplementierungen für PW- und Auth-Worker ergänzt.

### Meter und Audio

- synthetische, zeitgetriebene Meterbewegung entfernt.
- Boost aus Level-, Peak-, Farb- und Geschwindigkeitsberechnung entfernt.
- doppelte automatische Recovery-Owner entfernt.
- `CentralAudioStabilityGuardV2` bleibt einzige automatische Recovery-Autorität.

### Player Alert

- clientkontrollierte `senderId` aus der Rate-Identität entfernt.
- interne Rate-Fingerprints aus öffentlichen/persistierten Payloads entfernt.
- Sanitizer für historische Backend-/KV-/Cache-Payloads ergänzt.
- Regressionstest gegen Sender-ID-Rotation ergänzt.

### Hard-Audit-Gates

- `HARD_AUDIT_POLICY.md` integriert.
- Hardlock-Prüfungen in `scripts/check-release.mjs` integriert.
- Auth-, Autorisierungs-, Privacy-, Rate-Limit- und Source-Hardlock-Tests ergänzt.
- Top-Level-Ordner, Spiegelparität, keine inneren ZIPs und keine Bytecode-Dateien hart geprüft.

## Bewusst nicht als PASS behauptet

- reale Cloudflare-Secret-Gleichheit
- reale PW/Auth-Worker-Kommunikation
- produktive Render-/PostgreSQL-Bereitschaft
- physische PC-/iPhone-/Android-Abnahme
- öffentlicher Stream-Failover unter realen Netzbedingungen

Diese Punkte bleiben bis zum Live-Test gesperrt.
